## Why

Organizations can now log in (`add-tenant-login`), but there is no way for a tenant to manage who has access. Every user is created out-of-band (seed script) with no role distinction, so an organization admin cannot add teammates, change a teammate's role, or deactivate someone who has left — all of which are basic prerequisites for a multi-user CRM tenant.

## What Changes

- Add a `role` to the `users` table (`admin` | `member`, default `member`) so an organization has at least one admin who can manage other users.
- Add backend endpoints, scoped to the caller's organization and restricted to `admin` users:
  - `GET /api/users` — list users in the organization.
  - `POST /api/users` — create a new user in the organization (username, display name, email, initial password, role).
  - `PATCH /api/users/:id` — update a user's display name, role, and/or status (`active`/`disabled`).
- Add an `requireAdmin` authorization middleware that checks the current session's user has `role = admin` in their organization, returning a `403 FORBIDDEN` envelope otherwise.
- Add an Angular "Users" admin screen (list, add-user dialog, edit role/status) under a new admin-only route, guarded by a role-aware route guard.
- Update the dev seed script so the seeded user is created with `role = admin`, giving every seeded organization a starting admin.
- Explicitly out of scope: email-based invitations/activation links, self-service signup, password reset/self-service password change, audit logging of user-management actions, granular permissions beyond `admin`/`member`.

## Capabilities

### New Capabilities
- `tenant-user-management`: Backend organization-scoped user administration — `role` field on users, admin-only list/create/update endpoints, and `requireAdmin` authorization middleware.
- `user-management-ui`: Frontend admin experience — Angular "Users" page (list, create, edit role/status), admin-only route guard, and navigation entry visible only to admins.

### Modified Capabilities
(none — no specs have been archived to `openspec/specs/` yet)

## Impact

- **Database**: New `role` enum column (`admin` | `member`, default `member`) on `users`, plus a Drizzle migration. Existing seeded users need the column backfilled (handled via migration default + seed script update).
- **Backend**: New `routes/users.ts`, `services/user-service.ts`, `validation/users.ts`; new `requireAdmin` middleware applied to the new routes; `AuthUserDto`/session response extended to include `role` so the frontend can branch on it.
- **Frontend**: New `admin/users` feature area in `apps/web` (list component, create-user dialog, edit dialog), a role-aware `adminGuard`, a new `/admin/users` route, and a conditional nav link shown only to admins.
- **Seed/dev data**: `apps/backend/src/scripts/seed.ts` updated to set `role: "admin"` on the seeded user.
- **Tests**: Unit tests for `user-service` and `requireAdmin`; integration tests for `GET/POST /api/users` and `PATCH /api/users/:id` covering admin/non-admin access and validation errors.
