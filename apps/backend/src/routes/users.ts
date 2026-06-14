import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { createUserSchema, updateUserSchema } from "../validation/users.js";
import { createUser, listUsers, updateUser } from "../services/user-service.js";

export const usersRouter = Router();

usersRouter.use(requireAdmin);

usersRouter.get("/", async (req, res, next) => {
  try {
    const result = await listUsers(req.currentUser!.organizationId);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
});

usersRouter.post("/", async (req, res, next) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await createUser(req.currentUser!.organizationId, parsed.data);

    if (!result.ok) {
      return sendError(res, 409, result.code, result.message);
    }

    return sendSuccess(res, result.user, 201);
  } catch (err) {
    return next(err);
  }
});

usersRouter.patch("/:id", async (req, res, next) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await updateUser(
      req.currentUser!.organizationId,
      req.currentUser!.id,
      req.params.id,
      parsed.data,
    );

    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 400;
      return sendError(res, status, result.code, result.message);
    }

    return sendSuccess(res, result.user);
  } catch (err) {
    return next(err);
  }
});
