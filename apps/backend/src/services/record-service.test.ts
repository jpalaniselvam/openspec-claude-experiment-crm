import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ObjectDefinitionDto } from "./object-definition-service.js";
import type { FieldDefinitionDto } from "./field-definition-service.js";

const { selectMock, fromMock, whereMock, limitMock, insertMock, valuesMock, insertReturningMock, updateMock, setMock, updateWhereMock, updateReturningMock, deleteMock, deleteWhereMock } =
  vi.hoisted(() => {
    const limitMock = vi.fn();
    const whereMock = vi.fn(() => ({ limit: limitMock }));
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

const { listFieldDefinitionsForObject } = vi.hoisted(() => ({
  listFieldDefinitionsForObject: vi.fn(),
}));

vi.mock("./field-definition-service.js", () => ({
  listFieldDefinitionsForObject,
}));

const { listObjectDefinitions, resolveEffectiveDisplayField } = vi.hoisted(() => ({
  listObjectDefinitions: vi.fn(),
  resolveEffectiveDisplayField: vi.fn(),
}));

vi.mock("./object-definition-service.js", () => ({
  listObjectDefinitions,
  resolveEffectiveDisplayField,
}));

const { createRecord, getRecord, updateRecord, deleteRecord, listRecords, listRelatedRecords } = await import(
  "./record-service.js"
);

const OBJECT: ObjectDefinitionDto = {
  id: "obj-1",
  apiName: "doctor",
  name: "Doctor",
  pluralName: "Doctors",
  description: null,
  icon: null,
  color: null,
  schemaVersion: 1,
  isArchived: false,
  displayFieldApiKey: null,
};

const SOURCE_OBJECT: ObjectDefinitionDto = {
  id: "obj-2",
  apiName: "appointment",
  name: "Appointment",
  pluralName: "Appointments",
  description: null,
  icon: null,
  color: null,
  schemaVersion: 1,
  isArchived: false,
  displayFieldApiKey: null,
};

const LOOKUP_FIELD: FieldDefinitionDto = {
  id: "field-2",
  apiKey: "doctor",
  name: "Doctor",
  dataType: "lookup",
  isRequired: false,
  isUnique: false,
  isSearchable: false,
  isReadOnly: false,
  defaultValue: null,
  options: null,
  lookupObjectDefinitionId: "obj-1",
  sortOrder: 0,
};

const TITLE_FIELD: FieldDefinitionDto = {
  id: "field-3",
  apiKey: "title",
  name: "Title",
  dataType: "text",
  isRequired: false,
  isUnique: false,
  isSearchable: false,
  isReadOnly: false,
  defaultValue: null,
  options: null,
  lookupObjectDefinitionId: null,
  sortOrder: 0,
};

const RELATED_RECORD_ROW = {
  id: "rec-2",
  organizationId: "org-1",
  objectDefinitionId: "obj-2",
  data: { title: "Checkup", doctor: "rec-1" },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const REQUIRED_NUMBER_FIELD: FieldDefinitionDto = {
  id: "field-1",
  apiKey: "years_experience",
  name: "Years Experience",
  dataType: "number",
  isRequired: true,
  isUnique: false,
  isSearchable: false,
  isReadOnly: false,
  defaultValue: null,
  options: null,
  lookupObjectDefinitionId: null,
  sortOrder: 0,
};

const RECORD_ROW = {
  id: "rec-1",
  organizationId: "org-1",
  objectDefinitionId: "obj-1",
  data: { years_experience: 5 },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const RECORD_DTO = {
  id: "rec-1",
  objectDefinitionId: "obj-1",
  data: { years_experience: 5 },
  createdAt: RECORD_ROW.createdAt,
  updatedAt: RECORD_ROW.updatedAt,
};

beforeEach(() => {
  vi.clearAllMocks();
  listFieldDefinitionsForObject.mockResolvedValue([REQUIRED_NUMBER_FIELD]);
});

describe("listRecords", () => {
  it("returns records scoped to the organization and object", async () => {
    whereMock.mockResolvedValueOnce([RECORD_ROW]);

    const result = await listRecords("org-1", OBJECT);

    expect(result).toEqual([RECORD_DTO]);
  });
});

describe("createRecord", () => {
  it("returns VALIDATION_ERROR when a required field is missing", async () => {
    const result = await createRecord("org-1", OBJECT, {});

    expect(result).toEqual({ ok: false, code: "VALIDATION_ERROR", message: expect.any(String) });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when a field has the wrong type", async () => {
    const result = await createRecord("org-1", OBJECT, { years_experience: "five" });

    expect(result.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates the record when data is valid", async () => {
    insertReturningMock.mockResolvedValueOnce([RECORD_ROW]);

    const result = await createRecord("org-1", OBJECT, { years_experience: 5 });

    expect(result).toEqual({ ok: true, record: RECORD_DTO });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", objectDefinitionId: "obj-1", data: { years_experience: 5 } }),
    );
  });
});

describe("getRecord", () => {
  it("returns RECORD_NOT_FOUND when no row matches", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await getRecord("org-1", OBJECT, "rec-1");

    expect(result).toEqual({ ok: false, code: "RECORD_NOT_FOUND", message: "Record not found" });
  });

  it("returns the record when found", async () => {
    limitMock.mockResolvedValueOnce([RECORD_ROW]);

    const result = await getRecord("org-1", OBJECT, "rec-1");

    expect(result).toEqual({ ok: true, record: RECORD_DTO });
  });
});

describe("updateRecord", () => {
  it("returns RECORD_NOT_FOUND when the record does not exist", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await updateRecord("org-1", OBJECT, "rec-1", { years_experience: 10 });

    expect(result).toEqual({ ok: false, code: "RECORD_NOT_FOUND", message: "Record not found" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR and does not update when the new data is invalid", async () => {
    limitMock.mockResolvedValueOnce([RECORD_ROW]);

    const result = await updateRecord("org-1", OBJECT, "rec-1", { years_experience: "ten" });

    expect(result.ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fully replaces the record's data, discarding fields not present in the new payload", async () => {
    limitMock.mockResolvedValueOnce([RECORD_ROW]);
    updateReturningMock.mockResolvedValueOnce([{ ...RECORD_ROW, data: { years_experience: 10 } }]);

    const result = await updateRecord("org-1", OBJECT, "rec-1", { years_experience: 10 });

    expect(result).toEqual({ ok: true, record: { ...RECORD_DTO, data: { years_experience: 10 } } });
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ data: { years_experience: 10 } }));
  });
});

describe("deleteRecord", () => {
  it("returns RECORD_NOT_FOUND when the record does not exist", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await deleteRecord("org-1", OBJECT, "rec-1");

    expect(result).toEqual({ ok: false, code: "RECORD_NOT_FOUND", message: "Record not found" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the record when it exists", async () => {
    limitMock.mockResolvedValueOnce([RECORD_ROW]);

    const result = await deleteRecord("org-1", OBJECT, "rec-1");

    expect(result).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalled();
  });
});

describe("listRelatedRecords", () => {
  it("groups matching records by source object and lookup field, resolving displayValue from the effective display field", async () => {
    listObjectDefinitions.mockResolvedValueOnce([SOURCE_OBJECT]);
    listFieldDefinitionsForObject.mockResolvedValueOnce([LOOKUP_FIELD, TITLE_FIELD]);
    whereMock.mockResolvedValueOnce([RELATED_RECORD_ROW]);
    resolveEffectiveDisplayField.mockReturnValueOnce("title");

    const result = await listRelatedRecords("org-1", OBJECT, "rec-1");

    expect(result).toEqual([
      {
        objectApiName: "appointment",
        objectName: "Appointment",
        pluralName: "Appointments",
        fieldApiKey: "doctor",
        fieldName: "Doctor",
        records: [{ id: "rec-2", displayValue: "Checkup" }],
      },
    ]);
  });

  it("falls back to the record id when the source object has no effective display field", async () => {
    listObjectDefinitions.mockResolvedValueOnce([SOURCE_OBJECT]);
    listFieldDefinitionsForObject.mockResolvedValueOnce([LOOKUP_FIELD]);
    whereMock.mockResolvedValueOnce([RELATED_RECORD_ROW]);
    resolveEffectiveDisplayField.mockReturnValueOnce(null);

    const result = await listRelatedRecords("org-1", OBJECT, "rec-1");

    expect(result[0]?.records).toEqual([{ id: "rec-2", displayValue: "rec-2" }]);
  });

  it("returns an empty array when no field definitions reference the object", async () => {
    listObjectDefinitions.mockResolvedValueOnce([SOURCE_OBJECT]);
    listFieldDefinitionsForObject.mockResolvedValueOnce([TITLE_FIELD]);

    const result = await listRelatedRecords("org-1", OBJECT, "rec-1");

    expect(result).toEqual([]);
  });

  it("excludes (source object, lookup field) pairs with no matching records", async () => {
    listObjectDefinitions.mockResolvedValueOnce([SOURCE_OBJECT]);
    listFieldDefinitionsForObject.mockResolvedValueOnce([LOOKUP_FIELD]);
    whereMock.mockResolvedValueOnce([]);

    const result = await listRelatedRecords("org-1", OBJECT, "rec-1");

    expect(result).toEqual([]);
  });
});
