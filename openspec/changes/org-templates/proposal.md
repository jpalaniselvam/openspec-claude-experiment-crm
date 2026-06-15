## Why

Today every organization starts completely blank: an admin must hand-build every object and field definition before anyone can record data. The PRD's "Default Templates" goal (`Less than 5 minutes to onboard a new tenant using templates`) is unmet. This change adds a library of starter data-model templates an admin can apply to their org in one action, turning the flexible data model from a schema-design tool into an instantly-usable CRM for common verticals.

## What Changes

- Add a built-in **template catalog** (server-side, no new tables) containing four starter templates, each a set of object definitions + field definitions using only existing field data types (`text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`):
  - **Sales CRM**: Company, Contact, Deal, Activity, Task (Contact/Deal/Activity/Task lookups back to Company/Deal/Contact as appropriate)
  - **Recruitment CRM**: Company, Recruiter, Job Opening, Candidate, Interview
  - **Automobile**: Customer, Salesperson, Vehicle, Sales Order, Service Appointment
  - **Real Estate CRM**: Agent, Property, Seller, Buyer, Lead
- Add `GET /api/templates`: lists the available templates (key, name, description, and a summary of the objects/fields each would create), restricted to `role = admin`.
- Add `POST /api/templates/:key/apply`: applies a template to the caller's organization, restricted to `role = admin`. For each object in the template:
  - If an object with the same `apiName` already exists in the org (archived or not), that object (and its fields) is **skipped** — no fields are added to or modified on a pre-existing object.
  - Otherwise the object definition and all of its field definitions are created, with `lookup` fields wired to the other newly-created objects in the same template (or to a pre-existing object of the same `apiName`, if the lookup target itself already existed and was skipped).
  - The response reports which objects were created and which were skipped (with the reason), so an admin can re-run a template safely (idempotent: a second `apply` of the same template creates nothing new).
- Each template object sets a sensible default `displayFieldApiKey`-eligible field as its first (`sortOrder = 0`) `text` field, so the existing default-display-field resolution (`resolveEffectiveDisplayField`) produces a human-readable label immediately, with no extra admin configuration.

## Capabilities

### New Capabilities
- `org-templates`: A catalog of starter data-model templates (Sales CRM, Recruitment CRM, Automobile, Real Estate CRM) and an admin-only API to list templates and apply one to the current organization, bulk-creating object and field definitions (including cross-object lookups) with idempotent, apiName-collision-safe behavior.

### Modified Capabilities
(none — template application is implemented purely as a new consumer of the existing object/field-definition creation logic; no existing API requirements change)

## Impact

- **Backend**: New `apps/backend/src/templates/` module containing the four template definitions (as data) and a `template-service.ts` that validates/applies them via the existing `object-definition-service`/`field-definition-service` create functions; new `apps/backend/src/routes/templates.ts` mounted at `/api/templates`, `requireAdmin`.
- **Database**: None — no new tables or columns. Templates are code, not data; applying one only inserts rows into the existing `object_definitions`/`field_definitions` tables.
- **Frontend**: None in this change — template application is exposed via API only (a future change can add an admin UI entry point, e.g. on first login or from the Objects admin page).
- **Tests**: New unit tests for the template catalog (each template's field types/lookups are internally consistent) and `template-service` (apply creates expected objects/fields, skip-on-collision, idempotent re-apply, cross-template lookup wiring); new integration tests for `GET /api/templates` and `POST /api/templates/:key/apply` (admin-only, `403` for members, `404` for unknown template key).
