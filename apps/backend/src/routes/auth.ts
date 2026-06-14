import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { sendError, sendSuccess } from "../lib/response.js";
import { loginSchema } from "../validation/auth.js";
import { getCurrentUser, loginWithCredentials, logout } from "../services/auth-service.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const { organizationSlug, username, password } = parsed.data;

  try {
    const result = await loginWithCredentials(organizationSlug, username, password);

    if (!result.ok) {
      const status = result.code === "ACCOUNT_DISABLED" ? 403 : 401;
      return sendError(res, status, result.code, result.message);
    }

    for (const cookie of result.setCookieHeaders) {
      res.appendHeader("Set-Cookie", cookie);
    }

    return sendSuccess(res, result.user);
  } catch (err) {
    return next(err);
  }
});

authRouter.get("/session", async (req, res, next) => {
  try {
    const result = await getCurrentUser(fromNodeHeaders(req.headers));

    if (!result.ok) {
      return sendError(res, 401, "UNAUTHORIZED", "No active session");
    }

    return sendSuccess(res, result.user);
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const cookies = await logout(fromNodeHeaders(req.headers));

    for (const cookie of cookies) {
      res.appendHeader("Set-Cookie", cookie);
    }

    return sendSuccess(res, {});
  } catch (err) {
    return next(err);
  }
});
