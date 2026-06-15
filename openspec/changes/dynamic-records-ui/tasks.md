## 1. Database & Migration

- [x] 1.1 Add nullable `display_field_api_key` (text) column to `object_definitions` in `apps/backend/src/db/schema/object-definitions.ts`
- [x] 1.2 Generate and apply the Drizzle migration for the new column

## 2. Backend: Relax metadata read access

- [x] 2.1 In `apps/backend/src/routes/objects.ts`, change `GET /` and `GET /:id` to use `requireAuth` instead of `requireAdmin`; leave `POST /`, `PATCH /:id` on `requireAdmin`
- [x] 2.2 In `apps/backend/src/routes/object-fields.ts`, change `GET /:objectId/fields` to use `requireAuth` instead of `requireAdmin`; leave `POST`, `PATCH`, `DELETE` on `requireAdmin`
- [x] 2.3 Update `apps/backend/src/routes/objects.test.ts` and `apps/backend/src/routes/object-fields.test.ts`: replace the "member is forbidden" (`403`) assertions on the GET routes with "member is allowed" (`200`) assertions; keep `403` assertions for the write routes

## 3. Backend: Display field

- [x] 3.1 Add `displayFieldApiKey` (nullable string) to the update schema in `apps/backend/src/validation/objects.ts`
- [x] 3.2 In `apps/backend/src/services/object-definition-service.ts`, validate `displayFieldApiKey` on update: when non-null, it must match the `apiKey` of an existing field definition belonging to the same object definition with `dataType` of `text` or `long_text`, otherwise return `VALIDATION_ERROR`
- [x] 3.3 Implement and export `resolveEffectiveDisplayField(object, fields)` from `object-definition-service.ts` (or a shared module) implementing the default-resolution rule: explicit `displayFieldApiKey` → first `text`/`long_text` field by `sortOrder` → `null`
- [x] 3.4 Ensure `displayFieldApiKey` is included in the object definition DTO returned by `GET /api/objects`, `GET /api/objects/:id`, `POST /api/objects`, and `PATCH /api/objects/:id`
- [x] 3.5 Extend `object-definition-service.test.ts` and `objects.test.ts` with scenarios: default `null` on create, setting a valid `text`/`long_text` display field, clearing it, rejecting a non-text field, rejecting a nonexistent field

## 4. Backend: Related records (reverse lookups)

