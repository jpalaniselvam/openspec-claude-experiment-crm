import { beforeEach, describe, expect, it, vi } from "vitest";
import { fieldDefinitions, objectDefinitions } from "../db/schema/index.js";

const { whereMock, fromMock, selectMock, objectReturningMock, objectValuesMock, fieldValuesMock, insertMock, transactionMock } =
  vi.hoisted(() => {
    const whereMock = vi.fn();
    const fromMock = vi.fn(() => ({ where: whereMock }));
    const selectMock = vi.fn(() => ({ from: fromMock }));

    const objectReturningMock = vi.fn();
    const objectValuesMock = vi.fn(() => ({ returning: objectReturningMock }));

    const fieldValuesMock = vi.fn(() => Promise.resolve(undefined));

    const insertMock = vi.fn((table: unknown) => {
      if (table === objectDefinitions) return { values: objectValuesMock };
      if (table === fieldDefinitions) return { values: fieldValuesMock };
      throw new Error("unexpected table passed to insert");
    });

    const transactionMock = vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ select: selectMock, insert: insertMock }),
    );

    return {
      whereMock,
      fromMock,
      selectMock,
      objectReturningMock,
      objectValuesMock,
      fieldValuesMock,
      insertMock,
      transactionMock,
    };
  });

vi.mock("../db/client.js", () => ({
  db: { transaction: transactionMock },
}));

const { applyTemplate, listTemplates } = await import("./template-service.js");
const { templates } = await import("../templates/index.js");
const { resolveEffectiveDisplayField } = await import("./object-definition-service.js");

const SALES_CRM_OBJECTS = templates["sales-crm"].objects;

beforeEach(() => {
  vi.clearAllMocks();
});

function fieldInsertValues() {
  return fieldValuesMock.mock.calls.map((call) => call[0] as Record<string, unknown>);
}

describe("listTemplates", () => {
  it("returns a summary for each catalog template", () => {
    const result = listTemplates();

    expect(result.map((t) => t.key).sort()).toEqual(
      ["automobile", "real-estate-crm", "recruitment-crm", "sales-crm"].sort(),
    );
  });
});

