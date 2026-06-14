import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema/index.js";

/**
 * Better Auth is used only for session/cookie management and password hashing.
 * The `/api/auth/*` HTTP routes are hand-rolled (see src/routes/auth.ts) so we
 * control the request/response shape and org-scoped credential lookup; the
 * username plugin's `/sign-in/username` etc. handlers are invoked via `auth.api`.
 *
 * Org-scoped usernames are mapped onto the plugin's globally-unique `username`
 * field as `<organizationSlug>:<username>`, with the org-local username kept in
 * `displayUsername`.
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      // Composite usernames are "<organizationSlug>:<username>"; allow ":" and "-"
      // in addition to the plugin's default alphanumeric/underscore/dot characters.
      usernameValidator: (value) => /^[a-zA-Z0-9_.:-]+$/.test(value),
    }),
  ],
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: true,
        input: true,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;
