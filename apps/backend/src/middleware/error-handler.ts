import type { NextFunction, Request, Response } from "express";
import { sendError } from "../lib/response.js";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  req.log?.error({ err }, "Unhandled error");
  sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
}
