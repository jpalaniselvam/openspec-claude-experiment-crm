import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db, pool } from "../db/client.js";
import { organizations, users } from "../db/schema/index.js";

const ORG_SLUG = "acme";
const ORG_NAME = "Acme Corporation";
const SEED_PASSWORD = "Password123!";

const SEED_USERS: { username: string; displayName: string; status: "active" | "disabled" }[] = [
  { username: "jane", displayName: "Jane Doe", status: "active" },
  { username: "bob", displayName: "Bob Smith", status: "disabled" },
];

async function main() {
  let [organization] = await db.select().from(organizations).where(eq(organizations.slug, ORG_SLUG)).limit(1);

  if (!organization) {
    [organization] = await db.insert(organizations).values({ slug: ORG_SLUG, name: ORG_NAME }).returning();
    console.log(`Created organization "${organization.slug}"`);
  } else {
    console.log(`Organization "${organization.slug}" already exists`);
  }

  for (const seedUser of SEED_USERS) {
    await createSeedUser(organization.id, seedUser);
  }

  await pool.end();
}

async function createSeedUser(
  organizationId: string,
  { username, displayName, status }: { username: string; displayName: string; status: "active" | "disabled" },
) {
  const compositeUsername = `${ORG_SLUG}:${username}`.toLowerCase();
  // Better Auth's email validator rejects ":", so use "+" for the placeholder email's local part.
  const placeholderEmail = `${ORG_SLUG}+${username}@tenant.local`.toLowerCase();

  try {
    await auth.api.signUpEmail({
      body: {
        email: placeholderEmail,
        password: SEED_PASSWORD,
        name: displayName,
        username: compositeUsername,
        displayUsername: username,
        organizationId,
      },
    });
    console.log(`Created user "${username}" in organization "${ORG_SLUG}" (password: ${SEED_PASSWORD})`);
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code === "USERNAME_IS_ALREADY_TAKEN" || code === "USER_ALREADY_EXISTS") {
      console.log(`User "${username}" in organization "${ORG_SLUG}" already exists, skipping`);
    } else {
      throw err;
    }
  }

  if (status === "disabled") {
    await db.update(users).set({ status: "disabled" }).where(eq(users.username, compositeUsername));
    console.log(`Set user "${username}" status to "disabled"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
