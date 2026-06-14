import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { fieldDefinitions, objectDefinitions, records } from "../db/schema/index.js";
import { slugify } from "../lib/slugify.js";
import type { CreateFieldInput, UpdateFieldInput } from "../validation/fields.js";

export interface FieldDefinitionDto {
  id: string;
  apiKey: string;
  name: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isReadOnly: boolean;
  defaultValue: unknown;
  options: string[] | null;
  lookupObjectDefinitionId: string | null;
  sortOrder: number;
}

export type ListFieldsResult =
  | { ok: true; fields: FieldDefinitionDto[] }
  | { ok: false; code: "OBJECT_NOT_FOUND"; message: string };

export type CreateFieldResult =
  | { ok: true; field: FieldDefinitionDto }
  | { ok: false; code: "OBJECT_NOT_FOUND" | "FIELD_API_KEY_TAKEN" | "VALIDATION_ERROR"; message: string };

export type UpdateFieldResult =
  | { ok: true; field: FieldDefinitionDto }
  | { ok: false; code: "OBJECT_NOT_FOUND" | "FIELD_NOT_FOUND"; message: string };

export type DeleteFieldResult =
  | { ok: true }
  | { ok: false; code: "OBJECT_NOT_FOUND" | "FIELD_NOT_FOUND" | "FIELD_IN_USE"; message: string };

function toDto(row: typeof fieldDefinitions.$inferSelect): FieldDefinitionDto {
  return {
    id: row.id,
    apiKey: row.apiKey,
    name: row.name,
    dataType: row.dataType,
    isRequired: row.isRequired,
    isUnique: row.isUnique,
    isSearchable: row.isSearchable,
    isReadOnly: row.isReadOnly,
    defaultValue: row.defaultValue,
    options: row.options ?? null,
    lookupObjectDefinitionId: row.lookupObjectDefinitionId,
    sortOrder: row.sortOrder,
  };
}

async function findObjectDefinition(organizationId: string, objectId: string) {
  const [row] = await db
    .select()
    .from(objectDefinitions)
    .where(and(eq(objectDefinitions.id, objectId), eq(objectDefinitions.organizationId, organizationId)))
    .limit(1);

  return row ?? null;
}

async function incrementSchemaVersion(objectId: string): Promise<void> {
  await db
    .update(objectDefinitions)
    .set({ schemaVersion: sql`${objectDefinitions.schemaVersion} + 1`, updatedAt: new Date() })
    .where(eq(objectDefinitions.id, objectId));
}

export async function listFieldDefinitions(organizationId: string, objectId: string): Promise<ListFieldsResult> {
  const object = await findObjectDefinition(organizationId, objectId);
  if (!object) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  const rows = await db
    .select()
    .from(fieldDefinitions)
    .where(eq(fieldDefinitions.objectDefinitionId, objectId))
    .orderBy(asc(fieldDefinitions.sortOrder));

  return { ok: true, fields: rows.map(toDto) };
}

/** Used by record-service, which already has a resolved, org-scoped object definition. */
export async function listFieldDefinitionsForObject(objectId: string): Promise<FieldDefinitionDto[]> {
  const rows = await db
    .select()
    .from(fieldDefinitions)
    .where(eq(fieldDefinitions.objectDefinitionId, objectId))
    .orderBy(asc(fieldDefinitions.sortOrder));

  return rows.map(toDto);
}

export async function createFieldDefinition(
  organizationId: string,
  objectId: string,
  input: CreateFieldInput,
): Promise<CreateFieldResult> {
  const object = await findObjectDefinition(organizationId, objectId);
  if (!object) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  const apiKey = input.apiKey ?? slugify(input.name);

  const [existing] = await db
    .select()
    .from(fieldDefinitions)
    .where(and(eq(fieldDefinitions.objectDefinitionId, objectId), eq(fieldDefinitions.apiKey, apiKey)))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      code: "FIELD_API_KEY_TAKEN",
      message: `A field with apiKey "${apiKey}" already exists on this object`,
    };
  }

  if (input.dataType === "lookup") {
    const target = await findObjectDefinition(organizationId, input.lookupObjectDefinitionId!);
    if (!target || target.isArchived) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "lookupObjectDefinitionId must reference an existing, non-archived object definition in your organization",
      };
    }
  }

  const [created] = await db
    .insert(fieldDefinitions)
    .values({
      objectDefinitionId: objectId,
      apiKey,
      name: input.name,
      dataType: input.dataType,
      isRequired: input.isRequired ?? false,
      isUnique: input.isUnique ?? false,
      isSearchable: input.isSearchable ?? false,
      isReadOnly: input.isReadOnly ?? false,
      defaultValue: input.defaultValue,
      options: input.options,
      lookupObjectDefinitionId: input.lookupObjectDefinitionId,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  await incrementSchemaVersion(objectId);

  return { ok: true, field: toDto(created) };
}

export async function updateFieldDefinition(
  organizationId: string,
  objectId: string,
  fieldId: string,
  input: UpdateFieldInput,
): Promise<UpdateFieldResult> {
  const object = await findObjectDefinition(organizationId, objectId);
  if (!object) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  const [target] = await db
    .select()
    .from(fieldDefinitions)
    .where(and(eq(fieldDefinitions.id, fieldId), eq(fieldDefinitions.objectDefinitionId, objectId)))
    .limit(1);

  if (!target) {
    return { ok: false, code: "FIELD_NOT_FOUND", message: "Field definition not found" };
  }

  const [updated] = await db
    .update(fieldDefinitions)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.isUnique !== undefined ? { isUnique: input.isUnique } : {}),
      ...(input.isSearchable !== undefined ? { isSearchable: input.isSearchable } : {}),
      ...(input.isReadOnly !== undefined ? { isReadOnly: input.isReadOnly } : {}),
      ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(fieldDefinitions.id, fieldId))
    .returning();

  await incrementSchemaVersion(objectId);

  return { ok: true, field: toDto(updated) };
}

export async function deleteFieldDefinition(
  organizationId: string,
  objectId: string,
  fieldId: string,
): Promise<DeleteFieldResult> {
  const object = await findObjectDefinition(organizationId, objectId);
  if (!object) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  const [target] = await db
    .select()
    .from(fieldDefinitions)
    .where(and(eq(fieldDefinitions.id, fieldId), eq(fieldDefinitions.objectDefinitionId, objectId)))
    .limit(1);

  if (!target) {
    return { ok: false, code: "FIELD_NOT_FOUND", message: "Field definition not found" };
  }

  const [inUse] = await db
    .select({ id: records.id })
    .from(records)
    .where(and(eq(records.objectDefinitionId, objectId), sql`${records.data} ->> ${target.apiKey} IS NOT NULL`))
    .limit(1);

  if (inUse) {
    return {
      ok: false,
      code: "FIELD_IN_USE",
      message: `Field "${target.apiKey}" is in use by existing records and cannot be deleted`,
    };
  }

  await db.delete(fieldDefinitions).where(eq(fieldDefinitions.id, fieldId));
  await incrementSchemaVersion(objectId);

  return { ok: true };
}
