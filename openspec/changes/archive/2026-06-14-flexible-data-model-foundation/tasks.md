## 1. Database & schema

- [x] 1.1 Add `apps/backend/src/db/schema/object-definitions.ts` defining the `object_definitions` table (`id`, `organizationId`, `apiName`, `name`, `pluralName`, `description`, `icon`, `color`, `schemaVersion`, `isArchived`, `createdAt`, `updatedAt`) with a unique index on `(organization_id, api_name)`.
- [x] 1.2 Add `apps/backend/src/db/schema/field-definitions.ts` defining the `field_data_type` Postgres enum (`text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`) and the `field_definitions` table (`id`, `objectDefinitionId`, `apiKey`, `name`, `dataType`, `isRequired`, `isUnique`, `isSearchable`, `isReadOnly`, `defaultValue`, `options`, `lookupObjectDefinitionId`, `sortOrder`, `createdAt`, `updatedAt`) with a unique index on `(object_definition_id, api_key)`.
- [x] 1.3 Add `apps/backend/src/db/schema/records.ts` defining the `records` table (`id`, `organizationId`, `objectDefinitionId`, `data` jsonb, `createdAt`, `updatedAt`) with an index on `(organization_id, object_definition_id)`.
- [x] 1.4 Export the new tables/enums from `apps/backend/src/db/schema/index.ts`.
- [x] 1.5 Generate the Drizzle migration for the new enum and three tables and apply it locally.

## 2. Shared validation helpers

- [x] 2.1 Add a `slugify` helper (e.g. `apps/backend/src/lib/slugify.ts`) that converts a display name to a `^[a-z][a-z0-9_]*$` snake_case slug, used to derive `apiName`/`apiKey` when omitted.
- [x] 2.2 Add `apps/backend/src/validation/objects.ts` with `createObjectSchema` (`name`, `pluralName`, optional `apiName` matching `^[a-z][a-z0-9_]*$`, optional `description`/`icon`/`color`) and `updateObjectSchema` (optional `name`, `pluralName`, `description`, `icon`, `color`, `isArchived`; rejects `apiName`).
- [x] 2.3 Add `apps/backend/src/validation/fields.ts` with `createFieldSchema` (`name`, optional `apiKey`, `dataType`, `isRequired`/`isUnique`/`isSearchable`/`isReadOnly`, `defaultValue`, `options`, `lookupObjectDefinitionId`, `sortOrder`) including refinements requiring non-empty `options` when `dataType = "picklist"` and `lookupObjectDefinitionId` when `dataType = "lookup"`, and `updateFieldSchema` (optional `name`, flags, `defaultValue`, `options`, `sortOrder`; rejects `apiKey`/`dataType`/`lookupObjectDefinitionId`).

## 3. Object definitions: service & routes

