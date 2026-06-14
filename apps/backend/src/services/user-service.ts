import { and, asc, eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db } from "../db/client.js";
import { organizations, users } from "../db/schema/index.js";
import { compositeUsername } from "./auth-service.js";
import type { CreateUserInput, UpdateUserInput } from "../validation/users.js";

export interface UserDto {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
}

export type CreateUserResult = { ok: true; user: UserDto } | { ok: false; code: "USERNAME_TAKEN"; message: string };

export type UpdateUserResult =
  | { ok: true; user: UserDto }
  | { ok: false; code: "NOT_FOUND" | "SELF_MODIFICATION"; message: string };

function toUserDto(row: typeof users.$inferSelect): UserDto {
  return {
    id: row.id,
    username: row.displayUsername,
    displayName: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

export async function listUsers(organizationId: string): Promise<UserDto[]> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .orderBy(asc(users.displayUsername));

  return rows.map(toUserDto);
}

export async function createUser(organizationId: string, input: CreateUserInput): Promise<CreateUserResult> {
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const username = compositeUsername(organization!.slug, input.username);

  try {
    await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.displayName,
        username,
        displayUsername: input.username,
        organizationId,
        role: input.role,
      },
    });
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code === "USERNAME_IS_ALREADY_TAKEN" || code === "USER_ALREADY_EXISTS") {
      return { ok: false, code: "USERNAME_TAKEN", message: "A user with this username already exists" };
    }
    throw err;
  }

  const [created] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  return { ok: true, user: toUserDto(created) };
}

export async function updateUser(
  organizationId: string,
  currentUserId: string,
  targetUserId: string,
  input: UpdateUserInput,
): Promise<UpdateUserResult> {
  if (targetUserId === currentUserId && (input.role !== undefined || input.status !== undefined)) {
    return { ok: false, code: "SELF_MODIFICATION", message: "You cannot change your own role or status" };
  }

  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, targetUserId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!target) {
    return { ok: false, code: "NOT_FOUND", message: "User not found" };
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(input.displayName !== undefined ? { name: input.displayName } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUserId))
    .returning();

  return { ok: true, user: toUserDto(updated) };
}
