## Context

`flexible-data-model-foundation` shipped the metadata layer (`object_definitions`, `field_definitions`) and a generic `records` table + CRUD API, all scoped by `organizationId`. `metadata-admin-ui` shipped an admin-only UI (`AdminShellComponent`, `/admin/objects`, `/admin/objects/:id`) for managing that metadata, plus a reusable `DynamicFormComponent` that builds a reactive form from `FieldDefinition[]`.

Today:
- `GET /api/objects`, `GET /api/objects/:id`, `GET /api/objects/:id/fields` are `requireAdmin`-gated (tests assert `member` → `403`).
- `/api/records/:objectApiName...` is already open to any authenticated org user.
- `AdminShellComponent` is wrapped by `adminGuard` — non-admins cannot reach it at all.
- There is no concept of a "title"/display field for an object; the only existing lookup-label code is a hardcoded guess (`record.name || record.title || record.id`) inside `DynamicFormComponent`.

This change adds the end-user-facing worksheet UI and the small set of backend/metadata additions it depends on.

## Goals / Non-Goals

**Goals:**
- Any authenticated org user can browse, create, edit, and delete records of any non-archived object definition via a generic, metadata-driven worksheet.
- Lookup values and record titles render as human-readable labels via a new `displayFieldApiKey` concept.
- Users can navigate from a record to records of other objects that reference it (reverse lookups), read-only.
- The existing admin shell becomes the shell for all authenticated users, with admin-only sections conditionally rendered.

**Non-Goals:**
- Pagination, server-side sorting/filtering, or search indexing of records.
- Kanban or any view beyond a table + side panel.
- Field-level or record-level (ownership) permissions.
- Editing related records inline from the side panel.
- Default templates, audit trail, many-to-many junction objects.

## Decisions

### 1. `displayFieldApiKey` is stored, but "effective display field" is computed

`object_definitions` gains a nullable `display_field_api_key` column. It is only ever set to one of that object's own `text`/`long_text` field `apiKey`s (validated on `PATCH /api/objects/:id`). It is **not** required to be set.

Both the backend (for the related-records endpoint) and the frontend (for lookup-column rendering in the worksheet) need to answer "what's the display value for this record?" — so the resolution rule is a small, duplicated-by-design pure function on each side:

```
effectiveDisplayField(object, fields):
  if object.displayFieldApiKey is set → that field
  else → first field where dataType in (text, long_text), ordered by sortOrder
  else (no such field) → null  (caller falls back to record.id)
```