- [x] 3.1 Add `apps/backend/src/services/object-definition-service.ts` with `listObjectDefinitions(organizationId)`, `createObjectDefinition(organizationId, input)` (derives `apiName` via `slugify` when omitted, throws `OBJECT_API_NAME_TAKEN` on conflict), `getObjectDefinition(organizationId, id)` (throws `OBJECT_NOT_FOUND`), `updateObjectDefinition(organizationId, id, input)`, and `resolveObjectByApiName(organizationId, apiName)` (non-archived only, throws `OBJECT_NOT_FOUND`).
- [x] 3.2 Add `apps/backend/src/routes/objects.ts` with `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, each behind `requireAdmin`, using the schemas from 2.2 and `sendSuccess`/`sendError`.
- [x] 3.3 Mount the router at `/api/objects` in `apps/backend/src/app.ts`.

## 4. Field definitions: service & routes

- [x] 4.1 Add `apps/backend/src/services/field-definition-service.ts` with `listFieldDefinitions(organizationId, objectId)`, `createFieldDefinition(organizationId, objectId, input)` (derives `apiKey` via `slugify`, throws `FIELD_API_KEY_TAKEN` on conflict, validates `lookupObjectDefinitionId` resolves to a non-archived object definition in the same org, increments the parent's `schemaVersion`), `updateFieldDefinition(organizationId, objectId, fieldId, input)` (increments `schemaVersion`, throws `FIELD_NOT_FOUND`), and `deleteFieldDefinition(organizationId, objectId, fieldId)` (checks `records.data->><apiKey>` is null for all records of the object, throws `FIELD_IN_USE` if not, increments `schemaVersion`).
- [x] 4.2 Add `apps/backend/src/routes/object-fields.ts` with `GET /`, `POST /`, `PATCH /:fieldId`, `DELETE /:fieldId`, mounted under `/api/objects/:objectId/fields`, each behind `requireAdmin`, using the schemas from 2.3.
- [x] 4.3 Mount the router (nested under the objects router or as its own router with `mergeParams`) so it serves `/api/objects/:objectId/fields...` in `apps/backend/src/app.ts`.

## 5. Dynamic record validation

- [x] 5.1 Add `apps/backend/src/validation/records.ts` exporting `buildRecordSchema(fieldDefinitions)` that maps each field definition's `dataType`/flags to a Zod type per design.md §3 (`text`/`long_text`/`email`/`phone`/`url` → string with format refinements, `number`/`decimal` → number, `boolean` → boolean, `date`/`datetime` → ISO string, `picklist` → `z.enum(options)`, `lookup` → `z.string().uuid()`), wrapping non-required fields in `.optional().nullable()`.
- [x] 5.2 Add an async lookup-existence check usable from `buildRecordSchema` (e.g. via `superRefine` with an injected lookup function) that queries `records` for `(organizationId, lookupObjectDefinitionId, id)`.

## 6. Records: service & routes

- [x] 6.1 Add `apps/backend/src/services/record-service.ts` with `listRecords(organizationId, objectDefinition)`, `createRecord(organizationId, objectDefinition, data)`, `getRecord(organizationId, objectDefinition, id)` (throws `RECORD_NOT_FOUND`), `updateRecord(organizationId, objectDefinition, id, data)`, and `deleteRecord(organizationId, objectDefinition, id)` — each fetching the object's current field definitions, building the schema via 5.1, validating `data`, and reading/writing the `records` table.
- [x] 6.2 Add `apps/backend/src/routes/records.ts` with `GET /:objectApiName`, `POST /:objectApiName`, `GET /:objectApiName/:id`, `PUT /:objectApiName/:id`, `DELETE /:objectApiName/:id`, resolving `:objectApiName` via `resolveObjectByApiName` (3.1) for the authenticated session (any role), returning `OBJECT_NOT_FOUND` if resolution fails, and list responses wrapped as `{ items: [...] }`.
- [x] 6.3 Mount the router at `/api/records` in `apps/backend/src/app.ts`.

## 7. Tests

- [x] 7.1 Unit tests for `object-definition-service`: apiName derivation, apiName conflict, update rejects `apiName`, archive hides from list and from `resolveObjectByApiName`, org scoping (`OBJECT_NOT_FOUND` for foreign org).
- [x] 7.2 Unit tests for `field-definition-service`: apiKey derivation, apiKey conflict, picklist requires options, lookup requires valid target, `schemaVersion` increments on create/update/delete, `FIELD_IN_USE` on delete when records reference the key, immutable-field update rejection.
- [x] 7.3 Unit tests for `buildRecordSchema` / `record-service`: required-field validation, type validation per `dataType`, picklist membership, lookup existence (pass/fail), full-replace `PUT` semantics (old data discarded, validation re-run).
- [x] 7.4 Integration tests (`apps/backend/src/routes/objects.test.ts`) for `GET/POST/GET:id/PATCH:id /api/objects` covering admin/member/unauthenticated access and validation errors from the `object-definitions` spec.
- [x] 7.5 Integration tests (`apps/backend/src/routes/object-fields.test.ts`) for `GET/POST/PATCH/DELETE /api/objects/:objectId/fields...` covering admin/member access, validation errors, `FIELD_IN_USE`, and `schemaVersion` increments from the `field-definitions` spec.
- [x] 7.6 Integration tests (`apps/backend/src/routes/records.test.ts`) for `GET/POST /api/records/:objectApiName` and `GET/PUT/DELETE /api/records/:objectApiName/:id` covering unknown object, validation errors (required/type/picklist/lookup), and org scoping from the `dynamic-records` spec.
