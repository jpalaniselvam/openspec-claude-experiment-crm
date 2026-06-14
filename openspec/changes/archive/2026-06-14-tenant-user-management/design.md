## Context

`add-tenant-login` established the multi-tenant data model (`organizations`, `users`) and Better Auth-backed session login, but explicitly deferred "role-based authorization / permissions beyond authenticated or not" and "invitations". Every user today is created via the dev seed script with no role distinction, so there is no concept of "who is allowed to manage this tenant's users".

This change adds a minimal `admin` / `member` role and a small set of organization-scoped CRUD endpoints + an Angular admin screen so an `admin` user can see, add, and edit the users in their own organization. It builds directly on the existing `users` table, Better Auth username plugin, and `AuthUserDto`/session plumbing from the login feature.

## Goals / Non-Goals

**Goals:**
- Add a `role` (`admin` | `member`, default `member`) to `users`, surfaced on the session/login response.
- Provide `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, all scoped to `req.session.user.organizationId` and restricted to callers with `role = admin` via a new `requireAdmin` middleware.
- Provide an Angular `/admin/users` page (list, create dialog, edit role/status) gated by a role-aware route guard, plus a nav entry visible only to admins.
- Update the seed script so the first seeded user per organization is an `admin`.

**Non-Goals:**
- Email invitations, activation links, or any email delivery.
- Self-service signup, password reset, or "forgot password" flows.
- Granular/custom permissions, permission groups, or more than two roles.
- Audit logging of who changed what.
- Cross-organization administration (e.g., a super-admin managing multiple tenants).

## Decisions

### 1. `role` as a Better Auth `additionalField`, mirroring `status`
Add `role` to the `users` table as a Postgres enum (`admin` | `member`, `not null default 'member'`), declared the same way `status` already is: a Drizzle column plus a Better Auth `user.additionalFields.role` entry (`type: "string"`, `defaultValue: "member"`, `input: true`). `input: true` (unlike `status`) lets the admin-create endpoint pass `role` straight through `auth.api.signUpEmail`, since the whole point of `POST /api/users` is to let an admin set the new user's role at creation time.

Alternative considered: a separate `roles`/`memberships` table for future extensibility (multiple roles per user, org-level permission sets). Rejected as premature — a single enum column matches the current two-role requirement and is a straightforward column-add migration later if richer RBAC is needed.

### 2. `requireAdmin` middleware: session + role check in one place
A single Express middleware `requireAdmin(req, res, next)`:
1. Calls `auth.api.getSession(fromNodeHeaders(req.headers))`. No session → `401 UNAUTHORIZED`.
2. Reads `session.user.role` (via the same additional-fields cast pattern used in `auth-service.ts`). Not `"admin"` → `403 FORBIDDEN`.
3. On success, attaches `req.currentUser = { id, organizationId, role }` (a small typed extension of `Request`) so route handlers don't re-fetch the session.

Applied to all three new routes. This keeps authorization in one tested module rather than duplicated per-handler `if` checks.

Alternative considered: a generic `requireRole(role)` factory for future roles beyond `admin`/`member`. Rejected for now (YAGNI with only two roles) but the function signature (`requireAdmin` wrapping a session+role check) makes it trivial to generalize later without changing call sites' behavior.

### 3. Endpoint shapes and org scoping
- `GET /api/users` → list of `{ id, username (displayUsername), displayName, email, role, status }` for `users.organizationId = req.currentUser.organizationId`, ordered by `displayUsername`.
- `POST /api/users` → Zod-validated body `{ username, displayName, email, password, role }`. Implemented via `auth.api.signUpEmail` (same pattern as `seed.ts`), with `organizationId` from `req.currentUser` and composite username `<orgSlug>:<username>`. On Better Auth's `USERNAME_IS_ALREADY_TAKEN` / `USER_ALREADY_EXISTS` errors, respond `409 USERNAME_TAKEN`.
- `PATCH /api/users/:id` → Zod-validated partial body `{ displayName?, role?, status? }`. Loads the target user, `404 NOT_FOUND` if it doesn't exist or belongs to a different organization, then `db.update(users)`.

All three live in `routes/users.ts` + `services/user-service.ts` + `validation/users.ts`, following the existing `routes/auth.ts` / `services/auth-service.ts` / `validation/auth.ts` split, and use the shared `sendSuccess`/`sendError` envelope.

### 4. Guard against self-lockout
`PATCH /api/users/:id` rejects (`400 SELF_MODIFICATION`) any request where `id === req.currentUser.id` and the body changes `role` or `status`. This prevents an admin from accidentally demoting or disabling their own (possibly only) admin account through this endpoint.

Alternative considered: enforce "at least one admin per org" via a query checking remaining admins. Rejected as more complex than needed — blocking self-modification is simpler, covers the common accidental-lockout case, and a second admin can always fix another admin's role if truly needed.

### 5. Frontend: role on session, `adminGuard`, lazy admin route
- Extend `AuthUserDto` (backend) and the Angular `AuthService` user model with `role: "admin" | "member"`, populated from `/api/auth/session` and `/api/auth/login` responses (already returned by `getCurrentUser`/`loginWithCredentials` — both just need the extra field).
- Add `adminGuard` (`CanActivateFn`) alongside the existing `authGuard`: requires an authenticated session *and* `role === "admin"`, redirecting non-admins to the dashboard.
- Add a lazy-loaded `/admin/users` route (standalone component) guarded by `[authGuard, adminGuard]`, plus a `UsersService` (Angular `HttpClient`, `withCredentials: true`) wrapping the three endpoints.
- UI: a Material table listing users with inline `mat-select` for role and status, and a "Add user" button opening a `mat-dialog` reactive form (username, display name, email, password, role). A nav link to "Users" is shown only when `AuthService`'s current user has `role === "admin"`.

## Risks / Trade-offs

- **[Risk]** Two-role model may not fit future needs (e.g., billing admin vs. user admin). → **Mitigation**: enum column is a cheap migration to extend later; `requireAdmin` is isolated so authorization logic doesn't spread across handlers.
- **[Risk]** `POST /api/users` sets a plaintext initial password chosen by the admin (no email invite flow), which the admin must communicate to the new user out-of-band. → **Mitigation**: accepted for "keep it simple"; documented as a follow-up once email delivery exists. Password still goes through Better Auth's hashing.
- **[Risk]** Without "at least one admin" enforcement beyond self-lockout protection, a second admin could still disable/demote the *only other* admin, leaving zero admins. → **Mitigation**: accepted as an edge case; out of scope for this change, can be added as a count-based check later if it becomes a real issue.
- **[Risk]** Adding `role` as a Better Auth `additionalField` with `input: true` means any caller of `signUpEmail` could in principle set `role` — only `POST /api/users` (behind `requireAdmin`) calls it, but this must be kept in mind if `signUpEmail` is ever exposed elsewhere (e.g., a future self-service signup). → **Mitigation**: noted here for future authors; self-service signup is explicitly out of scope for now.

## Migration Plan

- Add a Drizzle migration for the new `user_role` enum (`admin`, `member`) and the `users.role` column (`not null default 'member'`).
- Update `apps/backend/src/lib/auth.ts` to declare `role` in `user.additionalFields`.
- Update `apps/backend/src/scripts/seed.ts` to pass `role: "admin"` for the first seed user (`jane`) and leave the rest as default `member`.
- Existing rows backfill to `member` via the column default; no data migration needed for the (empty/dev-only) current dataset.
- Rollback: drop the `role` column and `user_role` enum; revert the `additionalFields` entry. No other schema depends on `role`.

## Open Questions

- None blocking. If a future change adds self-service signup, revisit whether `role` should remain `input: true` on `signUpEmail` or be moved behind a separate admin-only code path.