Alternatives considered: have the backend always return a computed `displayValue` on every record DTO. Rejected for this change — it would mean every `GET /api/records/:objectApiName` response shape changes (impacts the existing `dynamic-records` spec's "Record fields" requirement and all current consumers), for a need that's currently limited to lookup columns/related records. The duplicated pure function is ~5 lines and keeps the existing record DTO untouched.

### 2. Relaxing `GET /api/objects*` is a pure middleware change

`routes/objects.ts` and `routes/object-fields.ts` currently apply `requireAdmin` to all routes. The GET routes move to `requireAuth` only; POST/PATCH/DELETE keep `requireAdmin`. No service-layer changes — the existing org-scoping (`organizationId` filter) already applies equally to admins and members, so no data leaks across orgs.

### 3. App shell: rename/repurpose `AdminShellComponent` → `AppShellComponent`

The existing `AdminShellComponent` (guarded by `adminGuard`) becomes the shell for `authGuard`-only routes. Its nav model gains a third, dynamically-populated section:

```
WORKSPACE          (static)        → Dashboard
DATA               (dynamic)       → one item per GET /api/objects result,
                                       icon + pluralName → /objects/:apiName
CONFIGURATION      (role==admin)   → Objects, Users
```

`app.routes.ts` is restructured so `/objects/**` and the existing `/admin/**` routes are both children of the shell, with `/admin/**` additionally guarded by `adminGuard` at the child-route level (the shell itself only requires `authGuard`).

Alternative considered: a second, separate shell component for non-admin users. Rejected — it would duplicate the dynamic DATA-nav-building logic and the sidenav collapse/responsive behavior for no real isolation benefit, since the only actual admin-only surface (Objects/Users config pages) is already protected by route-level guards independent of the shell.

### 4. Worksheet page + side panel via child route

`/objects/:apiName` renders the table (`ObjectWorksheetPage` or similar). `/objects/:apiName/:id` is a child route rendered into a `MatDrawer` (end-anchored, `mode="over"`) inside that same page — opening the drawer is just activating the child route, closing it navigates back to `/objects/:apiName`. `/objects/:apiName/new` is a reserved `:id` value (`"new"`) that opens the same drawer with `DynamicFormComponent` in create mode (no initial `value`).

This means the table component and the side-panel component are siblings under one page component, communicating only via the router — the table never needs to know "is the panel open," it just renders normally while the router outlet for the child route renders (or doesn't) the drawer content.

### 5. Reverse-lookup query strategy

`GET /api/records/:objectApiName/:id/related`:

1. Resolve `:objectApiName` → object definition `A` (404 `OBJECT_NOT_FOUND` if missing/archived, same as existing record routes).
2. Confirm the record exists in the org (404 `RECORD_NOT_FOUND` otherwise).
3. Load all non-archived object definitions in the org, and for each, their field definitions where `dataType = 'lookup' AND lookupObjectDefinitionId = A.id`. This gives a list of `(sourceObject, lookupField)` pairs.
4. For each pair, query `records` where `objectDefinitionId = sourceObject.id AND data->>'<lookupField.apiKey>' = :id` (Postgres JSONB `->>` text-extraction operator — `lookup` values are stored as plain id strings, so a text comparison is correct).
5. For each matching record, compute its `displayValue` via `effectiveDisplayField(sourceObject, sourceObjectFields)` (falling back to `record.id`).
6. Group results by `(sourceObject, lookupField)`:
   ```json
   {
     "success": true,
     "data": {
       "related": [
         {
           "objectApiName": "doctor",
           "objectName": "Doctor",
           "pluralName": "Doctors",
           "fieldApiKey": "hospital",
           "fieldName": "Hospital",
           "records": [{ "id": "...", "displayValue": "Dr. A. Rao" }]
         }
       ]
     }
   }
   ```

This is N+1-ish (one query per matching lookup field across the org's schema), but the org's total number of *field definitions* is small (metadata, not data), and each query is an indexed-equality-ish lookup. Acceptable given the explicit no-pagination, "load it all" posture of this change. A `GIN` index on `records.data` is a future optimization, not required here.

### 6. Worksheet columns and client-side operations

The table renders one column per field definition (ordered by `sortOrder`), reading `record.data[field.apiKey]`. For `lookup` columns, the cell value is resolved client-side: the worksheet page fetches `GET /api/records/:targetApiName` once per distinct lookup target (same pattern `DynamicFormComponent` already uses for its lookup `MatSelect`), builds an `id → displayValue` map using `effectiveDisplayField`, and renders that instead of the raw id.

Search/sort/filter operate on the in-memory `data` array (plus the resolved lookup display values, so searching/sorting a lookup column works on the label, not the id).

## Risks / Trade-offs

- **[Risk]** Relaxing `GET /api/objects*` to all org members is a breaking API change (existing tests assert `403` for members) → **Mitigation**: this is explicitly called out as **BREAKING** in the proposal; updated tests assert `200` for members on GET, while POST/PATCH/DELETE remain `403`.
- **[Risk]** Reverse-lookup queries scan `records` per matching lookup field with no index on the JSONB path → **Mitigation**: acceptable at current scale (no-pagination posture already accepted org-wide); flagged as a future index candidate, not blocking.
- **[Risk]** `displayFieldApiKey` resolution logic exists in two places (backend Node, frontend Angular) → **Mitigation**: logic is trivial (~5 lines, no edge cases beyond "first text/long_text field or none"); duplication is cheaper than a shared package for this size, and both implementations are covered by tests against the same spec scenarios.
- **[Risk]** Restructuring `AdminShellComponent` touches recently-merged code and all existing admin routes → **Mitigation**: route paths under `/admin/**` don't change, only the guard placement and the shell's nav content change; existing admin UI component tests should be unaffected.

## Open Questions

- None outstanding — all prior open questions (display-field type restriction, related-record interactivity, route pattern, delete confirmation) were resolved during exploration and are reflected above.
