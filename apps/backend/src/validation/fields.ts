import { z } from "zod";

export const fieldDataTypeSchema = z.enum([
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

const apiKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]*$/, "apiKey must be lowercase snake_case (e.g. years_experience)");

export const createFieldSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    apiKey: apiKeySchema.optional(),
    dataType: fieldDataTypeSchema,
    isRequired: z.boolean().optional(),
    isUnique: z.boolean().optional(),
    isSearchable: z.boolean().optional(),
    isReadOnly: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    options: z.array(z.string().trim().min(1)).optional(),
    lookupObjectDefinitionId: z.string().uuid().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => data.dataType !== "picklist" || (data.options !== undefined && data.options.length > 0), {
    message: "options must be a non-empty array when dataType is 'picklist'",
    path: ["options"],
  })
  .refine((data) => data.dataType !== "lookup" || data.lookupObjectDefinitionId !== undefined, {
    message: "lookupObjectDefinitionId is required when dataType is 'lookup'",
    path: ["lookupObjectDefinitionId"],
  });

export type CreateFieldInput = z.infer<typeof createFieldSchema>;

export const updateFieldSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    isRequired: z.boolean().optional(),
    isUnique: z.boolean().optional(),
    isSearchable: z.boolean().optional(),
    isReadOnly: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    options: z.array(z.string().trim().min(1)).optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
