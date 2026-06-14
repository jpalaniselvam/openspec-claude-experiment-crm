import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, fromMock, whereMock, limitMock, orderByMock, updateMock, setMock, updateWhereMock, returningMock, signUpEmailMock } =
  vi.hoisted(() => {
    const limitMock = vi.fn();
    const orderByMock = vi.fn();
    const whereMock = vi.fn(() => ({ limit: limitMock, orderBy: orderByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    const selectMock = vi.fn(() => ({ from: fromMock }));

    const returningMock = vi.fn();
    const updateWhereMock = vi.fn(() => ({ returning: returningMock }));
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    const updateMock = vi.fn(() => ({ set: setMock }));

    const signUpEmailMock = vi.fn();

    return {
      selectMock,
      fromMock,
      whereMock,
      limitMock,
      orderByMock,
      updateMock,
      setMock,
      updateWhereMock,
      returningMock,
      signUpEmailMock,
    };
  });

vi.mock("../db/client.js", () => ({
  db: { select: selectMock, update: updateMock },
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { signUpEmail: signUpEmailMock } },
}));

const { createUser, listUsers, updateUser } = await import("./user-service.js");

const ORGANIZATION = { id: "org-1", slug: "acme", name: "Acme" };

const BOB_ROW = {
  id: "user-2",
  name: "Bob Smith",
  email: "bob@example.com",
  emailVerified: false,
  image: null,
  username: "acme:bob",
  displayUsername: "bob",
  organizationId: "org-1",
  status: "active",
  role: "member",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listUsers", () => {
  it("returns users scoped to the organization, ordered by displayUsername", async () => {
    orderByMock.mockResolvedValueOnce([BOB_ROW]);

    const result = await listUsers("org-1");

    expect(result).toEqual([
      { id: "user-2", username: "bob", displayName: "Bob Smith", email: "bob@example.com", role: "member", status: "active" },
    ]);
    expect(selectMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalled();
  });
});

describe("createUser", () => {
  const input = {
    username: "carol",
    displayName: "Carol White",
    email: "carol@example.com",
    password: "Password123!",
    role: "member" as const,
  };

  it("creates a user via Better Auth and returns the created user", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signUpEmailMock.mockResolvedValueOnce({});
    limitMock.mockResolvedValueOnce([
      { ...BOB_ROW, id: "user-3", name: "Carol White", email: "carol@example.com", username: "acme:carol", displayUsername: "carol" },
    ]);

    const result = await createUser("org-1", input);

    expect(signUpEmailMock).toHaveBeenCalledWith({
      body: {
        email: "carol@example.com",
        password: "Password123!",
        name: "Carol White",
        username: "acme:carol",
        displayUsername: "carol",
        organizationId: "org-1",
        role: "member",
      },
    });
    expect(result).toEqual({
      ok: true,
      user: { id: "user-3", username: "carol", displayName: "Carol White", email: "carol@example.com", role: "member", status: "active" },
    });
  });

  it("returns USERNAME_TAKEN when Better Auth reports the username is already taken", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signUpEmailMock.mockRejectedValueOnce({ body: { code: "USERNAME_IS_ALREADY_TAKEN" } });

    const result = await createUser("org-1", input);

    expect(result).toEqual({ ok: false, code: "USERNAME_TAKEN", message: "A user with this username already exists" });
  });

  it("returns USERNAME_TAKEN when Better Auth reports the user already exists", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signUpEmailMock.mockRejectedValueOnce({ body: { code: "USER_ALREADY_EXISTS" } });

    const result = await createUser("org-1", input);

    expect(result).toEqual({ ok: false, code: "USERNAME_TAKEN", message: "A user with this username already exists" });
  });

  it("rethrows unexpected errors from Better Auth", async () => {
    limitMock.mockResolvedValueOnce([ORGANIZATION]);
    signUpEmailMock.mockRejectedValueOnce(new Error("boom"));

    await expect(createUser("org-1", input)).rejects.toThrow("boom");
  });
});

describe("updateUser", () => {
  it("rejects changing the caller's own role or status", async () => {
    const result = await updateUser("org-1", "user-2", "user-2", { role: "admin" });

    expect(result).toEqual({ ok: false, code: "SELF_MODIFICATION", message: "You cannot change your own role or status" });
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("allows the caller to update their own displayName", async () => {
    limitMock.mockResolvedValueOnce([BOB_ROW]);
    returningMock.mockResolvedValueOnce([{ ...BOB_ROW, name: "Bobby Smith" }]);

    const result = await updateUser("org-1", "user-2", "user-2", { displayName: "Bobby Smith" });

    expect(result.ok).toBe(true);
    expect((result as { ok: true; user: { displayName: string } }).user.displayName).toBe("Bobby Smith");
  });

  it("returns NOT_FOUND when the target user does not exist in the caller's organization", async () => {
    limitMock.mockResolvedValueOnce([]);

    const result = await updateUser("org-1", "user-1", "user-2", { role: "admin" });

    expect(result).toEqual({ ok: false, code: "NOT_FOUND", message: "User not found" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the target user's role and status", async () => {
    limitMock.mockResolvedValueOnce([BOB_ROW]);
    returningMock.mockResolvedValueOnce([{ ...BOB_ROW, role: "admin", status: "disabled" }]);

    const result = await updateUser("org-1", "user-1", "user-2", { role: "admin", status: "disabled" });

    expect(result).toEqual({
      ok: true,
      user: { id: "user-2", username: "bob", displayName: "Bob Smith", email: "bob@example.com", role: "admin", status: "disabled" },
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin", status: "disabled" }),
    );
  });
});
