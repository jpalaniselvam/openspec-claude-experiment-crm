## 1. Database & schema

- [x] 1.1 Add `user_role` Postgres enum (`admin`, `member`) and a `role` column (`not null default 'member'`) to the `users` table in `apps/backend/src/db/schema/users.ts`.
- [x] 1.2 Generate the Drizzle migration for the new enum/column and apply it locally.
- [x] 1.3 Add `role` to `user.additionalFields` in `apps/backend/src/lib/auth.ts` (`type: "string"`, `defaultValue: "member"`, `input: true`).

## 2. Backend authorization

- [x] 2.1 Add a typed `requireAdmin` Express middleware (e.g. `apps/backend/src/middleware/require-admin.ts`) that loads the session via `auth.api.getSession`, returns `401 UNAUTHORIZED` if absent, `403 FORBIDDEN` if `role !== "admin"`, and otherwise attaches `req.currentUser = { id, organizationId, role }`.
- [x] 2.2 Extend `AuthUserDto` and `getCurrentUser`/`loginWithCredentials` in `apps/backend/src/services/auth-service.ts` to include `role`, so `/api/auth/session` and `/api/auth/login` return it.
- [x] 2.3 Unit tests for `requireAdmin` (no session → 401, member session → 403, admin session → calls `next()` with `req.currentUser` set).

## 3. Backend user-management endpoints

- [x] 3.1 Add `apps/backend/src/validation/users.ts` with Zod schemas: `createUserSchema` (`username`, `displayName`, `email`, `password`, `role`) and `updateUserSchema` (optional `displayName`, `role`, `status`).
- [x] 3.2 Add `apps/backend/src/services/user-service.ts` with `listUsers(organizationId)`, `createUser(organizationId, organizationSlug, input)`, and `updateUser(organizationId, currentUserId, targetUserId, input)`, implementing the org-scoping, duplicate-username (`USERNAME_TAKEN`), not-found (`NOT_FOUND`), and self-modification (`SELF_MODIFICATION`) rules from the spec.
- [x] 3.3 Add `apps/backend/src/routes/users.ts` with `GET /`, `POST /`, and `PATCH /:id`, each behind `requireAdmin`, validating bodies with the schemas from 3.1 and returning results via `sendSuccess`/`sendError`.
- [x] 3.4 Mount the new router at `/api/users` in `apps/backend/src/app.ts`.

## 4. Backend tests

- [x] 4.1 Unit tests for `user-service` covering: list scoping to organization, create success, duplicate-username conflict, update role/status success, update on another org's user (`NOT_FOUND`), and self-modification rejection.
- [x] 4.2 Integration tests (`apps/backend/src/routes/users.test.ts`) for `GET/POST /api/users` and `PATCH /api/users/:id` covering admin access, member 403, unauthenticated 401, validation errors, and the scenarios above.

## 5. Frontend auth/role plumbing

- [x] 5.1 Extend the Angular `AuthService` user model with `role: "admin" | "member"` (from `/api/auth/session` and `/api/auth/login`).
- [x] 5.2 Add `adminGuard` (`CanActivateFn`) that requires an authenticated session with `role === "admin"`, redirecting non-admins to the dashboard route.

## 6. Frontend Users page

- [x] 6.1 Add `UsersService` (Angular `HttpClient`, `withCredentials: true`) wrapping `GET /api/users`, `POST /api/users`, and `PATCH /api/users/:id`.
- [x] 6.2 Add a standalone `UsersPage` component rendering a Material table of organization users (username, display name, email, role, status), with role/status controls disabled for the signed-in admin's own row.
- [x] 6.3 Add a "Add user" button + Material dialog component (reactive form: username, display name, email, password, role) that calls `UsersService.createUser` and surfaces validation/`USERNAME_TAKEN` errors inline.
- [x] 6.4 Wire inline role/status edit controls on each row to `UsersService.updateUser`, updating the row on success.
- [x] 6.5 Register the lazy-loaded `/admin/users` route guarded by `[authGuard, adminGuard]` in `app.routes.ts`.
- [x] 6.6 Add a "Users" nav link visible only when the signed-in user's `role === "admin"`.

## 7. Frontend tests

- [x] 7.1 Tests for `adminGuard` (admin allowed, member redirected, unauthenticated redirected to login).
- [x] 7.2 Tests for the Users page: list rendering, create-user dialog success/validation/duplicate-username error, role/status edit, and own-row controls disabled.

## 8. Seed & dev data

- [x] 8.1 Update `apps/backend/src/scripts/seed.ts` to set `role: "admin"` for the first seeded user (`jane`) and leave others as default `member`.
