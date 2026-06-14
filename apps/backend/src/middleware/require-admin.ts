import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { sendError } from "../lib/response.js";

export interface CurrentUser {
  id: string;
  organizationId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
    }
  }
}

/**
 * Requires an authenticated session whose user has `role = "admin"`.
 * On success, attaches `req.currentUser` so handlers avoid re-fetching the session.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    sendError(res, 401, "UNAUTHORIZED", "No active session");
    return;
  }

  const user = session.user as typeof session.user & { organizationId: string; role: string };

  if (user.role !== "admin") {
    sendError(res, 403, "FORBIDDEN", "This action requires an administrator role");
    return;
  }

  req.currentUser = { id: user.id, organizationId: user.organizationId, role: user.role };
  next();
}
