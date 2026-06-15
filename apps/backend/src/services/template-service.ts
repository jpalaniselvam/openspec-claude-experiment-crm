import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { fieldDefinitions, objectDefinitions } from "../db/schema/index.js";
import { getTemplate, listTemplateSummaries, type TemplateSummary } from "../templates/index.js";
import type { TemplateObject } from "../templates/types.js";

export function listTemplates(): TemplateSummary[] {
  return listTemplateSummaries();
}

export interface CreatedTemplateObject {
  apiName: string;
  id: string;
  fieldsCreated: string[];
  fieldsSkipped: Array<{ apiKey: string; reason: "LOOKUP_TARGET_ARCHIVED" }>;
}

export interface SkippedTemplateObject {
  apiName: string;
  reason: "OBJECT_ALREADY_EXISTS";
}

export interface ApplyTemplateResultData {
  templateKey: string;
  created: CreatedTemplateObject[];
  skipped: SkippedTemplateObject[];
}

export type ApplyTemplateResult =
  | { ok: true; result: ApplyTemplateResultData }
  | { ok: false; code: "TEMPLATE_NOT_FOUND"; message: string };

export async function applyTemplate(organizationId: string, key: string): Promise<ApplyTemplateResult> {
  const template = getTemplate(key);
  if (!template) {
    return { ok: false, code: "TEMPLATE_NOT_FOUND", message: `Unknown template "${key}"` };
  }

  const apiNames = template.objects.map((object) => object.apiName);

  const result = await db.transaction(async (tx) => {
    const existingRows = await tx
      .select({
        id: objectDefinitions.id,
        apiName: objectDefinitions.apiName,
        isArchived: objectDefinitions.isArchived,
      })
      .from(objectDefinitions)
      .where(and(eq(objectDefinitions.organizationId, organizationId), inArray(objectDefinitions.apiName, apiNames)));

    const existingByApiName = new Map(existingRows.map((row) => [row.apiName, { id: row.id, isArchived: row.isArchived }]));

    const skipped: SkippedTemplateObject[] = [];
    const apiNameToId = new Map<string, string>();
    for (const [apiName, existing] of existingByApiName) {
      apiNameToId.set(apiName, existing.id);
    }

    const newlyCreated: Array<{ templateObject: TemplateObject; id: string }> = [];

    for (const templateObject of template.objects) {
      const existing = existingByApiName.get(templateObject.apiName);
      if (existing) {
        skipped.push({ apiName: templateObject.apiName, reason: "OBJECT_ALREADY_EXISTS" });
        continue;
      }

      const [row] = await tx
        .insert(objectDefinitions)
        .values({
          organizationId,
          apiName: templateObject.apiName,
          name: templateObject.name,
          pluralName: templateObject.pluralName,
          description: templateObject.description ?? null,
          icon: templateObject.icon ?? null,
          color: templateObject.color ?? null,
          schemaVersion: 1 + templateObject.fields.length,
          displayFieldApiKey: null,
        })
        .returning({ id: objectDefinitions.id });

      apiNameToId.set(templateObject.apiName, row.id);
      newlyCreated.push({ templateObject, id: row.id });
    }

    const created: CreatedTemplateObject[] = [];

    for (const { templateObject, id } of newlyCreated) {
      const fieldsCreated: string[] = [];
      const fieldsSkipped: Array<{ apiKey: string; reason: "LOOKUP_TARGET_ARCHIVED" }> = [];

      for (const field of templateObject.fields) {
        let lookupObjectDefinitionId: string | null = null;

        if (field.dataType === "lookup") {
          const targetApiName = field.lookupTargetApiName!;
          const targetId = apiNameToId.get(targetApiName);

          if (!targetId) {
            throw new Error(
              `Template "${template.key}" field "${templateObject.apiName}.${field.apiKey}" references unknown lookup target "${targetApiName}"`,
            );
          }

          if (existingByApiName.get(targetApiName)?.isArchived) {
            fieldsSkipped.push({ apiKey: field.apiKey, reason: "LOOKUP_TARGET_ARCHIVED" });
            continue;
          }

          lookupObjectDefinitionId = targetId;
        }

        await tx.insert(fieldDefinitions).values({
          objectDefinitionId: id,
          apiKey: field.apiKey,
          name: field.name,
          dataType: field.dataType,
          isRequired: field.isRequired ?? false,
          isUnique: field.isUnique ?? false,
          isSearchable: field.isSearchable ?? false,
          isReadOnly: field.isReadOnly ?? false,
          defaultValue: field.defaultValue,
          options: field.options,
          lookupObjectDefinitionId,
          sortOrder: field.sortOrder,
        });

        fieldsCreated.push(field.apiKey);
      }

      created.push({ apiName: templateObject.apiName, id, fieldsCreated, fieldsSkipped });
    }

    return { templateKey: template.key, created, skipped };
  });

  return { ok: true, result };
}
