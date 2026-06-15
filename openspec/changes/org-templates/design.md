## Context

`object_definitions` and `field_definitions` are created today through `object-definition-service.createObjectDefinition` and `field-definition-service.createFieldDefinition`, each doing one collision check + one insert + (for fields) one `schemaVersion` increment, using the singleton `db` client (`apps/backend/src/db/client.ts`, `drizzle(pool, { schema })`). `apiName` is unique per `(organizationId, apiName)` regardless of `isArchived` (`object_definitions_org_api_name_idx`); `apiKey` is unique per `(objectDefinitionId, apiKey)`. `lookup` fields store a `lookupObjectDefinitionId` (a real FK to `object_definitions.id`) and are validated to point at a non-archived object in the same org.

This change adds a **template catalog** — static, in-code descriptions of object+field sets for four verticals — and a **template-service** that turns one catalog entry into real `object_definitions`/`field_definitions` rows for the caller's org, including `lookup` fields that reference *other objects created in the same apply call*.

## Goals / Non-Goals

**Goals:**
- Define the four templates (Sales CRM, Recruitment CRM, Automobile, Real Estate CRM) as plain TypeScript data, using only the 12 existing field `dataType`s.
- `POST /api/templates/:key/apply` creates every non-colliding object+field in the template for the caller's org, atomically.
- Re-running `apply` for a template that's already (partially) applied is a no-op for objects that already exist (idempotent at the `apiName` level).
- `lookup` fields within a template resolve correctly whether their target object was just created in this call or already existed in the org.
- Each template object's first field is a `text`/`long_text` field at `sortOrder = 0`, so `resolveEffectiveDisplayField` gives it a sensible display label with zero extra config.

