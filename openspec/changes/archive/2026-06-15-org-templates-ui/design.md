## Context

The backend `org-templates` change (implemented, not yet archived) added a static catalog of four templates and two admin-only endpoints:

- `GET /api/templates` → `TemplateSummary[]`, each `{ key, name, description, objects: { apiName, name, pluralName, fieldCount }[] }`.
- `POST /api/templates/:key/apply` → `404 TEMPLATE_NOT_FOUND` for an unknown key, or `200` with `ApplyTemplateResultData`: `{ templateKey, created: { apiName, id, fieldsCreated: string[], fieldsSkipped: { apiKey, reason: "LOOKUP_TARGET_ARCHIVED" }[] }[], skipped: { apiName, reason: "OBJECT_ALREADY_EXISTS" }[] }`.

On the frontend, `dynamic-records-ui` (implemented) made `AppShellComponent` the shell for all authenticated routes, with a `CONFIGURATION` nav section (Objects, Users) shown only `@if (isAdmin())`, and `/admin/**` routes additionally gated by `adminGuard`. `ObjectsService`/`ObjectsPage` (`apps/web/src/app/admin/objects/`) establish the conventions for an admin list page: a service wrapping `HttpClient` with `ApiResponse<T>` + `firstValueFrom`/`catchError`, a page component with `signal`-based state (`loading`, `errorMessage`, data list), and `MatDialog`-based create/confirm flows (`CreateObjectDialog`, inline `ArchiveConfirmDialog`).

This change adds the missing UI: a `/admin/templates` page and a sidebar entry, following those conventions.

## Goals / Non-Goals

**Goals:**
- Admin can see all four templates with enough detail (name, description, the objects + field counts each would create) to decide whether to apply one.
- Admin can apply a template and see, without leaving the page, which objects were created vs. skipped (and why), and which fields within a created object were skipped (and why).
- Admin can re-run `apply` safely (idempotent backend) and the UI clearly shows a "nothing new" result rather than looking like an error.
- "Templates" is reachable from the admin sidebar, admin-only, consistent with the existing Objects/Users entries.

