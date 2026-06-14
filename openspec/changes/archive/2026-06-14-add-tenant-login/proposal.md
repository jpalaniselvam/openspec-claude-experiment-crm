## Why

The CRM currently has only a scaffolded Angular frontend and no backend or authentication. Every other feature in the CRM depends on knowing which organization (tenant) and which user is making a request, so a simple, secure, organization-scoped login is the foundational capability the rest of the system builds on.

## What Changes

- Bootstrap a new Express 5 backend (`apps/backend`) with Postgres via Drizzle ORM, Helmet, Pino logging, and Zod request validation, per the project's backend conventions.
- Add a multi-tenant data model: `organizations` and `users` tables, where each user belongs to exactly one organization and has a username unique within that organization.
- Integrate Better Auth for credential-based session authentication, scoped to a tenant (organization id + username + password).
- Add backend endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, returning a standard success/error JSON envelope.
- Add an Angular login screen (`apps/web`) using Angular Material with fields for Organization ID, Username, and Password, including client-side validation and error display (invalid org/credentials, locked/disabled account).
- Add an Angular `AuthService` and route guard so unauthenticated users are redirected to `/login`, and authenticated users land on a placeholder dashboard route after login.
- Explicitly out of scope (for now): social login, SSO/SAML/OIDC federation, multi-factor authentication, SCIM provisioning, self-service signup, and password reset flows.

## Capabilities

### New Capabilities
- `tenant-auth`: Backend multi-tenant authentication — organization/user data model, credential validation scoped to an organization, session issuance and validation, login/logout endpoints.
- `login-ui`: Frontend login experience — Angular Material login form (org id, username, password), validation, error handling, auth state/session service, and route guarding for authenticated areas.

### Modified Capabilities
(none — greenfield project, no existing specs)

## Impact

- **New app**: `apps/backend` (Express 5, TypeScript, Drizzle ORM, pg driver, Better Auth, Pino, Helmet, Zod).
- **Database**: New Postgres schema/migrations for `organizations` and `users`; `DATABASE_URL` env var; `.env.example` updated.
- **Frontend**: `apps/web` — new login feature (component, route, reactive form, `AuthService`, `authGuard`), Angular Material added as a dependency, base layout/route updates in `app.routes.ts`.
- **Dependencies**: New pnpm-managed dependencies added to `apps/backend` (express, drizzle-orm, pg, better-auth, pino, helmet, zod) and `apps/web` (@angular/material, @angular/cdk), all installed via pnpm per workspace rules.
- **Tooling/CI**: New unit tests for the auth service/login flow and integration tests for the login endpoint, runnable via `pnpm test`.
