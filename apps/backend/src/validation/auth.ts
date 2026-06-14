import { z } from "zod";

export const loginSchema = z.object({
  organizationSlug: z.string().trim().min(1, "Organization ID is required"),
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
