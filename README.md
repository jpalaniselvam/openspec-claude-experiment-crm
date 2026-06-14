# CRM

A modern, full-stack Customer Relationship Management platform built as a **pnpm monorepo**. It features a flexible data model that allows administrators to define custom objects and fields at runtime, dynamic record management, and multi-tenant authentication.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Database](#database)
- [Contributing](#contributing)

---

## Architecture

```
┌─────────────────────────────────────┐
│         Angular Frontend (web)      │  :4200
│  Angular Material · SCSS · RxJS     │
└──────────────────┬──────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────┐
│        Express Backend (backend)    │  :3000
│  Express 5 · Drizzle ORM · Zod      │
│  Better Auth · Helmet · Pino        │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│           PostgreSQL Database       │
└─────────────────────────────────────┘
```

The project is organized as a **pnpm workspace monorepo** with apps living under `apps/` and shared packages under `packages/`.

---

## Tech Stack

### Frontend (`apps/web`)

| Technology | Purpose |
|---|---|
| Angular 20 | Application framework |
| Angular Material | UI component library |
| RxJS | Reactive state & async handling |
| SCSS | Styling |
| TypeScript 5.8 | Type safety |

### Backend (`apps/backend`)

| Technology | Purpose |
|---|---|
| Express 5 | HTTP server & routing |
| Drizzle ORM | Type-safe database access & migrations |
| PostgreSQL | Primary database |
| Better Auth | Authentication & session management |
| Zod | Request validation & schema definitions |
| Helmet | Secure HTTP headers |
| Pino | Structured JSON logging |
| Vitest | Unit & integration testing |
| TypeScript 5.8 | Type safety |

---

## Project Structure

```
crm/
├── apps/
│   ├── backend/            # Express API server
│   │   ├── drizzle/        # Generated SQL migrations
│   │   └── src/
│   │       ├── config/     # App configuration
│   │       ├── db/         # Drizzle schema & database client
│   │       ├── lib/        # Shared utilities (auth, etc.)
│   │       ├── middleware/  # Express middleware
│   │       ├── routes/     # API route handlers & tests
│   │       ├── scripts/    # One-off scripts (seed, etc.)
│   │       ├── services/   # Business logic layer
│   │       └── validation/ # Zod validation schemas
│   └── web/                # Angular frontend
│       └── src/
│           └── app/
│               ├── admin/      # Admin panel (objects, fields, records)
│               ├── auth/       # Login / registration pages
│               ├── core/       # Guards, interceptors, services
│               └── dashboard/  # Main dashboard
├── openspec/               # OpenSpec change management
│   ├── changes/            # Active & archived changes
│   └── specs/              # Feature specifications
├── packages/               # Shared packages (currently empty)
├── pnpm-workspace.yaml
└── package.json
```

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 11.6 (installed automatically via `corepack` if missing)
- **PostgreSQL** ≥ 15 running locally or accessible via connection string

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd crm
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your database credentials and secrets
```

### 4. Run database migrations

```bash
pnpm --filter backend db:migrate
```

### 5. (Optional) Seed the database

```bash
pnpm --filter backend db:seed
```

### 6. Start the development servers

Open two terminals:

```bash
# Terminal 1 — Backend API (http://localhost:3000)
pnpm --filter backend dev

# Terminal 2 — Frontend (http://localhost:4200)
pnpm --filter web dev
```

---

## Environment Variables

All backend environment variables are defined in `apps/backend/.env`. Copy `.env.example` to get started:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/crm` |
| `PORT` | Port the Express server listens on | `3000` |
| `BETTER_AUTH_SECRET` | Secret for signing session tokens (use a long random string) | — |
| `BETTER_AUTH_URL` | Base URL of the backend | `http://localhost:3000` |
| `CORS_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:4200` |
| `NODE_ENV` | Environment mode (`development` \| `production`) | `development` |

---

## Available Scripts

Run all scripts from the **workspace root** using `pnpm --filter <app> <script>` or navigate into the app directory.

### Backend

| Script | Description |
|---|---|
| `pnpm --filter backend dev` | Start backend in watch mode |
| `pnpm --filter backend build` | Compile TypeScript to `dist/` |
| `pnpm --filter backend start` | Run compiled production build |
| `pnpm --filter backend test` | Run Vitest test suite |
| `pnpm --filter backend db:generate` | Generate Drizzle migration files |
| `pnpm --filter backend db:migrate` | Apply pending database migrations |
| `pnpm --filter backend db:seed` | Seed the database with sample data |

### Frontend

| Script | Description |
|---|---|
| `pnpm --filter web dev` | Start Angular dev server |
| `pnpm --filter web build` | Production build to `dist/` |
| `pnpm --filter web test` | Run Karma/Jasmine test suite |

---

## API Overview

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/sign-up` | Register a new user |
| `POST` | `/api/auth/sign-in` | Sign in and obtain a session |
| `POST` | `/api/auth/sign-out` | Invalidate the current session |
| `GET` | `/api/users` | List users (admin) |
| `GET/POST` | `/api/objects` | List / create object definitions |
| `GET/PUT/DELETE` | `/api/objects/:id` | Read / update / delete an object definition |
| `GET/POST` | `/api/objects/:objectId/fields` | List / create field definitions for an object |
| `GET/PUT/DELETE` | `/api/objects/:objectId/fields/:id` | Read / update / delete a field definition |
| `GET/POST` | `/api/objects/:objectId/records` | List / create dynamic records |
| `GET/PUT/DELETE` | `/api/objects/:objectId/records/:id` | Read / update / delete a dynamic record |

Authentication is handled via **Better Auth** session cookies.

---

## Database

The project uses **Drizzle ORM** with PostgreSQL. Schema files live in `apps/backend/src/db/` and SQL migrations are generated under `apps/backend/drizzle/`.

### Generating a new migration

After modifying the Drizzle schema:

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

---

## Contributing

1. Install dependencies with `pnpm install` (never edit `package.json` directly).
2. Add new apps under `apps/` and shared libraries under `packages/`.
3. Follow TypeScript-first practices — keep everything typed.
4. Use **conventional commits** for commit messages.
5. Ensure `pnpm --filter backend test` passes before opening a pull request.
