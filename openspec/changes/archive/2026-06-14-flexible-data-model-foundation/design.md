## Context

The backend currently has two fixed tables — `organizations` and `users` — plus Better Auth session handling, a `requireAdmin` middleware (from `tenant-user-management`), Zod-based request validation, and a shared `sendSuccess`/`sendError` JSON envelope. All routes are organization-scoped via `req.currentUser.organizationId` / `req.session.user.organizationId`.

This change adds the first slice of the Flexible Data Model PRD: a metadata layer (object definitions + field definitions) and a generic record store, both organization-scoped, following the existing `routes/` + `services/` + `validation/` split and Drizzle/Postgres conventions.

## Goals / Non-Goals

**Goals:**
- Let an `admin` define custom object types (`object_definitions`) and fields on them (`field_definitions`), scoped to their organization.
- Support field data types: `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`.
- Track a `schemaVersion` on each object definition, incremented whenever its field set changes.
- Provide a generic, JSONB-backed record store with CRUD endpoints (`/api/records/:objectApiName[/:id]`) usable by any authenticated organization member.
- Validate record payloads at request time against the object's *current* field definitions using dynamically-built Zod schemas, including picklist membership and lookup-reference existence.

**Non-Goals:**
- Dynamic Angular UI generation (follow-up change).
- Default templates / seed data for Sales, Recruitment, Healthcare, etc. (follow-up change).
- Relationships beyond a single `lookup` reference field (no junction objects, no many-to-many, no cascade behavior).
- Field-level or record-level permissions, ownership-based access (records are accessible to any authenticated org member in this change).
- Audit trail / change history.
- Full-text search or indexing of record data.
- Formula/computed/AI-generated fields, automation, schema migration/rewrite of existing records when fields change.

## Decisions

### 1. Three new tables: `object_definitions`, `field_definitions`, `records`
- `object_definitions`: `id` (uuid pk), `organizationId` (fk → organizations), `apiName` (text, unique per org, lowercase snake_case slug), `name`, `pluralName`, `description` (nullable), `icon` (nullable), `color` (nullable), `schemaVersion` (int, default 1), `isArchived` (bool, default false), `createdAt`, `updatedAt`.
- `field_definitions`: `id` (uuid pk), `objectDefinitionId` (fk → object_definitions, cascade delete), `apiKey` (text, unique per object, lowercase snake_case slug), `name`, `dataType` (enum: `field_data_type`), `isRequired`, `isUnique`, `isSearchable`, `isReadOnly` (all bool, default false), `defaultValue` (jsonb, nullable), `options` (jsonb, nullable — picklist choices), `lookupObjectDefinitionId` (nullable fk → object_definitions, for `lookup` fields), `sortOrder` (int), `createdAt`, `updatedAt`.
- `records`: `id` (uuid pk), `organizationId` (fk → organizations), `objectDefinitionId` (fk → object_definitions, cascade delete), `data` (jsonb, not null), `createdAt`, `updatedAt`.

Alternative considered: an EAV (entity-attribute-value) model with one row per field value, as hinted in the PRD. Rejected for the foundation — JSONB keeps record reads/writes to a single row, avoids row-count explosion, and the PRD itself lists JSONB as an acceptable record-storage approach. EAV can be revisited if cross-object reporting/search needs push toward it.

### 2. Schema versioning is a counter, not a record migration mechanism
`object_definitions.schemaVersion` starts at `1` and increments by 1 on every successful create/update/delete of a field definition for that object. It is returned to clients so they can detect "the schema changed since I last fetched it," but **no record data is rewritten** when it changes. Reads return `data` as stored; writes (create/`PUT`) are validated against the *current* field definitions only.

Alternative considered: stamp each record with the `schemaVersion` active at write time and provide a reconciliation/migration job. Rejected as out of scope — no consumer needs it yet, and it can be added additively (new nullable column) later without breaking this design.

### 3. Dynamic Zod schema builder for record payloads
A `buildRecordSchema(fieldDefinitions: FieldDefinition[])` function (in `validation/records.ts`) maps each field to a Zod type based on `dataType`:
- `text`, `long_text`, `email`, `phone`, `url` → `z.string()` (with `.email()`/`.url()` refinements for `email`/`url`)
- `number` → `z.number()`; `decimal` → `z.number()` (stored as JS number; precision concerns deferred)
- `boolean` → `z.boolean()`
- `date`, `datetime` → `z.string().date()` / `z.string().datetime()` (ISO strings)
- `picklist` → `z.enum(field.options)`
- `lookup` → `z.string().uuid()`, plus an async `.superRefine` that checks a record with that id exists in `records` for `(organizationId, field.lookupObjectDefinitionId)`

Fields with `isRequired = false` are wrapped in `.optional().nullable()`. The schema is built fresh per request from the current `field_definitions` rows — no caching in this change, since metadata reads are infrequent relative to record writes and correctness (always reflecting the latest schema) matters more here.

Alternative considered: precompile and cache a JSON-Schema/Zod schema on `object_definitions`, invalidated on field changes. Rejected for now as premature optimization; revisit if profiling shows metadata lookups are a hot path.

### 4. API surface
- `routes/objects.ts` (admin-only via `requireAdmin`):
  - `GET /api/objects` — list non-archived object definitions for the org.
  - `POST /api/objects` — create (`name`, `pluralName`, optional `apiName`/`description`/`icon`/`color`; `apiName` derived from `name` via slugify if omitted).
  - `GET /api/objects/:id` — fetch one (404 if not found / wrong org).
  - `PATCH /api/objects/:id` — update `name`, `pluralName`, `description`, `icon`, `color`, or `isArchived` (apiName is immutable after creation).
