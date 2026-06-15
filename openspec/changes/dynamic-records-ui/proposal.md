## Why

The flexible data model backend (`object-definitions`, `field-definitions`, `dynamic-records`) and the metadata admin UI are both live, but admins can only *define* custom objects and fields — nobody, including admins, can actually create, view, edit, or delete a record of those objects. The `dynamic-records` API and `DynamicFormComponent` already exist but aren't wired into any end-user page. This change closes that loop with a generic, metadata-driven "worksheet" UI available to every authenticated user in an organization.

## What Changes

- Add a new **Dynamic Records UI**: for every non-archived object definition, a worksheet page at `/objects/:apiName` showing all of that object's records in a table (one column per field definition), with client-side search, sort, and filter (no pagination — full list loaded).
- Add a **side panel** (via child route `/objects/:apiName/:id`, plus a "new record" entry point) that hosts the existing `DynamicFormComponent` for creating and editing a record, including a read-only **Related** section showing reverse-lookup records.
- Add a **Display Field** concept to object definitions: a nullable `displayFieldApiKey` restricted to that object's own `text`/`long_text` fields, used to render human-readable labels for lookups, record titles, and related-record links instead of raw UUIDs. Defaults to the first eligible `text`/`long_text` field by `sortOrder`, falling back to the record `id` if none exists.
- **Relax metadata read access**: `GET /api/objects`, `GET /api/objects/:id`, and `GET /api/objects/:id/fields` become available to any authenticated user in the organization (previously admin-only). Write operations on objects/fields remain admin-only.
- Add a new **related-records (reverse lookup)** read endpoint: `GET /api/records/:objectApiName/:id/related`, returning records of other object types whose `lookup` fields point at the given record, grouped by source object.
- Restructure the admin-only sidenav shell into a shared **app shell** for all authenticated users: a "DATA" section listing every non-archived object (from `GET /api/objects`) is visible to everyone; "CONFIGURATION" (Objects, Users) remains visible only to admins.
- Add a **Display Field** selector to the existing object edit dialog and object detail page in the admin UI, scoped to the object's `text`/`long_text` fields.
- **BREAKING**: `GET /api/objects`, `GET /api/objects/:id`, and `GET /api/objects/:id/fields` no longer return `403 FORBIDDEN` for non-admin (`member`) users — they now return `200` with data, same as for admins.

## Capabilities

### New Capabilities
- `dynamic-records-ui`: End-user worksheet (list + side panel) for viewing, creating, editing, and deleting records of any object definition, including related-records navigation.

### Modified Capabilities
- `object-definitions`: Relax `GET /api/objects` and `GET /api/objects/:id` from admin-only to any authenticated user; add `displayFieldApiKey` field with validation (must reference an own `text`/`long_text` field) and default-resolution behavior.
- `field-definitions`: Relax `GET /api/objects/:id/fields` from admin-only to any authenticated user.
- `dynamic-records`: Add `GET /api/records/:objectApiName/:id/related` for reverse-lookup related records.
- `object-definitions-admin-ui`: Add a Display Field selector to the object edit dialog and detail page.
- `admin-shell-nav`: Restructure into a shared shell for all authenticated users, with a dynamic "DATA" nav section and role-conditional "CONFIGURATION" section.

## Impact

- **Database**: New nullable `display_field_api_key` column on `object_definitions`. New Drizzle migration.
- **Backend**: `routes/objects.ts` and `routes/object-fields.ts` middleware changes (admin-only → authenticated for GET routes); `services/object-definition-service.ts` updated for `displayFieldApiKey` validation/defaulting; new related-records logic in `services/record-service.ts` and a new route in `routes/records.ts`; `validation/objects.ts` updated.
- **Frontend**: New `/objects/:apiName` and `/objects/:apiName/:id` routes and components (worksheet table, side panel); `AdminShell` renamed/restructured into a shared `AppShell` consumed by `app.routes.ts`; `ObjectsService`/`FieldsService` extended for `displayFieldApiKey` and a new `RecordsService`; object edit dialog updated with a Display Field selector.
- **Tests**: Updated integration tests for `GET /api/objects`, `GET /api/objects/:id`, `GET /api/objects/:id/fields` (member access now allowed); new tests for `displayFieldApiKey` validation/defaulting and the related-records endpoint.
