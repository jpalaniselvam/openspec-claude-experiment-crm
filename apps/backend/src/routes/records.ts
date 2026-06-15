import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { sendError, sendSuccess } from "../lib/response.js";
import { resolveObjectByApiName, type ObjectDefinitionDto } from "../services/object-definition-service.js";
import { createRecord, deleteRecord, getRecord, listRecords, listRelatedRecords, updateRecord } from "../services/record-service.js";

export const recordsRouter = Router();

recordsRouter.use(requireAuth);

async function resolveObject<P extends { objectApiName: string }>(
  req: Request<P>,
  res: Response,
): Promise<ObjectDefinitionDto | null> {
  const result = await resolveObjectByApiName(req.currentUser!.organizationId, req.params.objectApiName);

  if (!result.ok) {
    sendError(res, 404, result.code, result.message);
    return null;
  }

  return result.object;
}

recordsRouter.get<{ objectApiName: string }>("/:objectApiName", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const items = await listRecords(req.currentUser!.organizationId, object);
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
});

recordsRouter.post<{ objectApiName: string }>("/:objectApiName", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const result = await createRecord(req.currentUser!.organizationId, object, req.body);

    if (!result.ok) {
      return sendError(res, 400, result.code, result.message);
    }

    return sendSuccess(res, result.record, 201);
  } catch (err) {
    return next(err);
  }
});

recordsRouter.get<{ objectApiName: string; id: string }>("/:objectApiName/:id", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const result = await getRecord(req.currentUser!.organizationId, object, req.params.id);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, result.record);
  } catch (err) {
    return next(err);
  }
});

recordsRouter.get<{ objectApiName: string; id: string }>("/:objectApiName/:id/related", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const existing = await getRecord(req.currentUser!.organizationId, object, req.params.id);
    if (!existing.ok) {
      return sendError(res, 404, existing.code, existing.message);
    }

    const related = await listRelatedRecords(req.currentUser!.organizationId, object, req.params.id);
    return sendSuccess(res, { related });
  } catch (err) {
    return next(err);
  }
});

recordsRouter.put<{ objectApiName: string; id: string }>("/:objectApiName/:id", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const result = await updateRecord(req.currentUser!.organizationId, object, req.params.id, req.body);

    if (!result.ok) {
      const status = result.code === "RECORD_NOT_FOUND" ? 404 : 400;
      return sendError(res, status, result.code, result.message);
    }

    return sendSuccess(res, result.record);
  } catch (err) {
    return next(err);
  }
});

recordsRouter.delete<{ objectApiName: string; id: string }>("/:objectApiName/:id", async (req, res, next) => {
  try {
    const object = await resolveObject(req, res);
    if (!object) return;

    const result = await deleteRecord(req.currentUser!.organizationId, object, req.params.id);

    if (!result.ok) {
      return sendError(res, 404, result.code, result.message);
    }

    return sendSuccess(res, {});
  } catch (err) {
    return next(err);
  }
});