- [x] 4.1 Implement `listRelatedRecords(organizationId, object, recordId)` in `apps/backend/src/services/record-service.ts`: find all non-archived object definitions in the org and their `lookup` field definitions targeting `object.id`, then for each, query records where `data->>'<apiKey>' = recordId`
- [x] 4.2 Compute `displayValue` for each related record via `resolveEffectiveDisplayField` on its source object, falling back to the record `id`
- [x] 4.3 Add `GET /:objectApiName/:id/related` to `apps/backend/src/routes/records.ts` (requires auth, resolves object via existing `resolveObject` helper, returns `404 RECORD_NOT_FOUND` if the record doesn't exist in the org, otherwise `200` with grouped `related` array)
- [x] 4.4 Add tests in `record-service.test.ts` and `records.test.ts`: grouped results across multiple source objects/fields, `displayValue` resolution and id-fallback, empty `related: []`, `OBJECT_NOT_FOUND`, `RECORD_NOT_FOUND`, `UNAUTHORIZED`

## 5. Frontend: Shared utilities & services

- [x] 5.1 Add `displayFieldApiKey: string | null` to `ObjectDefinition` and `UpdateObjectInput` in `apps/web/src/app/admin/objects/objects.service.ts`
- [x] 5.2 Add a shared `resolveEffectiveDisplayField(object, fields)` utility under `apps/web/src/app/shared/` mirroring the backend resolution rule
- [x] 5.3 Create `RecordsService` (e.g. `apps/web/src/app/records/records.service.ts`) with `list`, `get`, `create`, `update`, `delete`, and `getRelated` methods against `/api/records/:apiName...`, following the existing `ObjectsService`/`FieldsService` pattern (typed `ApiResponse<T>`, `catchError`)

## 6. Frontend: Shared app shell

- [x] 6.1 Rename/restructure `AdminShell` into a shared `AppShell` (e.g. move `apps/web/src/app/admin/admin-shell/` to `apps/web/src/app/shell/app-shell/`), guarded by `authGuard` only
- [x] 6.2 Restructure `app.routes.ts`: the shell wraps both the existing `/admin/**` routes (with `adminGuard` applied at the child-route level) and new `/objects/**` routes (authGuard only, via the shell)
- [x] 6.3 In the shell, fetch `GET /api/objects` on init and render a "DATA" nav section with one item per non-archived object (icon + `pluralName`) linking to `/objects/:apiName`
- [x] 6.4 Conditionally render the "CONFIGURATION" section (Objects, Users) only when the current user's `role === 'admin'`
- [x] 6.5 Update shell tests for: any authenticated user can load the shell, DATA section reflects `GET /api/objects`, CONFIGURATION section visibility by role, collapse/expand and active-route highlighting still work

## 7. Frontend: Display field admin UI

- [x] 7.1 Add a "Display Field" selector to `edit-object-dialog` (`apps/web/src/app/admin/objects/edit-object-dialog/`): options = "None (use default)" + the object's `text`/`long_text` field definitions; include `displayFieldApiKey` in the `PATCH /api/objects/:id` payload
- [x] 7.2 On `object-detail-page`, show the effective display field: explicit `displayFieldApiKey` name, or the default (first `text`/`long_text` field by `sortOrder`) labeled as default, or a "no display field configured" message

## 8. Frontend: Worksheet page

- [x] 8.1 Create a worksheet page component for route `/objects/:apiName`: resolve the object definition by `apiName` from `GET /api/objects`, then load its fields (`GET /api/objects/:id/fields`) and records (`GET /api/records/:apiName`)
- [x] 8.2 Render a table with one column per field definition ordered by `sortOrder`; show a "not found" state for an unknown/archived `apiName` and an empty-state row set for an object with no records
- [x] 8.3 For `lookup` fields, fetch the target object's records and resolve `id → displayValue` via `resolveEffectiveDisplayField`, and render that value in the cell (falling back to the raw id if unresolved)
- [x] 8.4 Add a search input that filters rows by case-insensitive substring match across all rendered column values
- [x] 8.5 Add column-header sort (click to cycle ascending → descending → unsorted) over rendered column values
- [x] 8.6 Add per-column filters: multi-select for `picklist`/`boolean`/`lookup` columns (options derived from loaded data), text-contains for other types; combine with search and sort

## 9. Frontend: Side panel (create/edit)

- [x] 9.1 Add child routes `/objects/:apiName/new` and `/objects/:apiName/:id` rendering a side panel (`MatDrawer`, end-anchored) alongside the worksheet table
- [x] 9.2 "+ New" button navigates to `/objects/:apiName/new`; panel renders `DynamicFormComponent` with no initial value
- [x] 9.3 Row click navigates to `/objects/:apiName/:id`; panel renders `DynamicFormComponent` pre-populated from the record's `data`, with the panel header showing the record's effective display value (or `id` if none)
- [x] 9.4 Wire Save: `POST /api/records/:apiName` for create, `PUT /api/records/:apiName/:id` for edit; on `VALIDATION_ERROR` keep the panel open and show the error
- [x] 9.5 Wire Cancel/close to navigate back to `/objects/:apiName` without persisting changes
- [x] 9.6 Show a "not found" state in the panel when `/objects/:apiName/:id` resolves to a nonexistent record

## 10. Frontend: Related records

- [x] 10.1 In the edit panel, call `GET /api/records/:apiName/:id/related` and render a "Related" section grouped by source object `pluralName` and lookup field name
- [x] 10.2 Render each related record using its `displayValue` as a link navigating to `/objects/:relatedObjectApiName/:relatedRecordId`
- [x] 10.3 Omit (or show an empty state for) the "Related" section when there are no related records, and never show it in create mode (`/objects/:apiName/new`)

## 11. Frontend: Delete

- [x] 11.1 Add a row-level delete action on the worksheet that opens a confirmation dialog (mirroring the existing delete-field confirmation dialog pattern from `object-detail-page`)
- [x] 11.2 On confirm, call `DELETE /api/records/:apiName/:id` and remove the row from the worksheet; on cancel, take no action

## 12. Verification

- [x] 12.1 Run the backend test suite (`pnpm --filter backend test` or equivalent)
- [x] 12.2 Run the frontend test suite and build (`pnpm --filter web test`, `pnpm --filter web build`)
- [x] 12.3 Manual walkthrough: as admin, create an object with text fields, set a display field, add a lookup field on a second object; as a member, browse `/objects/:apiName`, create/edit/delete records, and confirm lookup columns, related-record links, and panel navigation all work
