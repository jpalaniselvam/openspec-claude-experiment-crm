import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { createObjectSchema, updateObjectSchema } from "../validation/objects.js";
import {
  createObjectDefinition,
  getObjectDefinition,
  listObjectDefinitions,
  updateObjectDefinition,
} from "../services/object-definition-service.js";

export const objectsRouter = Router();

objectsRouter.use(requireAdmin);

objectsRouter.get("/", async (req, res, next) => {
  try {
    const result = await listObjectDefinitions(req.currentUser!.organizationId);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
});

objectsRouter.post("/", async (req, res, next) => {
  const parsed = createObjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await createObjectDefinition(req.currentUser!.organizationId, parsed.data);

    if (!result.ok) {
      return sendError(res, 409, result.code, result.message);
    }

    return sendSuccess(res, result.object, 201);
  } catch (err) {
    return next(err);
  }
});

objectsRouter.get("/:id", async (req, res, next) => {
  try {
    const result = await getObjectDefinition(req.currentUser!.organizationId, req.params.id);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.object);
  } catch (err) {
    return next(err);
  }
});

objectsRouter.patch("/:id", async (req, res, next) => {
  const parsed = updateObjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await updateObjectDefinition(req.currentUser!.organizationId, req.params.id, parsed.data);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.object);
  } catch (err) {
    return next(err);
  }
});
