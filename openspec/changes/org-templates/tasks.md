## 1. Template catalog data

- [x] 1.1 Define `TemplateField`, `TemplateObject`, and `Template` types in `apps/backend/src/templates/types.ts` — `TemplateField` mirrors `CreateFieldInput` (apiKey, name, dataType, isRequired, isUnique, isSearchable, isReadOnly, defaultValue, options, sortOrder) but with `lookupTargetApiName?: string` instead of `lookupObjectDefinitionId`; `TemplateObject` has `apiName`, `name`, `pluralName`, optional `description`/`icon`/`color`, and `fields: TemplateField[]`; `Template` has `key`, `name`, `description`, `objects: TemplateObject[]`
- [x] 1.2 Create `apps/backend/src/templates/sales-crm.ts`: Company, Contact, Deal, Activity, Task objects with fields per design (each object's `sortOrder = 0` field is `text`), `lookup` fields wired via `lookupTargetApiName` (Contact→Company; Deal→Company,Contact; Activity→Deal,Contact; Task→Deal)
- [x] 1.3 Create `apps/backend/src/templates/recruitment-crm.ts`: Company, Recruiter, Job Opening, Candidate, Interview objects (Job Opening→Company,Recruiter; Candidate→Job Opening; Interview→Candidate,Job Opening,Recruiter)
- [x] 1.4 Create `apps/backend/src/templates/automobile.ts`: Customer, Salesperson, Vehicle, Sales Order, Service Appointment objects (Vehicle→Customer as owner; Sales Order→Customer,Vehicle,Salesperson; Service Appointment→Vehicle,Customer)
- [x] 1.5 Create `apps/backend/src/templates/real-estate.ts`: Agent, Property, Seller, Buyer, Lead objects (Property→Agent as listing agent; Seller→Property; Buyer→Agent; Lead→Property,Agent)
- [x] 1.6 Create `apps/backend/src/templates/index.ts`: a `templates: Record<string, Template>` registry keyed by `key` (`sales-crm`, `recruitment-crm`, `automobile`, `real-estate-crm`), plus `getTemplate(key)` and `listTemplateSummaries()` helpers
- [x] 1.7 Add `apps/backend/src/templates/templates.test.ts`: catalog-consistency unit tests — all four keys present; every field's `dataType` is one of the 12 supported types; every object's `sortOrder = 0` field is `text`/`long_text`; every `lookupTargetApiName` resolves to another object's `apiName` within the same template

## 2. Template service

- [x] 2.1 Create `apps/backend/src/services/template-service.ts` with `listTemplates()` returning `listTemplateSummaries()` output (key, name, description, per-object apiName/name/pluralName/fieldCount)
- [x] 2.2 Implement `applyTemplate(organizationId, key)`: return `{ ok: false, code: "TEMPLATE_NOT_FOUND" }` if `key` isn't in the registry
- [x] 2.3 Inside `db.transaction`, load existing `object_definitions` for the org where `apiName` is in the template's object `apiName`s (any `isArchived`), building `existingByApiName: Map<apiName, { id, isArchived }>`
- [x] 2.4 Phase 1: for each template object not in `existingByApiName`, insert into `object_definitions` (apiName, name, pluralName, description, icon, color, `schemaVersion = 1 + fields.length`, `displayFieldApiKey = null`); record `id`; for colliding objects, record `skipped: { apiName, reason: "OBJECT_ALREADY_EXISTS" }`. Build `apiNameToId: Map<apiName, id>` from both new and existing
- [x] 2.5 Phase 2: for each newly-created object's fields (in order), insert into `field_definitions`; for `dataType === "lookup"`, resolve `lookupObjectDefinitionId` via `apiNameToId`. If the resolved target is in `existingByApiName` and `isArchived`, skip that field and record it under the object's `fieldsSkipped: [{ apiKey, reason: "LOOKUP_TARGET_ARCHIVED" }]` instead of inserting
- [x] 2.6 Assemble and return `{ ok: true, result: { templateKey, created: [{ apiName, id, fieldsCreated, fieldsSkipped }], skipped: [{ apiName, reason }] } }`
- [x] 2.7 Add `apps/backend/src/services/template-service.test.ts`: apply `sales-crm` to a fresh org creates all 5 objects + expected field counts; re-apply is idempotent (all skipped, no new rows); pre-existing `company` object causes it to be skipped while Contact/Deal/Activity/Task still get created; created `Contact.company` and `Deal.company`/`Deal.primary_contact` lookups resolve to sibling objects' ids; pre-existing archived `company` causes `Contact`/`Deal` to be created without their `company` lookup field (`LOOKUP_TARGET_ARCHIVED`); created objects have `schemaVersion === 1 + fieldCount` and `displayFieldApiKey === null`, and `resolveEffectiveDisplayField` returns the `sortOrder = 0` field's `apiKey`

## 3. Routes

- [x] 3.1 Create `apps/backend/src/routes/templates.ts`: `GET /` (`requireAuth` + `requireAdmin`) returns `listTemplates()`; `POST /:key/apply` (`requireAdmin`) calls `applyTemplate`, returns `404 TEMPLATE_NOT_FOUND` if unknown, otherwise `200` with the result
- [x] 3.2 Mount the router in `apps/backend/src/app.ts`: `app.use("/api/templates", templatesRouter)`
- [x] 3.3 Add `apps/backend/src/routes/templates.test.ts`: admin `GET /api/templates` → `200` with all four templates; member `GET /api/templates` → `403 FORBIDDEN`; admin `POST /api/templates/sales-crm/apply` on a fresh org → `200`, then `GET /api/objects` includes Company/Contact/Deal/Activity/Task and `GET /api/objects/:id/fields` for Contact includes a `company` lookup field with the Company object's `id`; member `POST /api/templates/sales-crm/apply` → `403 FORBIDDEN`; `POST /api/templates/unknown-key/apply` → `404 TEMPLATE_NOT_FOUND`

## 4. Verification

- [x] 4.1 Run the backend test suite (`pnpm --filter backend test`) and confirm all new and existing tests pass
