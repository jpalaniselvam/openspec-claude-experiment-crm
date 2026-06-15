import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin.js";
import { requireAuth } from "../middleware/require-auth.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { createFieldSchema, updateFieldSchema } from "../validation/fields.js";
import {
  createFieldDefinition,
  deleteFieldDefinition,
  listFieldDefinitions,
  updateFieldDefinition,
} from "../services/field-definition-service.js";

export const objectFieldsRouter = Router({ mergeParams: true });

objectFieldsRouter.get<{ objectId: string }>("/", requireAuth, async (req, res, next) => {
  try {
    const result = await listFieldDefinitions(req.currentUser!.organizationId, req.params.objectId);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.fields);
  } catch (err) {
    return next(err);
  }
});

objectFieldsRouter.post<{ objectId: string }>("/", requireAdmin, async (req, res, next) => {
  const parsed = createFieldSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await createFieldDefinition(req.currentUser!.organizationId, req.params.objectId, parsed.data);

    if (!result.ok) {
      const status = result.code === "OBJECT_NOT_FOUND" ? 404 : result.code === "FIELD_API_KEY_TAKEN" ? 409 : 400;
      return sendError(res, status, result.code, result.message);
    }

    return sendSuccess(res, result.field, 201);
  } catch (err) {
    return next(err);
  }
});

objectFieldsRouter.patch<{ objectId: string; fieldId: string }>("/:fieldId", requireAdmin, async (req, res, next) => {
  const parsed = updateFieldSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  try {
    const result = await updateFieldDefinition(
      req.currentUser!.organizationId,
      req.params.objectId,
      req.params.fieldId,
      parsed.data,
    );

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.field);
  } catch (err) {
    return next(err);
  }
});

objectFieldsRouter.delete<{ objectId: string; fieldId: string }>("/:fieldId", requireAdmin, async (req, res, next) => {
  try {
    const result = await deleteFieldDefinition(req.currentUser!.organizationId, req.params.objectId, req.params.fieldId);

    if (!result.ok) {
      const status = result.code === "FIELD_IN_USE" ? 409 : 404;
      return sendError(res, status, result.code, result.message);
    }

    return sendSuccess(res, {});
  } catch (err) {
    return next(err);
  }
});