**Non-Goals:**
- No admin UI for browsing/applying templates (API only; UI is a future change).
- No automatic template application at org-creation time — always an explicit admin action.
- No user-defined/custom templates, template versioning, or "update an already-applied template" flow.
- No many-to-many/junction-object support — all relationships in these templates are single-valued `lookup` (one-to-many from the lookup's perspective), consistent with what `field-definitions` supports today.
- No changes to `object-definitions`/`field-definitions` API contracts or validation rules.

## Decisions

### 1. Templates are static TypeScript data, not DB rows

Each template is a const object: `{ key, name, description, objects: TemplateObject[] }`, where `TemplateObject = { apiName, name, pluralName, description?, icon?, color?, fields: TemplateField[] }` and `TemplateField` mirrors `CreateFieldInput` but with `lookupTargetApiName?: string` (a *template-local* `apiName` reference) instead of `lookupObjectDefinitionId`.

Lives at `apps/backend/src/templates/` — one file per template (`sales-crm.ts`, `recruitment-crm.ts`, `automobile.ts`, `real-estate.ts`) plus an `index.ts` registry (`Record<string, Template>`) keyed by `key`.

Alternative considered: seed templates as rows in a `templates`/`template_objects`/`template_fields` table set, applied via a generic interpreter. Rejected — templates are a fixed, code-reviewed catalog (not tenant-editable), so a DB schema for them adds migration overhead with no runtime benefit; TS data gets type-checking and is trivial to unit-test for internal consistency.

### 2. Apply is a single DB transaction with direct inserts (not a loop over the existing create-services)

`applyTemplate(organizationId, key)`:

1. Look up the template by `key` (404 `TEMPLATE_NOT_FOUND` if unknown).
2. `db.transaction(async (tx) => { ... })`:
   a. Load existing `object_definitions` for the org where `apiName IN (template's apiNames)` (any `isArchived` value) → `existingByApiName: Map<apiName, { id, isArchived }>`.
   b. **Phase 1 — objects**: for each template object whose `apiName` is *not* in `existingByApiName`, insert into `object_definitions` (apiName, name, pluralName, description, icon, color; `schemaVersion` set to `1 + fields.length` to reflect "initial + N field additions", matching the increment-per-field semantics of `createFieldDefinition`). Record the new `id`. Objects whose `apiName` *is* in `existingByApiName` are recorded as `skipped: OBJECT_ALREADY_EXISTS` and contribute their existing `id` to the apiName→id map for lookup resolution.
   b. Build `apiNameToId: Map<apiName, id>` = existing ∪ newly-created.
   c. **Phase 2 — fields**: for each *newly-created* template object, for each field in declaration order: if `dataType === "lookup"`, resolve `lookupObjectDefinitionId = apiNameToId.get(field.lookupTargetApiName)`.
      - If the target is missing from the map entirely → this is a template-authoring bug, not a runtime condition; throw (fails the whole transaction, surfaced as `500` — caught by unit tests on the catalog, never expected in practice).
      - If the target resolved to an `existingByApiName` entry that is `isArchived: true` → skip *this field only* (recorded in the response as a per-object `fieldsSkipped` note: `LOOKUP_TARGET_ARCHIVED`), since `field-definitions`' own validation rejects lookups to archived objects and we don't want to violate that invariant via a bypass.
      - Otherwise insert the `field_definitions` row directly (apiKey, name, dataType, flags, defaultValue, options, lookupObjectDefinitionId, sortOrder).
3. Return `{ templateKey, created: [...], skipped: [...] }` (shape in proposal.md).

This bypasses `createObjectDefinition`/`createFieldDefinition` and re-implements their inserts directly inside the transaction.

Alternative considered: refactor both services so every DB call takes an optional `tx` (Drizzle transaction handle) instead of importing the singleton `db`, then call them in a loop inside `db.transaction`. Rejected for this change — it's a cross-cutting signature change to two existing services (and their ~15 call sites/tests) for the sole benefit of one new feature; the direct-insert approach keeps the blast radius to one new module. The duplicated insert logic is small (two `db.insert(...).values(...)` calls) and is exercised by the new tests described in the proposal. If a third consumer needing transactional bulk-create appears later, that's the trigger to do the `tx`-parameter refactor.

### 3. Collision policy: skip at the object level, never modify existing objects

If `apiName` collides (object exists, archived or not), the *entire* template object is skipped — no field-level merging into a pre-existing object, even if that object happens to be missing some of the template's fields. This keeps `apply` idempotent and side-effect-free on data an admin may have already customized.

Alternative considered: "merge" mode that adds any missing template fields to an existing same-`apiName` object. Rejected — indistinguishable from a silent schema migration of a possibly-hand-edited object; out of scope per non-goals ("update an already-applied template").

### 4. Display field: rely on default resolution, don't set `displayFieldApiKey`

Every template object's fields are ordered so a `text`/`long_text` field is `sortOrder = 0`. `resolveEffectiveDisplayField` (existing, `object-definition-service.ts`) already returns "first `text`/`long_text` field by `sortOrder`" when `displayFieldApiKey` is `null` — which is the inserted row's default. No extra `UPDATE` is needed.

Alternative considered: explicitly set `displayFieldApiKey` on each created object via a third phase. Rejected — purely redundant given the default-resolution rule; one fewer write, one fewer thing that could disagree with the field actually at `sortOrder = 0`.

### 5. Route + access: `/api/templates`, `requireAdmin`

New router `apps/backend/src/routes/templates.ts`, mounted at `/api/templates`, both routes `requireAdmin` (template application changes org-wide metadata, same trust level as `POST /api/objects`). `GET /api/templates` is static catalog data (no DB access) — admin-only mainly because it's a precursor to `apply` and there's no current end-user use case for browsing it.

## Risks / Trade-offs

- **[Risk]** Direct-insert approach (Decision 2) duplicates a slice of `createObjectDefinition`/`createFieldDefinition`'s insert logic → **Mitigation**: the duplicated portion is small and static (no user input flows through it beyond the `key` path param); catalog-consistency unit tests + apply integration tests cover both.
- **[Risk]** A template referencing a `lookupTargetApiName` not present anywhere in the same template (typo) would throw mid-transaction → **Mitigation**: this is a build-time/catalog bug, caught by a unit test that validates every `lookupTargetApiName` in every template resolves to another object in the same template before any DB code runs.
- **[Risk]** Two concurrent `apply` calls for the same org/template could both pass the collision check and double-insert → **Mitigation**: the existing `object_definitions_org_api_name_idx` unique index turns the second transaction's insert into a unique-violation error; acceptable (admin-only, low-frequency, rare-race operation) — surfaced as a `500` rather than a friendly skip, not worth a retry loop for this change.
- **[Risk]** `schemaVersion = 1 + fields.length` (Decision 2b) is an implementation detail that must stay consistent with `createFieldDefinition`'s "+1 per field" semantics if that semantics ever changes → **Mitigation**: covered by a unit test asserting `schemaVersion` on a freshly-applied template object equals `1 + its field count`.

## Open Questions

- None — template content, apply semantics, collision/idempotency behavior, and transaction strategy are all resolved above.
