import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("../services/field-definition-service.js", () => ({
  listFieldDefinitions: vi.fn(),
  createFieldDefinition: vi.fn(),
  updateFieldDefinition: vi.fn(),
  deleteFieldDefinition: vi.fn(),
}));

const { listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition } = await import(
  "../services/field-definition-service.js"
);
const { createApp } = await import("../app.js");

const app = createApp();

const ADMIN_SESSION = { user: { id: "admin-1", organizationId: "org-1", role: "admin" } };
const MEMBER_SESSION = { user: { id: "user-1", organizationId: "org-1", role: "member" } };

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

describe("GET /api/objects/:objectId/fields", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/objects/obj-1/fields");

    expect(res.status).toBe(401);
    expect(listFieldDefinitions).not.toHaveBeenCalled();
  });

  it("returns 200 when the session user is a member", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(listFieldDefinitions).mockResolvedValueOnce({ ok: true, fields: [FIELD_DTO] });

    const res = await request(app).get("/api/objects/obj-1/fields");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [FIELD_DTO] });
    expect(listFieldDefinitions).toHaveBeenCalledWith("org-1", "obj-1");
  });

  it("returns 404 OBJECT_NOT_FOUND when the object does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listFieldDefinitions).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object definition not found",
    });

    const res = await request(app).get("/api/objects/unknown/fields");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
  });

  it("returns 200 with the fields ordered by sortOrder for an admin", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listFieldDefinitions).mockResolvedValueOnce({ ok: true, fields: [FIELD_DTO] });

    const res = await request(app).get("/api/objects/obj-1/fields");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [FIELD_DTO] });
    expect(listFieldDefinitions).toHaveBeenCalledWith("org-1", "obj-1");
  });
});

describe("POST /api/objects/:objectId/fields", () => {
  const validBody = { name: "Years Experience", dataType: "number" };

  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/objects/obj-1/fields").send(validBody);

    expect(res.status).toBe(401);
    expect(createFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).post("/api/objects/obj-1/fields").send(validBody);

    expect(res.status).toBe(403);
    expect(createFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when the body is invalid (missing name)", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app).post("/api/objects/obj-1/fields").send({ dataType: "number" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(createFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when picklist field has no options", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app)
      .post("/api/objects/obj-1/fields")
      .send({ name: "Status", dataType: "picklist" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(createFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when lookup field has no lookupObjectDefinitionId", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app)
      .post("/api/objects/obj-1/fields")
      .send({ name: "Hospital", dataType: "lookup" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(createFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 201 with the created field for valid input", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createFieldDefinition).mockResolvedValueOnce({ ok: true, field: FIELD_DTO });

    const res = await request(app).post("/api/objects/obj-1/fields").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: FIELD_DTO });
    expect(createFieldDefinition).toHaveBeenCalledWith("org-1", "obj-1", validBody);
  });

  it("returns 404 OBJECT_NOT_FOUND when the object does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createFieldDefinition).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object definition not found",
    });

    const res = await request(app).post("/api/objects/obj-1/fields").send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
  });

  it("returns 409 FIELD_API_KEY_TAKEN when the apiKey already exists on the object", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createFieldDefinition).mockResolvedValueOnce({
      ok: false,
      code: "FIELD_API_KEY_TAKEN",
      message: 'A field with apiKey "years_experience" already exists on this object',
    });

    const res = await request(app).post("/api/objects/obj-1/fields").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FIELD_API_KEY_TAKEN");
  });
});

describe("PATCH /api/objects/:objectId/fields/:fieldId", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).patch("/api/objects/obj-1/fields/field-1").send({ isRequired: true });

    expect(res.status).toBe(401);
    expect(updateFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).patch("/api/objects/obj-1/fields/field-1").send({ isRequired: true });

    expect(res.status).toBe(403);
    expect(updateFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when immutable fields (apiKey, dataType, lookupObjectDefinitionId) are provided", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app)
      .patch("/api/objects/obj-1/fields/field-1")
      .send({ apiKey: "renamed" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 404 FIELD_NOT_FOUND when the field does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateFieldDefinition).mockResolvedValueOnce({
      ok: false,
      code: "FIELD_NOT_FOUND",
      message: "Field definition not found",
    });

    const res = await request(app).patch("/api/objects/obj-1/fields/unknown").send({ isRequired: true });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FIELD_NOT_FOUND");
  });

  it("returns 200 with the updated field and increments schemaVersion", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    const updatedField = { ...FIELD_DTO, isRequired: true };
    vi.mocked(updateFieldDefinition).mockResolvedValueOnce({ ok: true, field: updatedField });

    const res = await request(app).patch("/api/objects/obj-1/fields/field-1").send({ isRequired: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: updatedField });
    expect(updateFieldDefinition).toHaveBeenCalledWith("org-1", "obj-1", "field-1", { isRequired: true });
  });
});

describe("DELETE /api/objects/:objectId/fields/:fieldId", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).delete("/api/objects/obj-1/fields/field-1");

    expect(res.status).toBe(401);
    expect(deleteFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).delete("/api/objects/obj-1/fields/field-1");

    expect(res.status).toBe(403);
    expect(deleteFieldDefinition).not.toHaveBeenCalled();
  });

  it("returns 409 FIELD_IN_USE when records reference the field's apiKey", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(deleteFieldDefinition).mockResolvedValueOnce({
      ok: false,
      code: "FIELD_IN_USE",
      message: 'Field "years_experience" is in use by existing records and cannot be deleted',
    });

    const res = await request(app).delete("/api/objects/obj-1/fields/field-1");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FIELD_IN_USE");
  });

  it("returns 404 FIELD_NOT_FOUND when the field does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(deleteFieldDefinition).mockResolvedValueOnce({
      ok: false,
      code: "FIELD_NOT_FOUND",
      message: "Field definition not found",
    });

    const res = await request(app).delete("/api/objects/obj-1/fields/unknown");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FIELD_NOT_FOUND");
  });

  it("returns 200 and removes the field when it is not in use", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(deleteFieldDefinition).mockResolvedValueOnce({ ok: true });

    const res = await request(app).delete("/api/objects/obj-1/fields/field-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: {} });
    expect(deleteFieldDefinition).toHaveBeenCalledWith("org-1", "obj-1", "field-1");
  });
});
