import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  fromMock,
  whereMock,
  limitMock,
  orderByMock,
  insertMock,
  valuesMock,
  insertReturningMock,
  updateMock,
  setMock,
  updateWhereMock,
  updateReturningMock,
  deleteMock,
  deleteWhereMock,
} = vi.hoisted(() => {
  const limitMock = vi.fn();
  const orderByMock = vi.fn();
  const whereMock = vi.fn(() => ({ limit: limitMock, orderBy: orderByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  const insertReturningMock = vi.fn();
  const valuesMock = vi.fn(() => ({ returning: insertReturningMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));

  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
  const setMock = vi.fn(() => ({ where: updateWhereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));

  const deleteWhereMock = vi.fn();
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  return {
    selectMock,
    fromMock,
    whereMock,
    limitMock,
    orderByMock,
    insertMock,
    valuesMock,
    insertReturningMock,
    updateMock,
    setMock,
    updateWhereMock,
    updateReturningMock,
    deleteMock,
    deleteWhereMock,
  };
});

vi.mock("../db/client.js", () => ({
  db: { select: selectMock, insert: insertMock, update: updateMock, delete: deleteMock },
}));

const {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
} = await import("./field-definition-service.js");

const { createFieldSchema, updateFieldSchema } = await import("../validation/fields.js");

const OBJECT_ROW = {
  id: "obj-1",
  organizationId: "org-1",
  apiName: "doctor",
  name: "Doctor",
  pluralName: "Doctors",
  description: null,
  icon: null,
  color: null,
  schemaVersion: 1,
  isArchived: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const ARCHIVED_OBJECT_ROW = { ...OBJECT_ROW, id: "obj-2", apiName: "archived", isArchived: true };

const FIELD_ROW = {
  id: "field-1",
  objectDefinitionId: "obj-1",
  apiKey: "years_experience",
  name: "Years Experience",
  dataType: "number",
  isRequired: false,
  isUnique: false,
  isSearchable: false,
  isReadOnly: false,
  defaultValue: null,
  options: null,
  lookupObjectDefinitionId: null,
  sortOrder: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const FIELD_DTO = {
  id: "field-1",
  apiKey: "years_experience",
  name: "Years Experience",
  dataType: "number",
  isRequired: false,
  isUnique: false,
  isSearchable: false,
  isReadOnly: false,
  defaultValue: null,
  options: null,
  lookupObjectDefinitionId: null,
  sortOrder: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFieldDefinitions", () => {
  it("returns OBJECT_NOT_FOUND when the object does not exist in the organization", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await listFieldDefinitions("org-1", "obj-1");

    expect(result).toEqual({ ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" });
  });

  it("returns field definitions ordered by sortOrder", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    orderByMock.mockResolvedValueOnce([FIELD_ROW]);

    const result = await listFieldDefinitions("org-1", "obj-1");

    expect(result).toEqual({ ok: true, fields: [FIELD_DTO] });
  });
});

describe("createFieldDefinition", () => {
  it("derives apiKey from the name via slugify when not provided", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]); // findObjectDefinition
    limitMock.mockResolvedValueOnce([]); // apiKey conflict check
    insertReturningMock.mockResolvedValueOnce([FIELD_ROW]);

    const result = await createFieldDefinition("org-1", "obj-1", {
      name: "Years Experience",
      dataType: "number",
    });

    expect(result).toEqual({ ok: true, field: FIELD_DTO });
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "years_experience" }));
  });

  it("increments the object's schemaVersion after creating a field", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    limitMock.mockResolvedValueOnce([]);
    insertReturningMock.mockResolvedValueOnce([FIELD_ROW]);

    await createFieldDefinition("org-1", "obj-1", { name: "Years Experience", dataType: "number" });

    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: expect.anything() }));
  });

  it("returns FIELD_API_KEY_TAKEN when the apiKey already exists on the object", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    limitMock.mockResolvedValueOnce([FIELD_ROW]);

    const result = await createFieldDefinition("org-1", "obj-1", {
      name: "Years Experience",
      apiKey: "years_experience",
      dataType: "number",
    });

    expect(result).toEqual({
      ok: false,
      code: "FIELD_API_KEY_TAKEN",
      message: 'A field with apiKey "years_experience" already exists on this object',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when the lookup target does not exist", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]); // findObjectDefinition for objectId
    limitMock.mockResolvedValueOnce([]); // apiKey conflict check
    limitMock.mockResolvedValueOnce([]); // lookup target lookup

    const result = await createFieldDefinition("org-1", "obj-1", {
      name: "Assigned Doctor",
      dataType: "lookup",
      lookupObjectDefinitionId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "lookupObjectDefinitionId must reference an existing, non-archived object definition in your organization",
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when the lookup target is archived", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    limitMock.mockResolvedValueOnce([]);
    limitMock.mockResolvedValueOnce([ARCHIVED_OBJECT_ROW]);

    const result = await createFieldDefinition("org-1", "obj-1", {
      name: "Assigned Doctor",
      dataType: "lookup",
      lookupObjectDefinitionId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION_ERROR");
  });

  it("rejects a picklist field without options at the validation layer", () => {
    const parsed = createFieldSchema.safeParse({ name: "Status", dataType: "picklist" });

    expect(parsed.success).toBe(false);
  });

  it("rejects a lookup field without lookupObjectDefinitionId at the validation layer", () => {
    const parsed = createFieldSchema.safeParse({ name: "Assigned Doctor", dataType: "lookup" });

    expect(parsed.success).toBe(false);
  });
});

describe("updateFieldDefinition", () => {
  it("increments the object's schemaVersion after updating a field", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]); // findObjectDefinition
    limitMock.mockResolvedValueOnce([FIELD_ROW]); // target lookup
    updateReturningMock.mockResolvedValueOnce([{ ...FIELD_ROW, name: "Experience (Years)" }]);

    const result = await updateFieldDefinition("org-1", "obj-1", "field-1", { name: "Experience (Years)" });

    expect(result).toEqual({ ok: true, field: { ...FIELD_DTO, name: "Experience (Years)" } });
    expect(updateMock).toHaveBeenCalledTimes(2); // field update + schemaVersion increment
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: expect.anything() }));
  });

  it("returns FIELD_NOT_FOUND when the field does not exist on the object", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    limitMock.mockResolvedValueOnce([]);

    const result = await updateFieldDefinition("org-1", "obj-1", "field-1", { name: "New Name" });

    expect(result).toEqual({ ok: false, code: "FIELD_NOT_FOUND", message: "Field definition not found" });
  });

  it("rejects apiKey, dataType, and lookupObjectDefinitionId at the validation layer", () => {
    expect(updateFieldSchema.safeParse({ apiKey: "renamed" }).success).toBe(false);
    expect(updateFieldSchema.safeParse({ dataType: "text" }).success).toBe(false);
    expect(updateFieldSchema.safeParse({ lookupObjectDefinitionId: "11111111-1111-1111-1111-111111111111" }).success).toBe(false);
  });
});

describe("deleteFieldDefinition", () => {
  it("returns FIELD_IN_USE when records reference the field's apiKey", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]); // findObjectDefinition
    limitMock.mockResolvedValueOnce([FIELD_ROW]); // target lookup
    limitMock.mockResolvedValueOnce([{ id: "rec-1" }]); // inUse check

    const result = await deleteFieldDefinition("org-1", "obj-1", "field-1");

    expect(result).toEqual({
      ok: false,
      code: "FIELD_IN_USE",
      message: 'Field "years_experience" is in use by existing records and cannot be deleted',
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the field and increments schemaVersion when not in use", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]); // findObjectDefinition
    limitMock.mockResolvedValueOnce([FIELD_ROW]); // target lookup
    limitMock.mockResolvedValueOnce([]); // inUse check

    const result = await deleteFieldDefinition("org-1", "obj-1", "field-1");

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ schemaVersion: expect.anything() }));
  });

  it("returns FIELD_NOT_FOUND when the field does not exist on the object", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    limitMock.mockResolvedValueOnce([]);

    const result = await deleteFieldDefinition("org-1", "obj-1", "field-1");

    expect(result).toEqual({ ok: false, code: "FIELD_NOT_FOUND", message: "Field definition not found" });
  });
});
