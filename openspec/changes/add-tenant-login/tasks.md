## 1. Backend App Scaffold

- [ ] 1.1 Create `apps/backend` Express 5 + TypeScript app (entrypoint, tsconfig, build/start scripts) following pnpm workspace conventions
- [ ] 1.2 Add backend dependencies via pnpm (express, pg, drizzle-orm, drizzle-kit, better-auth, zod, helmet, pino, pino-http, cors)
- [ ] 1.3 Wire up Helmet, Pino request logging, CORS (allow Angular dev origin with credentials), and JSON body parsing in the Express app
- [ ] 1.4 Add `.env.example` with `DATABASE_URL`, session/auth secret(s), and CORS origin, and document required env vars

## 2. Database Schema & Migrations

- [ ] 2.1 Define Drizzle schema for `organizations` (`id`, `slug` unique, `name`, timestamps)
- [ ] 2.2 Define Drizzle schema for `users` (`id`, `organization_id` FK, `username`, `password_hash`, `display_name`, `status` enum `active`/`disabled`, timestamps) with unique constraint on `(organization_id, username)`
- [ ] 2.3 Configure Better Auth with the Drizzle/Postgres adapter and generate its required `session`/`account` tables/migrations
- [ ] 2.4 Generate and apply Drizzle migrations for all of the above
- [ ] 2.5 Add a dev seed script that creates one sample organization (e.g. slug `acme`) and one active user with a known password for local testing

## 3. Auth Backend (tenant-auth capability)

- [ ] 3.1 Define shared Zod schema for the login payload (`organizationSlug`, `username`, `password`)
- [ ] 3.2 Implement standard JSON response envelope helper (`{ success, data?, error? }`) for use across auth routes
- [ ] 3.3 Implement `POST /api/auth/login`: validate payload, look up organization by slug, look up user by `(organization_id, username)`, verify password hash, check `status` (return `ACCOUNT_DISABLED` if disabled), create Better Auth session + set cookie on success, return `INVALID_CREDENTIALS` for any unknown org/username/wrong password
- [ ] 3.4 Implement `GET /api/auth/session`: validate session cookie via Better Auth, return current user + organization slug, or 401 if missing/invalid
- [ ] 3.5 Implement `POST /api/auth/logout`: invalidate session via Better Auth and clear the cookie (idempotent if no session)
- [ ] 3.6 Add validation-error handling (400 + `VALIDATION_ERROR`) and generic server-error handling (500) using the standard envelope

## 4. Frontend Setup

- [ ] 4.1 Add `@angular/material` and `@angular/cdk` to `apps/web` via pnpm and run Material schematic setup (theme, typography, animations)
- [ ] 4.2 Configure `HttpClient` with `withCredentials: true` for requests to the backend API, and add base API URL via environment config

## 5. Login UI (login-ui capability)

- [ ] 5.1 Create standalone `LoginComponent` at route `/login` with a reactive form (Organization ID, Username, Password) using Material `mat-card`, `mat-form-field`, `mat-input`, and `mat-button`
- [ ] 5.2 Add required-field validators with inline error messages, masked password input, and a disabled/loading state on the submit button while the request is in flight
- [ ] 5.3 On submit, call `AuthService.login()`; on success navigate to the default authenticated route; on `INVALID_CREDENTIALS` show a generic inline error; on `ACCOUNT_DISABLED` show a distinct "account disabled, contact admin" message

## 6. Auth Service & Route Guards

- [ ] 6.1 Implement `AuthService` with `login()`, `logout()`, and `checkSession()` methods calling the backend `/api/auth/*` endpoints, exposing authentication state (user, organization, isAuthenticated) via a signal/observable
- [ ] 6.2 Call `checkSession()` on app bootstrap (e.g. APP_INITIALIZER or initial route resolver) to restore session state on reload
- [ ] 6.3 Implement `authGuard` (CanActivateFn) redirecting unauthenticated users to `/login` for protected routes
- [ ] 6.4 Implement guard/redirect so an authenticated user visiting `/login` is redirected to the default authenticated route
- [ ] 6.5 Add a placeholder authenticated "dashboard" route/component as the post-login landing page, and update `app.routes.ts` accordingly
- [ ] 6.6 Add a logout action (e.g. button in app shell) that calls `AuthService.logout()` and redirects to `/login`

## 7. Tests

- [ ] 7.1 Backend unit tests for credential verification logic (valid, invalid org, invalid username, invalid password, disabled account)
- [ ] 7.2 Backend integration tests for `POST /api/auth/login`, `GET /api/auth/session`, and `POST /api/auth/logout` covering the scenarios in `specs/tenant-auth/spec.md`
- [ ] 7.3 Frontend unit tests for `AuthService` and `authGuard`
- [ ] 7.4 Frontend component tests for `LoginComponent` covering validation, success, generic invalid-credentials error, and disabled-account error per `specs/login-ui/spec.md`
- [ ] 7.5 Ensure all new tests run via `pnpm test` across `apps/backend` and `apps/web`
