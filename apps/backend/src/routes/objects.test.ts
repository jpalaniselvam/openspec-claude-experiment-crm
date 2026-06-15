import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("../services/object-definition-service.js", () => ({
  listObjectDefinitions: vi.fn(),
  createObjectDefinition: vi.fn(),
  getObjectDefinition: vi.fn(),
  updateObjectDefinition: vi.fn(),
}));

const { listObjectDefinitions, createObjectDefinition, getObjectDefinition, updateObjectDefinition } = await import(
  "../services/object-definition-service.js"
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
  displayFieldApiKey: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/objects", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/objects");

    expect(res.status).toBe(401);
    expect(listObjectDefinitions).not.toHaveBeenCalled();
  });

  it("returns 200 when the session user is a member", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(listObjectDefinitions).mockResolvedValueOnce([OBJECT_DTO]);

    const res = await request(app).get("/api/objects");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [OBJECT_DTO] });
    expect(listObjectDefinitions).toHaveBeenCalledWith("org-1");
  });

  it("returns the organization's object definitions for an admin", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listObjectDefinitions).mockResolvedValueOnce([OBJECT_DTO]);

    const res = await request(app).get("/api/objects");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [OBJECT_DTO] });
    expect(listObjectDefinitions).toHaveBeenCalledWith("org-1");
  });
});

describe("POST /api/objects", () => {
  const validBody = { name: "Doctor", pluralName: "Doctors" };

  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/objects").send(validBody);

    expect(res.status).toBe(401);
    expect(createObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).post("/api/objects").send(validBody);

    expect(res.status).toBe(403);
    expect(createObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for an invalid body", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app).post("/api/objects").send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(createObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 201 with the created object for valid input", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createObjectDefinition).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });

    const res = await request(app).post("/api/objects").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: OBJECT_DTO });
    expect(createObjectDefinition).toHaveBeenCalledWith("org-1", validBody);
  });

  it("returns 409 OBJECT_API_NAME_TAKEN when the apiName is already in use", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createObjectDefinition).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_API_NAME_TAKEN",
      message: 'An object with apiName "doctor" already exists',
    });

    const res = await request(app).post("/api/objects").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("OBJECT_API_NAME_TAKEN");
  });
});

describe("GET /api/objects/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/objects/obj-1");

    expect(res.status).toBe(401);
    expect(getObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 200 when the session user is a member", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);
    vi.mocked(getObjectDefinition).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });

    const res = await request(app).get("/api/objects/obj-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: OBJECT_DTO });
    expect(getObjectDefinition).toHaveBeenCalledWith("org-1", "obj-1");
  });

  it("returns 404 OBJECT_NOT_FOUND when the object does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(getObjectDefinition).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object definition not found",
    });

    const res = await request(app).get("/api/objects/unknown");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
  });

  it("returns the object definition when found", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(getObjectDefinition).mockResolvedValueOnce({ ok: true, object: OBJECT_DTO });

    const res = await request(app).get("/api/objects/obj-1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: OBJECT_DTO });
    expect(getObjectDefinition).toHaveBeenCalledWith("org-1", "obj-1");
  });
});

describe("PATCH /api/objects/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).patch("/api/objects/obj-1").send({ name: "Physician" });

    expect(res.status).toBe(401);
    expect(updateObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).patch("/api/objects/obj-1").send({ name: "Physician" });

    expect(res.status).toBe(403);
    expect(updateObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when no fields are provided", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app).patch("/api/objects/obj-1").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when apiName is included in the payload", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app).patch("/api/objects/obj-1").send({ apiName: "physician" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateObjectDefinition).not.toHaveBeenCalled();
  });

  it("returns 200 with the updated object", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateObjectDefinition).mockResolvedValueOnce({ ok: true, object: { ...OBJECT_DTO, name: "Physician" } });

    const res = await request(app).patch("/api/objects/obj-1").send({ name: "Physician" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ...OBJECT_DTO, name: "Physician" } });
    expect(updateObjectDefinition).toHaveBeenCalledWith("org-1", "obj-1", { name: "Physician" });
  });

  it("returns 404 OBJECT_NOT_FOUND when the object does not exist", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateObjectDefinition).mockResolvedValueOnce({
      ok: false,
      code: "OBJECT_NOT_FOUND",
      message: "Object definition not found",
    });

    const res = await request(app).patch("/api/objects/unknown").send({ name: "Physician" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("OBJECT_NOT_FOUND");
  });

  it("returns 200 with the updated displayFieldApiKey", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateObjectDefinition).mockResolvedValueOnce({
      ok: true,
      object: { ...OBJECT_DTO, displayFieldApiKey: "name" },
    });

    const res = await request(app).patch("/api/objects/obj-1").send({ displayFieldApiKey: "name" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ...OBJECT_DTO, displayFieldApiKey: "name" } });
    expect(updateObjectDefinition).toHaveBeenCalledWith("org-1", "obj-1", { displayFieldApiKey: "name" });
  });

  it("returns 400 VALIDATION_ERROR when displayFieldApiKey is invalid", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateObjectDefinition).mockResolvedValueOnce({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "displayFieldApiKey must reference a text or long_text field on this object",
    });

    const res = await request(app).patch("/api/objects/obj-1").send({ displayFieldApiKey: "years_experience" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
