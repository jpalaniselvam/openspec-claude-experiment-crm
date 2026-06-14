import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member"]);
export const userStatusSchema = z.enum(["active", "disabled"]);

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  displayName: z.string().trim().min(1, "Display name is required"),
  email: z.string().trim().min(1, "Email is required").email("Email must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema.default("member"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(1, "Display name is required").optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((data) => data.displayName !== undefined || data.role !== undefined || data.status !== undefined, {
    message: "At least one of displayName, role, or status must be provided",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
