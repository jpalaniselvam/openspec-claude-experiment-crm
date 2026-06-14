import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { objectDefinitions } from "./object-definitions.js";
import { organizations } from "./organizations.js";

export const records = pgTable(
  "records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    objectDefinitionId: uuid("object_definition_id")
      .notNull()
      .references(() => objectDefinitions.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("records_org_object_idx").on(table.organizationId, table.objectDefinitionId)],
);
