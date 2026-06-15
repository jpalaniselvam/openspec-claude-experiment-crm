import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const objectDefinitions = pgTable(
  "object_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    apiName: text("api_name").notNull(),
    name: text("name").notNull(),
    pluralName: text("plural_name").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    schemaVersion: integer("schema_version").notNull().default(1),
    isArchived: boolean("is_archived").notNull().default(false),
    displayFieldApiKey: text("display_field_api_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("object_definitions_org_api_name_idx").on(table.organizationId, table.apiName),
  ],
);
