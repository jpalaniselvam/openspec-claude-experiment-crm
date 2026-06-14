## Context

This is the first feature being built in the CRM monorepo. `apps/web` currently contains only a freshly scaffolded Angular 20 app; there is no `apps/backend`, no database, and no auth. Per `CLAUDE.md`, the backend must be Express 5 + Drizzle/pg + Zod + Helmet + Better Auth + Pino, organized by resource, with a standard JSON envelope, and everything installed via pnpm workspaces.

The product requirement is a simple multi-tenant login: a user authenticates with **Organization ID + Username + Password**. No social login, MFA, SSO, or SCIM for now.

## Goals / Non-Goals

**Goals:**
- Define a minimal multi-tenant data model (`organizations`, `users`) where usernames are unique per organization, not globally.
- Provide a login endpoint that validates org + username + password and issues a server-side session (cookie-based) using Better Auth's session/storage primitives.
- Provide session check and logout endpoints.
- Build an Angular Material login screen with client-side validation and clear (but non-enumerable) error feedback.
- Add an `AuthService` + route guards so the rest of the app can rely on "is the user logged in" and "which org/user am I".

**Non-Goals:**
- Social login, SSO/SAML/OIDC, MFA, SCIM provisioning — explicitly deferred.
- Self-service signup, invitations, or password reset flows.
- Role-based authorization / permissions beyond "authenticated or not".
- Rate limiting / account lockout policy (noted as a follow-up risk).
- Multi-session/device management UI.

## Decisions

### 1. Org identification: human-readable slug, not UUID
The "Organization ID" the user types is a short, unique, human-readable **slug** (e.g. `acme`), stored as `organizations.slug` (unique). Internal primary keys remain UUIDs. Rationale: typing a UUID at login is unrealistic; a slug is memorable and still tenant-scoped. Alternative considered: subdomain-based tenant resolution — rejected for now as it adds infra/DNS complexity not needed for "keep it simple".

### 2. Data model
- `organizations`: `id (uuid pk)`, `slug (unique, not null)`, `name`, timestamps.
- `users`: `id (uuid pk)`, `organization_id (fk -> organizations.id)`, `username (not null)`, `password_hash`, `display_name`, `status` enum (`active` | `disabled`), timestamps.
- Composite uniqueness: `(organization_id, username)` is unique, allowing the same username in different organizations.
- Defined and migrated with Drizzle ORM under `apps/backend`.

### 3. Better Auth usage
Better Auth's default email/password flow assumes a globally unique identifier. To keep org-scoped usernames while reusing Better Auth's secure password hashing and session/cookie infrastructure:
- The backend exposes its own `POST /api/auth/login` route (not Better Auth's default email/password endpoint).
- This route: validates the payload with Zod → looks up the organization by `slug` → looks up the user by `(organization_id, username)` → verifies the password using Better Auth's password hashing utilities → on success, creates a session record via Better Auth's session adapter (Drizzle/Postgres) and sets the session cookie.
- `GET /api/auth/session` and `POST /api/auth/logout` use Better Auth's session middleware/adapter directly to validate/destroy the cookie-based session.
- Better Auth's Drizzle adapter generates the `session`/`account` tables alongside our `organizations`/`users` tables.

Alternative considered: write fully custom session handling (signed JWT cookie). Rejected — Better Auth already provides hardened session storage, rotation, and cookie handling, and the project's stack mandates it; only the *credential lookup* needs to be custom for multi-tenancy.

### 4. Non-enumerable error responses
To avoid leaking whether an organization slug or username exists, `POST /api/auth/login` returns the **same** generic error (`INVALID_CREDENTIALS`, "Invalid organization ID, username, or password") for: unknown org, unknown username, and wrong password. A **disabled account** (`status = 'disabled'`) returns a distinct `ACCOUNT_DISABLED` error ("Your account has been disabled. Contact your administrator.") — this is acceptable because it only fires for credential combinations that are otherwise valid, so it doesn't help an attacker find valid orgs/usernames faster than brute-forcing already would.

### 5. Response envelope & validation
All `/api/auth/*` responses use the standard envelope `{ success: boolean, data?: ..., error?: { code, message } }`. All inputs (`organizationSlug`, `username`, `password`) are validated with a shared Zod schema; validation failures return `400` with `error.code = "VALIDATION_ERROR"`.

### 6. Frontend structure
- `apps/web`: add `@angular/material` + `@angular/cdk` via pnpm.
- New `auth` feature area: `login` component (standalone, reactive form, Material `mat-card`/`mat-form-field`/`mat-button`), `AuthService` (login/logout/session-check, exposes auth state via a signal), `authGuard` (CanActivateFn redirecting unauthenticated users to `/login`), and `loginGuard`/redirect for authenticated users hitting `/login`.
- `AuthService` calls `GET /api/auth/session` on app bootstrap (via an APP_INITIALIZER or a route resolver) to restore session state on page refresh.
- HTTP requests to the backend are made with `withCredentials: true` so the session cookie is sent; backend CORS is configured to allow the Angular dev origin with credentials.

## Risks / Trade-offs

- **[Risk]** No rate limiting/lockout → brute-force risk on login endpoint. → **Mitigation**: out of scope for this change, but the design isolates login in a single route so throttling middleware can be added later without reshaping the API.
- **[Risk]** Cookie-based sessions across separate frontend/backend origins require correct CORS + cookie `SameSite`/`Secure` config, easy to misconfigure in dev vs prod. → **Mitigation**: centralize CORS/cookie config in one backend config module; document required env vars in `.env.example`.
- **[Risk]** Slug-based org identification means org slugs become a stable public-ish identifier (users must know/remember it). → **Mitigation**: acceptable for "keep it simple"; can add org discovery (e.g. by email domain) in a future change.
- **[Risk]** No password reset means a locked-out user has no self-service recovery. → **Mitigation**: explicitly accepted as out of scope; document as a known follow-up.

## Migration Plan

- Add Drizzle schema + generated migration for `organizations` and `users`, plus Better Auth's Drizzle-generated `session`/`account` tables.
- Run migrations before app start (per `CLAUDE.md` deployment notes).
- Add a local dev seed script that creates one sample organization and one active user, so the login screen can be exercised end-to-end in development.
- Greenfield project — no existing data to migrate.

## Open Questions

- None blocking; org-discovery (e.g., resolving org from email domain instead of typing a slug) is left for a future change if needed.
