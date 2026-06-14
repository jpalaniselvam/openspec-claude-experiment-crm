import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db } from "../db/client.js";
import { organizations, sessions } from "../db/schema/index.js";

export interface AuthUserDto {
  id: string;
  username: string;
  displayName: string;
  organizationSlug: string | null;
}

export type LoginResult =
  | { ok: true; user: AuthUserDto; setCookieHeaders: string[] }
  | { ok: false; code: "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED"; message: string };

export type SessionResult = { ok: true; user: AuthUserDto } | { ok: false };

function compositeUsername(organizationSlug: string, username: string): string {
  return `${organizationSlug}:${username}`.toLowerCase();
}

/**
 * Verifies org-scoped credentials against Better Auth and maps the result onto
 * the tenant-auth error codes (INVALID_CREDENTIALS is intentionally generic
 * across unknown org, unknown username, and wrong password).
 */
export async function loginWithCredentials(
  organizationSlug: string,
  username: string,
  password: string,
): Promise<LoginResult> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug.toLowerCase()))
    .limit(1);

  if (!organization) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid organization ID, username, or password" };
  }

  let signInResult;
  try {
    signInResult = await auth.api.signInUsername({
      body: { username: compositeUsername(organizationSlug, username), password },
      asResponse: true,
    });
  } catch {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid organization ID, username, or password" };
  }

  if (!signInResult.ok) {
    return { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid organization ID, username, or password" };
  }

  const body = (await signInResult.json()) as {
    token: string;
    user: { id: string; name: string; displayUsername: string; status: string; organizationId: string };
  };

  if (body.user.status === "disabled") {
    // Discard the session that signInUsername just created; no cookie is sent to the client.
    await db.delete(sessions).where(eq(sessions.token, body.token));
    return {
      ok: false,
      code: "ACCOUNT_DISABLED",
      message: "Your account has been disabled. Contact your administrator.",
    };
  }

  return {
    ok: true,
    user: {
      id: body.user.id,
      username: body.user.displayUsername,
      displayName: body.user.name,
      organizationSlug: organization.slug,
    },
    setCookieHeaders: signInResult.headers.getSetCookie(),
  };
}

export async function getCurrentUser(headers: Headers): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return { ok: false };
  }

  const user = session.user as typeof session.user & { organizationId: string; displayUsername: string };

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.displayUsername,
      displayName: user.name,
      organizationSlug: organization?.slug ?? null,
    },
  };
}

export async function logout(headers: Headers): Promise<string[]> {
  try {
    const response = await auth.api.signOut({ headers, asResponse: true });
    return response.headers.getSetCookie();
  } catch {
    // No active session — logout is idempotent.
    return [];
  }
}
