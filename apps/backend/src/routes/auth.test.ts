import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/auth-service.js", () => ({
  loginWithCredentials: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

const { loginWithCredentials, getCurrentUser, logout } = await import("../services/auth-service.js");
const { createApp } = await import("../app.js");

const app = createApp();

const USER = { id: "user-1", username: "jane", displayName: "Jane Doe", organizationSlug: "acme" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 400 VALIDATION_ERROR when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ organizationSlug: "", username: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(loginWithCredentials).not.toHaveBeenCalled();
  });

  it("returns success, the user payload, and a session cookie for valid credentials", async () => {
    vi.mocked(loginWithCredentials).mockResolvedValueOnce({
      ok: true,
      user: USER,
      setCookieHeaders: ["better-auth.session_token=abc; Path=/; HttpOnly"],
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ organizationSlug: "acme", username: "jane", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: USER });
    expect(res.headers["set-cookie"]?.[0]).toContain("better-auth.session_token=abc");
  });

  it("returns 401 INVALID_CREDENTIALS for unknown org, username, or wrong password", async () => {
    vi.mocked(loginWithCredentials).mockResolvedValueOnce({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid organization ID, username, or password",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ organizationSlug: "acme", username: "jane", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid organization ID, username, or password" },
    });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("returns 403 ACCOUNT_DISABLED for a disabled account", async () => {
    vi.mocked(loginWithCredentials).mockResolvedValueOnce({
      ok: false,
      code: "ACCOUNT_DISABLED",
      message: "Your account has been disabled. Contact your administrator.",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ organizationSlug: "acme", username: "jane", password: "Password123!" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_DISABLED");
  });
});

describe("GET /api/auth/session", () => {
  it("returns 401 when there is no valid session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ ok: false });

    const res = await request(app).get("/api/auth/session");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns the current user for a valid session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ ok: true, user: USER });

    const res = await request(app).get("/api/auth/session");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: USER });
  });
});

describe("POST /api/auth/logout", () => {
  it("returns success and is idempotent without an active session", async () => {
    vi.mocked(logout).mockResolvedValueOnce([]);

    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: {} });
  });

  it("clears the session cookie when logging out", async () => {
    vi.mocked(logout).mockResolvedValueOnce(["better-auth.session_token=; Max-Age=0"]);

    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toContain("better-auth.session_token=");
  });
});
