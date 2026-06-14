import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

/**
 * Doubles as Better Auth's `user` model. `username` holds the globally-unique
 * composite identifier (`<organizationSlug>:<username>`) Better Auth's username
 * plugin requires; `displayUsername` holds the org-local username shown to users
 * and is unique per organization via `users_org_display_username_idx`.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    username: text("username").notNull().unique(),
    displayUsername: text("display_username").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_org_display_username_idx").on(table.organizationId, table.displayUsername),
  ],
);
