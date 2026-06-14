import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { objectDefinitions } from "./object-definitions.js";

export const fieldDataTypeEnum = pgEnum("field_data_type", [
  "text",
  "long_text",
  "number",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "email",
  "phone",
  "url",
  "picklist",
  "lookup",
]);

export const fieldDefinitions = pgTable(
  "field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectDefinitionId: uuid("object_definition_id")
      .notNull()
      .references(() => objectDefinitions.id, { onDelete: "cascade" }),
    apiKey: text("api_key").notNull(),
    name: text("name").notNull(),
    dataType: fieldDataTypeEnum("data_type").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    isUnique: boolean("is_unique").notNull().default(false),
    isSearchable: boolean("is_searchable").notNull().default(false),
    isReadOnly: boolean("is_read_only").notNull().default(false),
    defaultValue: jsonb("default_value"),
    options: jsonb("options").$type<string[]>(),
    lookupObjectDefinitionId: uuid("lookup_object_definition_id").references(() => objectDefinitions.id, {
      onDelete: "restrict",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("field_definitions_object_api_key_idx").on(table.objectDefinitionId, table.apiKey),
  ],
);
