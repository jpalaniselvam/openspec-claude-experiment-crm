import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("../services/object-definition-service.js", () => ({
  resolveObjectByApiName: vi.fn(),
}));

vi.mock("../services/record-service.js", () => ({
  listRecords: vi.fn(),
  createRecord: vi.fn(),
  getRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

const { resolveObjectByApiName } = await import("../services/object-definition-service.js");
const { listRecords, createRecord, getRecord, updateRecord, deleteRecord } = await import(
  "../services/record-service.js"
);
const { createApp } = await import("../app.js");

const app = createApp();

const ADMIN_SESSION = { user: { id: "admin-1", organizationId: "org-1", role: "admin" } };
const MEMBER_SESSION = { user: { id: "user-1", organizationId: "org-1", role: "member" } };

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

const RECORD_DTO = {
  id: "rec-1",
  objectDefinitionId: "obj-1",
  data: { years_experience: 5 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/records/:objectApiName", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/records/doctor");

    expect(res.status).toBe(401);
    expect(resolveObjectByApiName).not.toHaveBeenCalled();
  });

  it("returns 404 OBJECT_NOT_FOUND for an unknown or archived object apiName", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object not found",
    });

    const res = await request(app).get("/api/records/unknown_object");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
    expect(listRecords).not.toHaveBeenCalled();
  });

  it("returns 200 with items array for an authenticated user (any role)", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(listRecords).mockResolvedValueOnce([RECORD_DTO]);

    const res = await request(app).get("/api/records/doctor");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { items: [RECORD_DTO] } });
    expect(resolveObjectByApiName).toHaveBeenCalledWith("org-1", "doctor");
  });

  it("returns records scoped to the caller's organization only", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(listRecords).mockResolvedValueOnce([RECORD_DTO]);

    const res = await request(app).get("/api/records/doctor");

    expect(res.status).toBe(200);
    expect(listRecords).toHaveBeenCalledWith("org-1", OBJECT_DTO);
  });
});

describe("POST /api/records/:objectApiName", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/records/doctor")
      .send({ years_experience: 5 });

    expect(res.status).toBe(401);
    expect(resolveObjectByApiName).not.toHaveBeenCalled();
  });

  it("returns 404 OBJECT_NOT_FOUND for an unknown object apiName", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object not found",
    });

    const res = await request(app).post("/api/records/unknown_object").send({ years_experience: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when a required field is missing", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(createRecord).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Required field 'years_experience' is missing",
    });

    const res = await request(app).post("/api/records/doctor").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when a value has the wrong type", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(createRecord).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Expected number, received string",
    });

    const res = await request(app).post("/api/records/doctor").send({ years_experience: "five" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when a picklist value is not in the options", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(createRecord).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid enum value",
    });

    const res = await request(app).post("/api/records/doctor").send({ status: "unknown_option" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when a lookup value references a nonexistent record", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(createRecord).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Referenced record does not exist",
    });

    const res = await request(app)
      .post("/api/records/doctor")
      .send({ hospital: "11111111-1111-1111-1111-111111111111" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 201 with the created record for valid data", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(createRecord).mockResolvedValueOnce({ ok: true, record: RECORD_DTO });

    const res = await request(app).post("/api/records/doctor").send({ years_experience: 5 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: RECORD_DTO });
    expect(createRecord).toHaveBeenCalledWith("org-1", OBJECT_DTO, { years_experience: 5 });
  });
});

describe("GET /api/records/:objectApiName/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/records/doctor/rec-1");

    expect(res.status).toBe(401);
  });

  it("returns 404 OBJECT_NOT_FOUND for an unknown object apiName", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object not found",
    });

    const res = await request(app).get("/api/records/unknown_object/rec-1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
    expect(getRecord).not.toHaveBeenCalled();
  });

  it("returns 404 RECORD_NOT_FOUND when the record does not exist or belongs to another org", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(getRecord).mockResolvedValueOnce({
      ok: false,
      code: "RECORD_NOT_FOUND",
      message: "Record not found",
    });

    const res = await request(app).get("/api/records/doctor/unknown-rec");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RECORD_NOT_FOUND");
  });

  it("returns 200 with the record when found", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(getRecord).mockResolvedValueOnce({ ok: true, record: RECORD_DTO });

    const res = await request(app).get("/api/records/doctor/rec-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: RECORD_DTO });
    expect(getRecord).toHaveBeenCalledWith("org-1", OBJECT_DTO, "rec-1");
  });
});

describe("PUT /api/records/:objectApiName/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).put("/api/records/doctor/rec-1").send({ years_experience: 10 });

    expect(res.status).toBe(401);
  });

  it("returns 404 OBJECT_NOT_FOUND for an unknown object apiName", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object not found",
    });

    const res = await request(app).put("/api/records/unknown_object/rec-1").send({ years_experience: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it("returns 404 RECORD_NOT_FOUND when the record does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(updateRecord).mockResolvedValueOnce({
      ok: false,
      code: "RECORD_NOT_FOUND",
      message: "Record not found",
    });

    const res = await request(app).put("/api/records/doctor/unknown-rec").send({ years_experience: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RECORD_NOT_FOUND");
  });

  it("returns 400 VALIDATION_ERROR when the replacement data fails validation", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(updateRecord).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Expected number, received string",
    });

    const res = await request(app).put("/api/records/doctor/rec-1").send({ years_experience: "ten" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with the updated record replacing all data fields", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    const updatedRecord = { ...RECORD_DTO, data: { years_experience: 10 } };
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(updateRecord).mockResolvedValueOnce({ ok: true, record: updatedRecord });

    const res = await request(app).put("/api/records/doctor/rec-1").send({ years_experience: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: updatedRecord });
    expect(updateRecord).toHaveBeenCalledWith("org-1", OBJECT_DTO, "rec-1", { years_experience: 10 });
  });
});

describe("DELETE /api/records/:objectApiName/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).delete("/api/records/doctor/rec-1");

    expect(res.status).toBe(401);
  });

  it("returns 404 OBJECT_NOT_FOUND for an unknown object apiName", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object not found",
    });

    const res = await request(app).delete("/api/records/unknown_object/rec-1");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it("returns 404 RECORD_NOT_FOUND when the record does not exist or belongs to another org", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(deleteRecord).mockResolvedValueOnce({
      ok: false,
      code: "RECORD_NOT_FOUND",
      message: "Record not found",
    });

    const res = await request(app).delete("/api/records/doctor/unknown-rec");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RECORD_NOT_FOUND");
  });

  it("returns 200 when the record is successfully deleted", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(resolveObjectByApiName).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });
    vi.mocked(deleteRecord).mockResolvedValueOnce({ ok: true });

    const res = await request(app).delete("/api/records/doctor/rec-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: {} });
    expect(deleteRecord).toHaveBeenCalledWith("org-1", OBJECT_DTO, "rec-1");
  });
});
