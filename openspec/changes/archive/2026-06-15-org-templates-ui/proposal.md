## Why

The backend `org-templates` change added a catalog of four starter data-model templates (Sales CRM, Recruitment CRM, Automobile, Real Estate CRM) and `GET /api/templates` / `POST /api/templates/:key/apply`, but there is no UI entry point — an admin can only discover and apply a template by calling the API directly. The PRD's "Default Templates" onboarding goal (`< 5 minutes to onboard a new tenant using templates`) remains unmet until an admin can browse and apply a template from the app.

## What Changes

- Add a new admin page at `/admin/templates` that lists the four catalog templates (name, description, and the objects/fields each would create), fetched from `GET /api/templates`.
- Add an "Apply" action per template that opens a confirmation dialog summarizing the objects to be created, then calls `POST /api/templates/:key/apply`.
- After apply, show the result inline (or via a follow-up dialog/snackbar): which objects were created vs. skipped (with reason, e.g. `OBJECT_ALREADY_EXISTS`), and any per-object fields skipped (`LOOKUP_TARGET_ARCHIVED`). On success, prompt the admin to view the new objects in `/admin/objects`.
- Add a "Templates" entry to the admin sidebar (Configuration section), visible only to admins, routed to `/admin/templates`.
- Add an `apps/web/src/app/admin/templates/templates.service.ts` wrapping the two existing endpoints, following the `ObjectsService` pattern (typed responses, `ApiResponse<T>`, `firstValueFrom`).

## Capabilities

### New Capabilities
- `org-templates-admin-ui`: An admin-only page that lists the built-in org templates (with their constituent objects/fields) and lets an admin apply one to their organization, showing the created/skipped results.

### Modified Capabilities
- `admin-shell-nav`: The Configuration section of the admin sidebar gains a "Templates" nav item (`/admin/templates`), alongside the existing Objects and Users links.

## Impact

- **Frontend**: New `apps/web/src/app/admin/templates/` module: `templates.service.ts`, `templates-page/` (list + apply), and an apply-confirmation dialog component. Update `apps/web/src/app/app.routes.ts` to register `admin/templates` under the existing admin route group, and `apps/web/src/app/shell/app-shell/app-shell.html`/`.ts` to add the sidebar nav item.
- **Backend**: None — consumes the existing `GET /api/templates` and `POST /api/templates/:key/apply` endpoints unchanged.
- **Database**: None.
- **Tests**: New unit/component tests for `TemplatesService` and the templates page (list rendering, apply flow, created/skipped result display, admin-only visibility of the nav item).
