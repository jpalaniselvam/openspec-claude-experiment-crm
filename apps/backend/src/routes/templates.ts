import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { applyTemplate, listTemplates } from "../services/template-service.js";

export const templatesRouter = Router();

templatesRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    return sendSuccess(res, listTemplates());
  } catch (err) {
    return next(err);
  }
});

templatesRouter.post<{ key: string }>("/:key/apply", requireAdmin, async (req, res, next) => {
  try {
    const result = await applyTemplate(req.currentUser!.organizationId, req.params.key);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.result);
  } catch (err) {
    return next(err);
  }
});
