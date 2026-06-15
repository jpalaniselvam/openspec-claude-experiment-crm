import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { fieldDefinitions, objectDefinitions } from "../db/schema/index.js";
import { slugify } from "../lib/slugify.js";
import type { FieldDefinitionDto } from "./field-definition-service.js";
import type { CreateObjectInput, UpdateObjectInput } from "../validation/objects.js";

export interface ObjectDefinitionDto {
  id: string;
  apiName: string;
  name: string;
  pluralName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  schemaVersion: number;
  isArchived: boolean;
  displayFieldApiKey: string | null;
}

export type CreateObjectResult =
  | { ok: true; object: ObjectDefinitionDto }
  | { ok: false; code: "OBJECT_API_NAME_TAKEN"; message: string };

export type GetObjectResult =
  | { ok: true; object: ObjectDefinitionDto }
  | { ok: false; code: "OBJECT_NOT_FOUND"; message: string };

export type UpdateObjectResult =
  | { ok: true; object: ObjectDefinitionDto }
  | { ok: false; code: "OBJECT_NOT_FOUND"; message: string }
  | { ok: false; code: "VALIDATION_ERROR"; message: string };

function toDto(row: typeof objectDefinitions.$inferSelect): ObjectDefinitionDto {
  return {
    id: row.id,
    apiName: row.apiName,
    name: row.name,
    pluralName: row.pluralName,
    description: row.description,
    icon: row.icon,
    color: row.color,
    schemaVersion: row.schemaVersion,
    isArchived: row.isArchived,
    displayFieldApiKey: row.displayFieldApiKey,
  };
}

const DISPLAY_FIELD_DATA_TYPES = new Set(["text", "long_text"]);

/**
 * Resolves the apiKey of the field used to display a human-readable label for a record of this object:
 * the explicit `displayFieldApiKey`, or the first `text`/`long_text` field by `sortOrder`, or `null`.
 */
export function resolveEffectiveDisplayField(
  object: ObjectDefinitionDto,
  fields: FieldDefinitionDto[],
): string | null {
  if (object.displayFieldApiKey) {
    return object.displayFieldApiKey;
  }

  const candidates = fields
    .filter((field) => DISPLAY_FIELD_DATA_TYPES.has(field.dataType))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return candidates[0]?.apiKey ?? null;
}

export async function listObjectDefinitions(organizationId: string): Promise<ObjectDefinitionDto[]> {
  const rows = await db
    .select()
    .from(objectDefinitions)
    .where(and(eq(objectDefinitions.organizationId, organizationId), eq(objectDefinitions.isArchived, false)))
    .orderBy(asc(objectDefinitions.name));

  return rows.map(toDto);
}

export async function createObjectDefinition(
  organizationId: string,
  input: CreateObjectInput,
): Promise<CreateObjectResult> {
  const apiName = input.apiName ?? slugify(input.name);

  const [existing] = await db
    .select()
    .from(objectDefinitions)
    .where(and(eq(objectDefinitions.organizationId, organizationId), eq(objectDefinitions.apiName, apiName)))
    .limit(1);

  if (existing) {
    return {
      ok: false,
      code: "OBJECT_API_NAME_TAKEN",
      message: `An object with apiName "${apiName}" already exists`,
    };
  }

  const [created] = await db
    .insert(objectDefinitions)
    .values({
      organizationId,
      apiName,
      name: input.name,
      pluralName: input.pluralName,
      description: input.description,
      icon: input.icon,
      color: input.color,
    })
    .returning();

  return { ok: true, object: toDto(created) };
}

export async function getObjectDefinition(organizationId: string, id: string): Promise<GetObjectResult> {
  const [row] = await db
    .select()
    .from(objectDefinitions)
    .where(and(eq(objectDefinitions.id, id), eq(objectDefinitions.organizationId, organizationId)))
    .limit(1);

  if (!row) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  return { ok: true, object: toDto(row) };
}

export async function updateObjectDefinition(
  organizationId: string,
  id: string,
  input: UpdateObjectInput,
): Promise<UpdateObjectResult> {
  const [target] = await db
    .select()
    .from(objectDefinitions)
    .where(and(eq(objectDefinitions.id, id), eq(objectDefinitions.organizationId, organizationId)))
    .limit(1);

  if (!target) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object definition not found" };
  }

  if (input.displayFieldApiKey !== undefined && input.displayFieldApiKey !== null) {
    const [field] = await db
      .select()
      .from(fieldDefinitions)
      .where(
        and(eq(fieldDefinitions.objectDefinitionId, id), eq(fieldDefinitions.apiKey, input.displayFieldApiKey)),
      )
      .limit(1);

    if (!field || !DISPLAY_FIELD_DATA_TYPES.has(field.dataType)) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "displayFieldApiKey must reference a text or long_text field on this object",
      };
    }
  }

  const [updated] = await db
    .update(objectDefinitions)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.pluralName !== undefined ? { pluralName: input.pluralName } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      ...(input.displayFieldApiKey !== undefined ? { displayFieldApiKey: input.displayFieldApiKey } : {}),
      updatedAt: new Date(),
    })
    .where(eq(objectDefinitions.id, id))
    .returning();

  return { ok: true, object: toDto(updated) };
}

export async function resolveObjectByApiName(organizationId: string, apiName: string): Promise<GetObjectResult> {
  const [row] = await db
    .select()
    .from(objectDefinitions)
    .where(
      and(
        eq(objectDefinitions.organizationId, organizationId),
        eq(objectDefinitions.apiName, apiName),
        eq(objectDefinitions.isArchived, false),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, code: "OBJECT_NOT_FOUND", message: "Object not found" };
  }

  return { ok: true, object: toDto(row) };
}
