import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

const { requireAdmin } = await import("./require-admin.js");

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAdmin", () => {
  it("returns 401 UNAUTHORIZED when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: "UNAUTHORIZED", message: "No active session" } });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when the session user is not an admin", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "member" },
    });
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: "FORBIDDEN", message: "This action requires an administrator role" },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches currentUser and calls next() for an admin session", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "admin" },
    });
    const req = { headers: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await requireAdmin(req, res, next);

    expect(req.currentUser).toEqual({ id: "user-1", organizationId: "org-1", role: "admin" });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