- `routes/object-fields.ts` (admin-only via `requireAdmin`):
  - `GET /api/objects/:objectId/fields` — list fields ordered by `sortOrder`.
  - `POST /api/objects/:objectId/fields` — create a field; increments `schemaVersion`.
  - `PATCH /api/objects/:objectId/fields/:fieldId` — update a field's `name`, flags, `defaultValue`, `options`, or `sortOrder` (`apiKey`, `dataType`, `lookupObjectDefinitionId` are immutable after creation); increments `schemaVersion`.
  - `DELETE /api/objects/:objectId/fields/:fieldId` — delete a field; increments `schemaVersion`; blocked with `409 FIELD_IN_USE` if any record for that object has a non-null value at `data.<apiKey>`.
- `routes/records.ts` (any authenticated org member):
  - `GET /api/records/:objectApiName` — list records for the object (paginated later; returns all for now).
  - `POST /api/records/:objectApiName` — create, validated via `buildRecordSchema`.
  - `GET /api/records/:objectApiName/:id` — fetch one.
  - `PUT /api/records/:objectApiName/:id` — full replace of `data`, validated.
  - `DELETE /api/records/:objectApiName/:id` — delete.

All routes resolve `:objectApiName`/`:objectId` to an `object_definitions` row scoped to `req.currentUser.organizationId`, returning `404 NOT_FOUND` (code `OBJECT_NOT_FOUND`) if it doesn't exist, is archived, or belongs to another org.

### 5. `apiName` / `apiKey` format and immutability
Both are lowercase snake_case slugs matching `^[a-z][a-z0-9_]*$`, unique within their scope (`apiName` per organization, `apiKey` per object definition). If omitted on create, derived by slugifying `name` (lowercașe, spaces/non-alphanumerics → `_`). Both are immutable after creation — `records.data` keys are `field_definitions.apiKey` values, so renaming a key in place would silently orphan existing data. Renaming requires deleting and recreating the field (subject to the `FIELD_IN_USE` guard above).

### 6. Lookup fields validate existence, not referential integrity
A `lookup` field stores the referenced record's `id` (uuid) as the value for its key in `data`. `field_definitions.lookupObjectDefinitionId` records *which* object the lookup points at (set at field-creation time, immutable). On record create/update, the dynamic schema's `superRefine` queries `records` for a row with `id = <value>` and `objectDefinitionId = field.lookupObjectDefinitionId` and `organizationId = caller's org`; if absent, validation fails with `VALIDATION_ERROR`. There is no DB-level foreign key enforcing this (the generic `records` table can't express "references row of dynamic type X" as a Postgres FK), and no cascade-delete or referential cleanup if the referenced record is later deleted.

## Risks / Trade-offs

- **[Risk]** JSONB storage with app-level-only validation means no DB-level type/uniqueness/FK enforcement on record data (e.g., `isUnique` fields aren't enforced at the DB layer). → **Mitigation**: explicitly scoped out of this change; `isUnique` is stored as metadata for a future change to enforce (e.g., via a partial unique index or app-level check-then-insert with retry). Documented here so it isn't assumed to already work.
- **[Risk]** Lookup fields can become dangling references if the referenced record is deleted (no cascade). → **Mitigation**: accepted for foundation; reads simply return the stored id, which the (future) UI can resolve-or-show-as-missing. Revisit if data-integrity issues surface.
- **[Risk]** Schema changes don't retroactively validate or migrate existing records, so a record created before a field became `isRequired` may lack that key. → **Mitigation**: this is explicit PRD behavior ("previous record data remains accessible"); only writes are validated against the current schema, reads are not.
- **[Risk]** `apiName`/`apiKey` immutability plus delete-and-recreate-only renaming could be limiting for admins who make typos. → **Mitigation**: acceptable for the foundation; the `FIELD_IN_USE` guard still allows free renaming before any record uses the field.
- **[Risk]** No pagination on `GET /api/records/:objectApiName` could be slow for large datasets. → **Mitigation**: acceptable for the foundation given no tenant has large datasets yet; pagination can be added additively (query params) without breaking the response shape if implemented as `{ items, ... }` from the start — response shape will wrap records in `{ items: [...] }` to leave room for this.

## Migration Plan

- Add one Drizzle migration that creates:
  - enum `field_data_type` (`text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`)
  - `object_definitions` table (with unique index on `(organization_id, api_name)`)
  - `field_definitions` table (with unique index on `(object_definition_id, api_key)`)
  - `records` table (with index on `(organization_id, object_definition_id)`)
- No changes to existing tables (`organizations`, `users`, Better Auth tables).
- Rollback: drop `records`, `field_definitions`, `object_definitions`, and the `field_data_type` enum — no existing data is affected since these are net-new tables.

## Open Questions

- Should `isSearchable`/future search indexing create Postgres expression/GIN indexes on `records.data`? Deferred to the search-focused follow-up change; flags are captured now so no further metadata migration is needed then.
- Should `isUnique` be enforced now via a partial unique index on `(object_definition_id, (data->>'apiKey'))`? Deferred — flagged as a known gap above; revisit if a concrete use case needs it before the broader permissions/validation follow-up.
