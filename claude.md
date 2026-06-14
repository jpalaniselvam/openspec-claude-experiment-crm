# General Instructions

- All packages should be installed through pnpm. No direct edit of package.json allowed
- The project uses pnpm workspaces, apps goes into apps directory and packages to packages directory

# Frontend Instructions

- Uses angular for frontend
- Uses angular material for UI framework

# Backend Tech Stack — Instructions

## Setup
- Install backend dependencies with pnpm in the workspace root. Do not edit package.json directly.
- Create an Express 5.x app under apps/backend (or appropriate apps folder).

## Database
- Use PostgreSQL as the database. Configure connection via environment variables (e.g. DATABASE_URL).
- Use Drizzle ORM for all database schema definitions and queries. Keep types in TypeScript and generate/maintain migrations as needed.
- Use the pg driver for the database connection.

## Validation
- Validate all incoming request payloads and query parameters with Zod. Define reusable schemas for DTOs and route validation.

## Security
- Use Helmet middleware to set secure HTTP headers on all Express routes.
- Integrate Better Auth (or your chosen auth provider) for authentication and session handling. Protect routes and implement role-based access where required.

## Logging
- Use Pino for structured JSON logging. Configure separate log levels for development and production and ensure errors are logged with stack traces.

## Routing & API
- Organize routes by resource under a routes/ or controllers/ directory. Use dependency injection or a service layer to separate business logic from route handlers.
- Return consistent JSON responses with a standard success/error envelope.

## Testing & CI
- Write unit tests for services and integration tests for critical endpoints. Run tests in CI using pnpm.

## Environment & Deployment
- Store secrets and config in environment variables. Provide a .env.example describing required variables.
- Build the app with pnpm build and deploy using your CI/CD pipeline. Ensure migrations run before application start.

## Notes
- Follow TypeScript-first practices across the backend. Keep code typed and prefer compile-time validation where possible.
- Keep the project organized under pnpm workspaces: apps/* for applications and packages/* for shared code.
