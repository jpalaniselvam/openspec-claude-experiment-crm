import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("../services/user-service.js", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

const { listUsers, createUser, updateUser } = await import("../services/user-service.js");
const { createApp } = await import("../app.js");

const app = createApp();

const ADMIN_SESSION = { user: { id: "admin-1", organizationId: "org-1", role: "admin" } };
const MEMBER_SESSION = { user: { id: "user-1", organizationId: "org-1", role: "member" } };

const USER = { id: "user-2", username: "bob", displayName: "Bob Smith", email: "bob@example.com", role: "member", status: "active" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/users", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("returns the organization's users for an admin", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listUsers).mockResolvedValueOnce([USER]);

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [USER] });
    expect(listUsers).toHaveBeenCalledWith("org-1");
  });
});

describe("POST /api/users", () => {
  const validBody = {
    username: "carol",
    displayName: "Carol White",
    email: "carol@example.com",
    password: "Password123!",
    role: "member",
  };

  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(401);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(403);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for an invalid body", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app)
      .post("/api/users")
      .send({ username: "", displayName: "", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 201 with the created user for valid input", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createUser).mockResolvedValueOnce({ ok: true, user: { ...USER, username: "carol", displayName: "Carol White" } });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { ...USER, username: "carol", displayName: "Carol White" } });
    expect(createUser).toHaveBeenCalledWith("org-1", validBody);
  });

  it("returns 409 USERNAME_TAKEN when the username is already in use", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(createUser).mockResolvedValueOnce({
      ok: false,
      code: "USERNAME_TAKEN",
      message: "A user with this username already exists",
    });

    const res = await request(app).post("/api/users").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USERNAME_TAKEN");
  });
});

describe("PATCH /api/users/:id", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).patch("/api/users/user-2").send({ role: "admin" });

    expect(res.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).patch("/api/users/user-2").send({ role: "admin" });

    expect(res.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR when no fields are provided", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);

    const res = await request(app).patch("/api/users/user-2").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns 200 with the updated user", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateUser).mockResolvedValueOnce({ ok: true, user: { ...USER, role: "admin" } });

    const res = await request(app).patch("/api/users/user-2").send({ role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { ...USER, role: "admin" } });
    expect(updateUser).toHaveBeenCalledWith("org-1", "admin-1", "user-2", { role: "admin" });
  });

  it("returns 404 NOT_FOUND when the target user does not exist in the organization", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateUser).mockResolvedValueOnce({ ok: false, code: "NOT_FOUND", message: "User not found" });

    const res = await request(app).patch("/api/users/unknown").send({ role: "admin" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 SELF_MODIFICATION when an admin tries to change their own role", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(updateUser).mockResolvedValueOnce({
      ok: false,
      code: "SELF_MODIFICATION",
      message: "You cannot change your own role or status",
    });

    const res = await request(app).patch("/api/users/admin-1").send({ role: "member" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_MODIFICATION");
  });
});