**Non-Goals:**
- No template editing, custom/user-defined templates, or per-field preview beyond `fieldCount` (the catalog is static and code-reviewed; full field lists are visible after applying, via `/admin/objects`).
- No persisted "this template has been applied" flag — each page load shows all four templates as applicable; the per-apply result is the only feedback (consistent with the backend's stateless, idempotent design).
- No automatic application at org creation — always an explicit admin click.

## Decisions

### 1. One page, template list as expansion panels — no separate "detail" route

`/admin/templates` (`TemplatesPage`, mirrors `ObjectsPage`'s `ngOnInit` → `TemplatesService.list()` → `signal` pattern) renders the four templates as `MatExpansionPanel`s (or `MatCard`s with an expandable object list — final markup detail left to implementation, but no extra route). Each panel shows the template `name` + `description` in the header, and an expanded body listing `objects` as chips/rows: `pluralName` + `fieldCount` (e.g. "Deals · 9 fields"). An "Apply Template" button sits in each panel.

Alternative considered: a master/detail layout (`/admin/templates` list → `/admin/templates/:key` detail), mirroring `objects-page` → `object-detail-page`. Rejected — a template's "detail" is just its object/field-count list, which is small (≤5 objects) and fits comfortably inline; a second route and component would duplicate `objects-page`'s navigation pattern for no benefit, since there's nothing further to drill into (no per-field editing of a template).

### 2. Single dialog component handles confirm → apply → result

One `ApplyTemplateDialog` (opened with `MAT_DIALOG_DATA = TemplateSummary`) covers the whole flow with an internal `step` signal: `'confirm' | 'applying' | 'result'`.

- `'confirm'`: shows the template's object/field-count list again (same data as the panel) with "Apply" / "Cancel" buttons — a final check before a metadata-mutating call.
- `'applying'`: `Apply` click calls `TemplatesService.apply(key)`; shows a spinner, buttons disabled.
- `'result'`: renders `ApplyTemplateResultData` — a list of `created` objects (`apiName`, "N fields created", and any `fieldsSkipped` shown as a small warning line per field with a friendly message for `LOOKUP_TARGET_ARCHIVED`), and a list of `skipped` objects (`apiName` + friendly message for `OBJECT_ALREADY_EXISTS`). A single "Done" button closes the dialog; a secondary "View Objects" button (`routerLink`/`Router.navigate` to `/admin/objects`) is shown only if `created.length > 0`.

On error (`response.success === false`, e.g. network/`500`), `'result'` step shows the error message (same `errorMessage` signal pattern as `CreateObjectDialog`) with only "Close".

Alternative considered: confirmation dialog + separate result via `MatSnackBar`. Rejected — the result has structured per-object detail (created/skipped/fieldsSkipped) that doesn't fit a snackbar's one-line format, and a second dialog opening immediately after the first closes is a worse UX than one dialog transitioning state in place.

Friendly-reason mapping (`OBJECT_ALREADY_EXISTS` → "Already exists in your org — skipped", `LOOKUP_TARGET_ARCHIVED` → "Linked object is archived — field skipped") lives as a small `const` lookup in the dialog component, the only place these backend enum strings are displayed.

### 3. `TemplatesService` mirrors `ObjectsService`

New `apps/web/src/app/admin/templates/templates.service.ts`:

```ts
export interface TemplateObjectSummary { apiName: string; name: string; pluralName: string; fieldCount: number; }
export interface TemplateSummary { key: string; name: string; description: string; objects: TemplateObjectSummary[]; }
export interface CreatedTemplateObject { apiName: string; id: string; fieldsCreated: string[]; fieldsSkipped: { apiKey: string; reason: 'LOOKUP_TARGET_ARCHIVED' }[]; }
export interface SkippedTemplateObject { apiName: string; reason: 'OBJECT_ALREADY_EXISTS'; }
export interface ApplyTemplateResultData { templateKey: string; created: CreatedTemplateObject[]; skipped: SkippedTemplateObject[]; }

list(): Promise<ApiResponse<TemplateSummary[]>>          // GET  /api/templates
apply(key: string): Promise<ApiResponse<ApplyTemplateResultData>>  // POST /api/templates/:key/apply
```

Both methods follow the existing `firstValueFrom(... .pipe(catchError((err) => of(err.error as ApiResponse<T>))))` shape used throughout `ObjectsService`/`FieldsService`, so `TemplatesPage`/`ApplyTemplateDialog` can branch on `response.success` exactly like existing admin pages.

### 4. Routing and nav

`apps/web/src/app/app.routes.ts`: add a sibling to the existing `objects`/`objects/:id` admin children —
```ts
{ path: 'templates', loadComponent: () => import('./admin/templates/templates-page/templates-page').then((m) => m.TemplatesPage) },
```
inside the existing `path: 'admin'` group (already `adminGuard`-protected; no new guard needed).

`apps/web/src/app/shell/app-shell/app-shell.html`: add one `<a mat-list-item routerLink="/admin/templates" ...>` inside the existing `@if (isAdmin())` `CONFIGURATION` block, alongside Objects/Users, using an icon such as `dashboard_customize` to distinguish it from the `category` (Objects) icon. No change to `app-shell.ts` — `isAdmin()` already exists and gates the whole section.

## Risks / Trade-offs

- **[Risk]** The UI has no persisted record of "template X was applied to this org", so an admin who applies the same template twice sees an identical list of four templates and must read the `result` step to learn "everything was already there" → **Mitigation**: the result step's `skipped`/`fieldsSkipped` lists make a no-op apply unambiguous (all objects listed under "skipped" with "Already exists"), and this matches the backend's intentionally stateless/idempotent design (no DB schema change to track "applied templates" — out of scope per the backend change's non-goals).
- **[Risk]** Backend reason enums (`OBJECT_ALREADY_EXISTS`, `LOOKUP_TARGET_ARCHIVED`) are surfaced as raw strings if the frontend mapping misses a case (e.g. a future third reason) → **Mitigation**: the friendly-message lookup falls back to displaying the raw reason string, so a new backend reason degrades to "less pretty" rather than broken; component test covers the fallback.
- **[Risk]** `POST /api/templates/:key/apply` runs a multi-insert DB transaction and could take longer than a typical admin action → **Mitigation**: `'applying'` step shows a spinner and disables the dialog's buttons, same as `CreateObjectDialog`'s `saving` signal.

## Open Questions

- None — list/apply UX, result presentation, service shape, routing, and nav placement are all resolved above.
