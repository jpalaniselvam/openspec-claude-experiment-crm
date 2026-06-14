## Why

Every business entity in the CRM today (organizations, users) is a fixed table defined in code. Tenants with domains beyond a standard Sales CRM (e.g. Healthcare, Recruitment, Real Estate) cannot represent their own entities — "Doctor", "Patient", "Candidate" — without engineering work and a deployment. To support per-tenant custom entities, fields, and templates (per the Flexible Data Model PRD), the platform needs a metadata-driven foundation: a way for an organization admin to define object types and their fields at runtime, and a generic record store + API that persists and serves data for those object types without further code changes.

This change establishes that foundation only. Dynamic UI generation, default templates (Sales/Recruitment/Healthcare CRM), relationships/junction objects, permissions beyond admin-only metadata management, audit trails, search, and automation are explicitly deferred to follow-up changes.

## What Changes

- Add organization-scoped **object definitions**: an admin can create, list, update, and archive custom object types (e.g. `doctor`, `patient`), each with a name, plural name, API name (unique per org), description, icon, and color.
- Add **field definitions** per object: an admin can add, list, update, reorder, and delete fields on an object definition, each with a name, internal (API) key, data type, required/unique/indexed/searchable/read-only flags, and default value.
- Support an initial set of **field data types** sufficient for common entities: `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist` (with a static option list), and `lookup` (a reference to a record of another object definition, stored as that record's id — no cascade/relationship management beyond storing and validating the reference).
- Add **schema versioning**: each object definition tracks a `schemaVersion` that increments whenever its field set changes. Existing records are not migrated or rewritten when the schema changes.
- Add a generic **record store and CRUD API**: records for any object definition are persisted as JSONB rows scoped to `(organizationId, objectDefinitionId)`, with `GET/POST /api/records/:objectApiName`, `GET/PUT/DELETE /api/records/:objectApiName/:id`. Payloads are validated at request time against the object's current field definitions using dynamically-built Zod schemas (required fields, type coercion, picklist membership, lookup existence).
- Restrict object/field metadata management (`/api/objects`, `/api/objects/:id/fields`) to `admin` users in the caller's organization (reusing the existing `requireAdmin` middleware); record CRUD (`/api/records/...`) is available to any authenticated user in the organization.
- **BREAKING**: none — these are net-new tables and endpoints; no existing schema or API is modified.

## Capabilities

### New Capabilities
- `object-definitions`: Organization-scoped CRUD for custom object type metadata (name, plural name, API name, description, icon, color, archive state), admin-only.
- `field-definitions`: CRUD for fields on an object definition (name, API key, data type, flags, default value, ordering), including schema version increments on field set changes, admin-only.
- `dynamic-records`: Generic JSONB-backed record storage with create/read/update/delete/list APIs per object definition, with request payloads validated against the object's current field definitions at runtime.

### Modified Capabilities
(none — no existing specs in `openspec/specs/` are affected)

## Impact

- **Database**: New tables `object_definitions` (org-scoped, `apiName` unique per org, `schemaVersion`), `field_definitions` (belongs to an object definition, `apiKey` unique per object, data type enum, flags, ordering), and `records` (org + object-definition scoped, JSONB `data` column, `createdAt`/`updatedAt`). New Drizzle migration(s).
- **Backend**: New `routes/objects.ts`, `routes/object-fields.ts`, `routes/records.ts`; new `services/object-definition-service.ts`, `services/field-definition-service.ts`, `services/record-service.ts`; new `validation/objects.ts`, `validation/fields.ts`, and a dynamic Zod schema builder for record payloads in `validation/records.ts`. Reuses existing `requireAdmin` middleware and auth/session plumbing.
- **Frontend**: None in this change — no Angular UI is added; object/field/record management is API-only until the dynamic UI follow-up change.
- **Tests**: Unit tests for `object-definition-service`, `field-definition-service`, `record-service`, and the dynamic record-validation schema builder; integration tests for the objects, fields, and records endpoints covering admin/non-admin access, validation errors, schema-version increments, and lookup-reference validation.
