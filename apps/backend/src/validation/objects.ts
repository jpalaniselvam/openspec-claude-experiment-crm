import { z } from "zod";

const apiNameSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]*$/, "apiName must be lowercase snake_case (e.g. doctor, hospital_record)");

export const createObjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  pluralName: z.string().trim().min(1, "Plural name is required"),
  apiName: apiNameSchema.optional(),
  description: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
});

export type CreateObjectInput = z.infer<typeof createObjectSchema>;

export const updateObjectSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    pluralName: z.string().trim().min(1, "Plural name is required").optional(),
    description: z.string().trim().optional(),
    icon: z.string().trim().optional(),
    color: z.string().trim().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateObjectInput = z.infer<typeof updateObjectSchema>;
