import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { sendError } from "../lib/response.js";

/**
 * Requires an authenticated session, regardless of role.
 * On success, attaches `req.currentUser` so handlers avoid re-fetching the session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    sendError(res, 401, "UNAUTHORIZED", "No active session");
    return;
  }

  const user = session.user as typeof session.user & { organizationId: string; role: string };

  req.currentUser = { id: user.id, organizationId: user.organizationId, role: user.role };
  next();
}
