import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db, pool } from "../db/client.js";
import { organizations, users } from "../db/schema/index.js";

const SEED_PASSWORD = "Password123!";

type SeedUser = { username: string; displayName: string; status: "active" | "disabled"; role: "admin" | "member" };

const SEED_ORGS: { slug: string; name: string; users: SeedUser[] }[] = [
  {
    slug: "acme",
    name: "Acme Corporation",
    users: [
      { username: "jane", displayName: "Jane Doe", status: "active", role: "admin" },
      { username: "bob", displayName: "Bob Smith", status: "disabled", role: "member" },
    ],
  },
  {
    slug: "globex",
    name: "Globex Corporation",
    users: [{ username: "admin", displayName: "Admin User", status: "active", role: "admin" }],
  },
];

async function main() {
  for (const seedOrg of SEED_ORGS) {
    await seedOrganization(seedOrg);
  }

  await pool.end();
}

async function seedOrganization({ slug, name, users: seedUsers }: { slug: string; name: string; users: SeedUser[] }) {
  let [organization] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);

  if (!organization) {
    [organization] = await db.insert(organizations).values({ slug, name }).returning();
    console.log(`Created organization "${organization.slug}"`);
  } else {
    console.log(`Organization "${organization.slug}" already exists`);
  }

  for (const seedUser of seedUsers) {
    await createSeedUser(organization.id, slug, seedUser);
  }
}

async function createSeedUser(
  organizationId: string,
  orgSlug: string,
  {
    username,
    displayName,
    status,
    role,
  }: SeedUser,
) {
  const compositeUsername = `${orgSlug}:${username}`.toLowerCase();
  // Better Auth's email validator rejects ":", so use "+" for the placeholder email's local part.
  const placeholderEmail = `${orgSlug}+${username}@tenant.local`.toLowerCase();

  try {
    await auth.api.signUpEmail({
      body: {
        email: placeholderEmail,
        password: SEED_PASSWORD,
        name: displayName,
        username: compositeUsername,
        displayUsername: username,
        organizationId,
        role,
      },
    });
    console.log(`Created user "${username}" in organization "${orgSlug}" (password: ${SEED_PASSWORD})`);
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code === "USERNAME_IS_ALREADY_TAKEN" || code === "USER_ALREADY_EXISTS") {
      console.log(`User "${username}" in organization "${orgSlug}" already exists, skipping`);
    } else {
      throw err;
    }
  }

  if (status === "disabled") {
    await db.update(users).set({ status: "disabled" }).where(eq(users.username, compositeUsername));
    console.log(`Set user "${username}" status to "disabled"`);
  }

  await db.update(users).set({ role }).where(eq(users.username, compositeUsername));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
