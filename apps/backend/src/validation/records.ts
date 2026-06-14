import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { records } from "../db/schema/index.js";
import type { FieldDefinitionDto } from "../services/field-definition-service.js";

export type LookupExistsFn = (
  organizationId: string,
  lookupObjectDefinitionId: string,
  recordId: string,
) => Promise<boolean>;

/** Checks whether a record with `recordId` exists for the lookup's target object, scoped to the organization. */
export async function defaultLookupExists(
  organizationId: string,
  lookupObjectDefinitionId: string,
  recordId: string,
): Promise<boolean> {
  const [match] = await db
    .select({ id: records.id })
    .from(records)
    .where(
      and(
        eq(records.id, recordId),
        eq(records.organizationId, organizationId),
        eq(records.objectDefinitionId, lookupObjectDefinitionId),
      ),
    )
    .limit(1);

  return Boolean(match);
}

function baseSchemaForField(field: FieldDefinitionDto): z.ZodTypeAny {
  switch (field.dataType) {
    case "text":
    case "long_text":
    case "phone":
      return z.string();
    case "email":
      return z.string().email("Invalid email address");
    case "url":
      return z.string().url("Invalid URL");
    case "number":
    case "decimal":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.string().date("Expected an ISO date string (YYYY-MM-DD)");
    case "datetime":
      return z.string().datetime("Expected an ISO datetime string");
    case "picklist":
      return z.enum((field.options ?? []) as [string, ...string[]]);
    case "lookup":
      return z.string().uuid("Expected a UUID");
    default:
      return z.unknown();
  }
}

/**
 * Builds a Zod schema for a record's `data` based on the object's current field definitions.
 * `lookupExists` is injectable so callers (and tests) can avoid hitting the database.
 */
export function buildRecordSchema(
  organizationId: string,
  fieldDefinitions: FieldDefinitionDto[],
  lookupExists: LookupExistsFn = defaultLookupExists,
): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fieldDefinitions) {
    let schema = baseSchemaForField(field);

    if (field.dataType === "lookup" && field.lookupObjectDefinitionId) {
      const lookupObjectDefinitionId = field.lookupObjectDefinitionId;
      schema = schema.superRefine(async (value, ctx) => {
        const exists = await lookupExists(organizationId, lookupObjectDefinitionId, value as string);
        if (!exists) {
          ctx.addIssue({ code: "custom", message: `Referenced record not found for field "${field.apiKey}"` });
        }
      });
    }

    shape[field.apiKey] = field.isRequired ? schema : schema.optional().nullable();
  }

  return z.object(shape).strict();
}
