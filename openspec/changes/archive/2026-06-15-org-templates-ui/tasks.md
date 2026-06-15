## 1. Templates service

- [x] 1.1 Create `apps/web/src/app/admin/templates/templates.service.ts` with `TemplateObjectSummary`, `TemplateSummary`, `CreatedTemplateObject`, `SkippedTemplateObject`, and `ApplyTemplateResultData` interfaces matching the backend (`apps/backend/src/services/template-service.ts`)
- [x] 1.2 Implement `TemplatesService.list(): Promise<ApiResponse<TemplateSummary[]>>` (`GET /api/templates`) and `TemplatesService.apply(key: string): Promise<ApiResponse<ApplyTemplateResultData>>` (`POST /api/templates/:key/apply`), following the `ObjectsService` pattern (`firstValueFrom` + `catchError` → `ApiResponse<T>`)

## 2. Templates page

- [x] 2.1 Create `apps/web/src/app/admin/templates/templates-page/templates-page.ts` (+ `.html`, `.scss`): on `ngOnInit`, call `TemplatesService.list()` into `signal`-based `templates`/`loading`/`errorMessage` state, following `ObjectsPage`'s structure
- [x] 2.2 Render each template as an expandable panel/card showing `name`, `description`, and its `objects` (each `pluralName` + `fieldCount`), with an "Apply Template" button per template
- [x] 2.3 Add empty/loading/error states consistent with `ObjectsPage` (spinner while loading, error message banner on failure)

## 3. Apply template dialog

- [x] 3.1 Create `apps/web/src/app/admin/templates/apply-template-dialog/apply-template-dialog.ts` (+ `.html`, `.scss`), opened with `MAT_DIALOG_DATA: TemplateSummary`, with a `step` signal (`'confirm' | 'applying' | 'result'`)
- [x] 3.2 `'confirm'` step: show the template's object/field-count summary with "Apply" and "Cancel" actions; "Cancel" closes the dialog without calling the API
- [x] 3.3 `'applying'` step: on "Apply" click, call `TemplatesService.apply(template.key)`, show a spinner, and disable actions until the response resolves
- [x] 3.4 `'result'` step (success): render `created` (apiName + fields-created count, plus any `fieldsSkipped` with a friendly `LOOKUP_TARGET_ARCHIVED` message) and `skipped` (apiName + friendly `OBJECT_ALREADY_EXISTS` message); show a "View Objects" button (navigates to `/admin/objects`) only when `created.length > 0`, and a "Done" button that closes the dialog
- [x] 3.5 `'result'` step (failure): if `apply()` returns `success: false`, show the error message with a "Close" action only
- [x] 3.6 Add a small `const` friendly-reason lookup (`OBJECT_ALREADY_EXISTS`, `LOOKUP_TARGET_ARCHIVED`) with a fallback to the raw reason string for unrecognized values

## 4. Routing and navigation

- [x] 4.1 In `apps/web/src/app/app.routes.ts`, add `{ path: 'templates', loadComponent: () => import('./admin/templates/templates-page/templates-page').then((m) => m.TemplatesPage) }` alongside the existing `objects`/`objects/:id` children under the `admin` route group
- [x] 4.2 In `apps/web/src/app/shell/app-shell/app-shell.html`, add a "Templates" nav item (e.g. `dashboard_customize` icon, `routerLink="/admin/templates"`, `id="nav-templates"`) inside the existing `@if (isAdmin())` Configuration section, alongside Objects and Users

## 5. Tests

- [x] 5.1 Add `apps/web/src/app/admin/templates/templates.service.spec.ts` (or equivalent) covering `list()` and `apply()` success/error response handling
- [x] 5.2 Add `apps/web/src/app/admin/templates/templates-page/templates-page.spec.ts`: renders all four templates from a mocked `list()`, shows loading/error states
- [x] 5.3 Add `apps/web/src/app/admin/templates/apply-template-dialog/apply-template-dialog.spec.ts`: confirm→applying→result (created+skipped) happy path, idempotent re-apply (all skipped), `fieldsSkipped`/`LOOKUP_TARGET_ARCHIVED` rendering, and apply-failure error rendering
- [x] 5.4 Add/update `apps/web/src/app/shell/app-shell/app-shell.spec.ts`: admin sees the "Templates" nav item linking to `/admin/templates`; non-admin does not see it

## 6. Verification

- [x] 6.1 Run the frontend test suite (`pnpm --filter web test`) and confirm all new and existing tests pass
