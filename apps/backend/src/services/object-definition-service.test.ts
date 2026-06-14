import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, fromMock, whereMock, limitMock, orderByMock, insertMock, valuesMock, insertReturningMock, updateMock, setMock, updateWhereMock, updateReturningMock } =
  vi.hoisted(() => {
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
    };
  });

vi.mock("../db/client.js", () => ({
  db: { select: selectMock, insert: insertMock, update: updateMock },
}));

const {
  listObjectDefinitions,
  createObjectDefinition,
  getObjectDefinition,
  updateObjectDefinition,
  resolveObjectByApiName,
} = await import("./object-definition-service.js");

const { updateObjectSchema } = await import("../validation/objects.js");

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

const OBJECT_DTO = {
  id: "obj-1",
  apiName: "doctor",
  name: "Doctor",
  pluralName: "Doctors",
  description: null,
  icon: null,
  color: null,
  schemaVersion: 1,
  isArchived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listObjectDefinitions", () => {
  it("returns non-archived object definitions for the organization", async () => {
    orderByMock.mockResolvedValueOnce([OBJECT_ROW]);

    const result = await listObjectDefinitions("org-1");

    expect(result).toEqual([OBJECT_DTO]);
    expect(selectMock).toHaveBeenCalled();
  });
});

describe("createObjectDefinition", () => {
  it("derives apiName from the name via slugify when not provided", async () => {
    limitMock.mockResolvedValueOnce([]);
    insertReturningMock.mockResolvedValueOnce([OBJECT_ROW]);

    const result = await createObjectDefinition("org-1", {
      name: "Doctor",
      pluralName: "Doctors",
    });

    expect(result).toEqual({ ok: true, object: OBJECT_DTO });
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ apiName: "doctor" }));
  });

  it("returns OBJECT_API_NAME_TAKEN when the apiName already exists in the organization", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);

    const result = await createObjectDefinition("org-1", {
      name: "Doctor",
      pluralName: "Doctors",
      apiName: "doctor",
    });

    expect(result).toEqual({
      ok: false,
      code: "OBJECT_API_NAME_TAKEN",
      message: 'An object with apiName "doctor" already exists',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("getObjectDefinition", () => {
  it("returns OBJECT_NOT_FOUND when no row matches the organization", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await getObjectDefinition("org-1", "obj-1");

    expect(result).toEqual({ ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" });
  });

  it("returns the object definition when found", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);

    const result = await getObjectDefinition("org-1", "obj-1");

    expect(result).toEqual({ ok: true, object: OBJECT_DTO });
  });
});

describe("updateObjectDefinition", () => {
  it("returns OBJECT_NOT_FOUND when the target does not exist in the organization", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await updateObjectDefinition("org-1", "obj-1", { name: "New Name" });

    expect(result).toEqual({ ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the object definition", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);
    updateReturningMock.mockResolvedValueOnce([{ ...OBJECT_ROW, name: "Physician" }]);

    const result = await updateObjectDefinition("org-1", "obj-1", { name: "Physician" });

    expect(result).toEqual({ ok: true, object: { ...OBJECT_DTO, name: "Physician" } });
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Physician" }));
  });

  it("rejects apiName as part of the update payload at the validation layer", () => {
    const parsed = updateObjectSchema.safeParse({ name: "Physician", apiName: "physician" });

    expect(parsed.success).toBe(false);
  });
});

describe("resolveObjectByApiName", () => {
  it("returns OBJECT_NOT_FOUND when archived", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await resolveObjectByApiName("org-1", "doctor");

    expect(result).toEqual({ ok: false, code: "OBJECT_NOT_FOUND", message: "Object not found" });
  });

  it("returns the object definition for a non-archived apiName", async () => {
    limitMock.mockResolvedValueOnce([OBJECT_ROW]);

    const result = await resolveObjectByApiName("org-1", "doctor");

    expect(result).toEqual({ ok: true, object: OBJECT_DTO });
  });
});
