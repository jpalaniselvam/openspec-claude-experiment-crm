import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { objectsRouter } from "./routes/objects.js";
import { objectFieldsRouter } from "./routes/object-fields.js";
import { recordsRouter } from "./routes/records.js";
import { templatesRouter } from "./routes/templates.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/objects/:objectId/fields", objectFieldsRouter);
  app.use("/api/objects", objectsRouter);
  app.use("/api/records", recordsRouter);
  app.use("/api/templates", templatesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
