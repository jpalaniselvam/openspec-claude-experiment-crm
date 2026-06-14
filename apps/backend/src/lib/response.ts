import type { Response } from "express";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: ApiError;
};

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(status).json(body);
}

export function sendError(res: Response, status: number, code: string, message: string): Response {
  const body: ApiFailure = { success: false, error: { code, message } };
  return res.status(status).json(body);
}
