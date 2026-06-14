import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectMock,
  fromMock,
  whereMock,
  limitMock,
  deleteMock,
  deleteWhereMock,
  signInUsernameMock,
  getSessionMock,
  signOutMock,
} = vi.hoisted(() => {
  const limitMock = vi.fn();
  const whereMock = vi.fn(() => ({ limit: limitMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));

  const deleteWhereMock = vi.fn(() => Promise.resolve());
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  const signInUsernameMock = vi.fn();
  const getSessionMock = vi.fn();
  const signOutMock = vi.fn();

  return {
    selectMock,
    fromMock,
    whereMock,
    limitMock,
    deleteMock,
    deleteWhereMock,
    signInUsernameMock,
    getSessionMock,
    signOutMock,
  };
});

vi.mock("../db/client.js", () => ({
  db: { select: selectMock, delete: deleteMock },
}));

vi.mock("../lib/auth.js", () => ({
  auth: {
    api: {
      signInUsername: signInUsernameMock,
      getSession: getSessionMock,
      signOut: signOutMock,
    },
  },
}));

const { getCurrentUser, loginWithCredentials, logout } = await import("./auth-service.js");

const ORGANIZATION = { id: "org-1", slug: "acme", name: "Acme" };

function signInResponse(user: Record<string, unknown>, token = "session-token") {
  return {
    ok: true,
    json: () => Promise.resolve({ token, user }),
    headers: { getSetCookie: () => ["better-auth.session_token=abc; Path=/; HttpOnly"] },
  };
}

function signInFailureResponse() {
  return {
    ok: false,
    json: () => Promise.resolve({ message: "Invalid username or password", code: "INVALID_USERNAME_OR_PASSWORD" }),
    headers: { getSetCookie: () => [] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginWithCredentials", () => {
  it("returns the user and session cookie for valid credentials", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signInUsernameMock.mockResolvedValueOnce(
      signInResponse({ id: "user-1", name: "Jane Doe", displayUsername: "jane", status: "active", organizationId: "org-1" }),
    );

    const result = await loginWithCredentials("acme", "jane", "Password123!");

    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", username: "jane", displayName: "Jane Doe", organizationSlug: "acme" },
      setCookieHeaders: ["better-auth.session_token=abc; Path=/; HttpOnly"],
    });
    expect(signInUsernameMock).toHaveBeenCalledWith({
      body: { username: "acme:jane", password: "Password123!" },
      asResponse: true,
    });
  });

  it("returns INVALID_CREDENTIALS for an unknown organization", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await loginWithCredentials("unknown-org", "jane", "Password123!");

    expect(result).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid organization ID, username, or password",
    });
    expect(signInUsernameMock).not.toHaveBeenCalled();
  });

  it("returns INVALID_CREDENTIALS for an unknown username within a valid organization", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signInUsernameMock.mockResolvedValueOnce(signInFailureResponse());

    const result = await loginWithCredentials("acme", "no-such-user", "Password123!");

    expect(result).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid organization ID, username, or password",
    });
  });

  it("returns INVALID_CREDENTIALS for an incorrect password", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signInUsernameMock.mockResolvedValueOnce(signInFailureResponse());

    const result = await loginWithCredentials("acme", "jane", "wrong-password");

    expect(result).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid organization ID, username, or password",
    });
  });

  it("returns ACCOUNT_DISABLED and discards the session for a disabled account", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signInUsernameMock.mockResolvedValueOnce(
      signInResponse(
        { id: "user-1", name: "Jane Doe", displayUsername: "jane", status: "disabled", organizationId: "org-1" },
        "disabled-session-token",
      ),
    );

    const result = await loginWithCredentials("acme", "jane", "Password123!");

    expect(result).toEqual({
      ok: false,
      code: "ACCOUNT_DISABLED",
      message: "Your account has been disabled. Contact your administrator.",
    });
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteWhereMock).toHaveBeenCalled();
  });
});

describe("getCurrentUser", () => {
  it("returns ok: false when there is no session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await getCurrentUser(new Headers());

    expect(result).toEqual({ ok: false });
  });

  it("returns the current user and organization slug for a valid session", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: { id: "user-1", name: "Jane Doe", displayUsername: "jane", organizationId: "org-1" },
    });
    limitMock.mockResolvedValueOnce([ORGANIZATION]);

    const result = await getCurrentUser(new Headers());

    expect(result).toEqual({
      ok: true,
      user: { id: "user-1", username: "jane", displayName: "Jane Doe", organizationSlug: "acme" },
    });
  });
});

describe("logout", () => {
  it("returns the cookies to clear when a session is invalidated", async () => {
    signOutMock.mockResolvedValueOnce({
      headers: { getSetCookie: () => ["better-auth.session_token=; Max-Age=0"] },
    });

    const result = await logout(new Headers());

    expect(result).toEqual(["better-auth.session_token=; Max-Age=0"]);
  });

  it("returns an empty array when there is no active session", async () => {
    signOutMock.mockRejectedValueOnce(new Error("no session"));

    const result = await logout(new Headers());

    expect(result).toEqual([]);
  });
});