describe("applyTemplate", () => {
  it("returns TEMPLATE_NOT_FOUND for an unknown key", async () => {
    const result = await applyTemplate("org-1", "does-not-exist");

    expect(result).toEqual({ ok: false, code: "TEMPLATE_NOT_FOUND", message: expect.any(String) });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("applies sales-crm to a fresh org, creating all five objects with expected field counts", async () => {
    whereMock.mockResolvedValueOnce([]);
    for (const object of SALES_CRM_OBJECTS) {
      objectReturningMock.mockResolvedValueOnce([{ id: `${object.apiName}-id` }]);
    }

    const result = await applyTemplate("org-1", "sales-crm");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.skipped).toEqual([]);
    expect(result.result.created).toHaveLength(SALES_CRM_OBJECTS.length);

    for (const object of SALES_CRM_OBJECTS) {
      const created = result.result.created.find((c) => c.apiName === object.apiName);

      expect(created).toBeDefined();
      expect(created!.id).toBe(`${object.apiName}-id`);
      expect(created!.fieldsCreated).toHaveLength(object.fields.length);
      expect(created!.fieldsSkipped).toEqual([]);
    }
  });

  it("wires lookup fields to sibling objects created in the same apply", async () => {
    whereMock.mockResolvedValueOnce([]);
    for (const object of SALES_CRM_OBJECTS) {
      objectReturningMock.mockResolvedValueOnce([{ id: `${object.apiName}-id` }]);
    }

    await applyTemplate("org-1", "sales-crm");

    const inserted = fieldInsertValues();

    const contactCompany = inserted.find((f) => f.objectDefinitionId === "contact-id" && f.apiKey === "company");
    expect(contactCompany?.lookupObjectDefinitionId).toBe("company-id");

    const dealCompany = inserted.find((f) => f.objectDefinitionId === "deal-id" && f.apiKey === "company");
    expect(dealCompany?.lookupObjectDefinitionId).toBe("company-id");

    const dealPrimaryContact = inserted.find(
      (f) => f.objectDefinitionId === "deal-id" && f.apiKey === "primary_contact",
    );
    expect(dealPrimaryContact?.lookupObjectDefinitionId).toBe("contact-id");
  });

  it("is idempotent when sales-crm is already fully applied", async () => {
    whereMock.mockResolvedValueOnce(
      SALES_CRM_OBJECTS.map((object) => ({ id: `${object.apiName}-id`, apiName: object.apiName, isArchived: false })),
    );

    const result = await applyTemplate("org-1", "sales-crm");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.created).toEqual([]);
    expect(result.result.skipped).toHaveLength(SALES_CRM_OBJECTS.length);
    for (const skip of result.result.skipped) {
      expect(skip.reason).toBe("OBJECT_ALREADY_EXISTS");
    }
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("skips a colliding company object while creating the remaining sales-crm objects", async () => {
    whereMock.mockResolvedValueOnce([{ id: "existing-company-id", apiName: "company", isArchived: false }]);

    const remaining = SALES_CRM_OBJECTS.filter((object) => object.apiName !== "company");
    for (const object of remaining) {
      objectReturningMock.mockResolvedValueOnce([{ id: `${object.apiName}-id` }]);
    }

    const result = await applyTemplate("org-1", "sales-crm");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.skipped).toEqual([{ apiName: "company", reason: "OBJECT_ALREADY_EXISTS" }]);
    expect(result.result.created).toHaveLength(remaining.length);

    const inserted = fieldInsertValues();
    const contactCompany = inserted.find((f) => f.objectDefinitionId === "contact-id" && f.apiKey === "company");
    expect(contactCompany?.lookupObjectDefinitionId).toBe("existing-company-id");
  });

  it("skips lookup fields targeting an archived, colliding object", async () => {
    whereMock.mockResolvedValueOnce([{ id: "existing-company-id", apiName: "company", isArchived: true }]);

    const remaining = SALES_CRM_OBJECTS.filter((object) => object.apiName !== "company");
    for (const object of remaining) {
      objectReturningMock.mockResolvedValueOnce([{ id: `${object.apiName}-id` }]);
    }

    const result = await applyTemplate("org-1", "sales-crm");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.result.skipped).toEqual([{ apiName: "company", reason: "OBJECT_ALREADY_EXISTS" }]);

    const contact = result.result.created.find((c) => c.apiName === "contact")!;
    expect(contact.fieldsSkipped).toEqual([{ apiKey: "company", reason: "LOOKUP_TARGET_ARCHIVED" }]);
    expect(contact.fieldsCreated).not.toContain("company");

    const deal = result.result.created.find((c) => c.apiName === "deal")!;
    expect(deal.fieldsSkipped).toEqual([{ apiKey: "company", reason: "LOOKUP_TARGET_ARCHIVED" }]);
    expect(deal.fieldsCreated).toContain("primary_contact");

    const inserted = fieldInsertValues();
    const contactCompany = inserted.find((f) => f.objectDefinitionId === "contact-id" && f.apiKey === "company");
    expect(contactCompany).toBeUndefined();
  });

  it("creates objects with schemaVersion = 1 + fieldCount and displayFieldApiKey = null, resolving the sortOrder 0 field as the display field", async () => {
    whereMock.mockResolvedValueOnce([]);
    for (const object of SALES_CRM_OBJECTS) {
      objectReturningMock.mockResolvedValueOnce([{ id: `${object.apiName}-id` }]);
    }

    await applyTemplate("org-1", "sales-crm");

    for (const object of SALES_CRM_OBJECTS) {
      const insertedValues = objectValuesMock.mock.calls.find(
        (call) => (call[0] as Record<string, unknown>).apiName === object.apiName,
      )?.[0] as Record<string, unknown>;

      expect(insertedValues.schemaVersion).toBe(1 + object.fields.length);
      expect(insertedValues.displayFieldApiKey).toBeNull();

      const sortOrderZeroField = object.fields.find((field) => field.sortOrder === 0)!;
      const objectDto = {
        id: `${object.apiName}-id`,
        apiName: object.apiName,
        name: object.name,
        pluralName: object.pluralName,
        description: null,
        icon: null,
        color: null,
        schemaVersion: insertedValues.schemaVersion as number,
        isArchived: false,
        displayFieldApiKey: insertedValues.displayFieldApiKey as string | null,
      };
      const fieldDtos = object.fields.map((field) => ({
        id: `${field.apiKey}-id`,
        apiKey: field.apiKey,
        name: field.name,
        dataType: field.dataType,
        isRequired: field.isRequired ?? false,
        isUnique: field.isUnique ?? false,
        isSearchable: field.isSearchable ?? false,
        isReadOnly: field.isReadOnly ?? false,
        defaultValue: field.defaultValue ?? null,
        options: field.options ?? null,
        lookupObjectDefinitionId: null,
        sortOrder: field.sortOrder,
      }));

      expect(resolveEffectiveDisplayField(objectDto, fieldDtos)).toBe(sortOrderZeroField.apiKey);
    }
  });
});
