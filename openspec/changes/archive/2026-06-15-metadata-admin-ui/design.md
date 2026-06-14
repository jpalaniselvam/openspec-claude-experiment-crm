## Context

The flexible data model backend is fully implemented. Object definitions, field definitions, and dynamic records are managed via live REST APIs. However, there is no Angular UI to interact with these APIs — admins must use raw HTTP calls to configure tenant schemas.

The existing admin UI pattern (Users page) uses:
- Standalone Angular components with signals
- Angular Material (MatTable, MatDialog, MatFormField, MatSelect, MatToolbar)
- `HttpClient` + `firstValueFrom` in injectable services
- `ApiResponse<T>` union type (`{ success: true, data: T } | { success: false, error: { code, message } }`)
- No NgModules (standalone component architecture throughout)

The app currently has flat routing: `/login`, `/dashboard`, `/admin/users`. There is no shared layout or navigation shell.

## Goals / Non-Goals

**Goals:**
- Introduce a collapsible `MatSidenav`-based shell for all admin routes
- Build object definitions admin: list, create (dialog), edit (dialog), archive with toggle
- Build field definitions admin: list embedded in object detail page, create (dialog), edit limited (dialog), delete with confirmation
- Build a reusable `DynamicFormComponent` that renders a reactive `FormGroup` from `FieldDefinition[]` metadata, covering all 12 field types
- Keep `apiName` (objects) and `apiKey` (fields) immutable after creation — derive them on creation, lock in UI
- Keep `dataType` immutable after creation — shown as a static badge in the edit dialog

**Non-Goals:**
- Drag-and-drop field reordering (sortOrder editing deferred)
- Conditional field visibility rules
- Field-level permissions UI
- Record CRUD UI (dynamic form is built to support it, but the records pages are a separate change)
- Bulk operations on objects or fields

## Decisions

### D1: Admin Shell with MatSidenav (not per-page toolbars)

**Decision**: Replace per-page `MatToolbar` navigation with a single `AdminShellComponent` wrapping all `/admin/**` routes via a child route configuration. The shell hosts a `MatSidenav` that is collapsible to icon-only mode.

**Rationale**: The users page uses a standalone toolbar with nav links. As admin sections grow (objects, fields, reports, settings), each page would need to duplicate nav. A shared shell eliminates this and provides a consistent admin UX.

**Alternative considered**: Keep per-page toolbars, add links. Rejected — doesn't scale and requires updating every page when new sections are added.

### D2: Object CRUD via Dialogs (not dedicated pages)

**Decision**: Create and edit object definitions via `MatDialog`, not separate routes. Archive is an inline action on the list row.

**Rationale**: Object forms are relatively compact (name, pluralName, description, icon, color). Dialogs keep the user in the context of the list and avoid unnecessary navigation. This matches the Users admin pattern already established.

**Alternative considered**: Dedicated create/edit routes. Rejected for this scope — would require more routing structure and back-navigation handling without meaningful UX gain for the form size.

### D3: Field Management on Object Detail Page (not separate route)

**Decision**: Field definitions are shown as a section on `/admin/objects/:id`. Create/edit fields via dialogs launched from that page.

**Rationale**: Fields are subordinate to their object. Showing them in the object context (along with the object's metadata) keeps the relationship visible. The detail page also serves as the landing point after clicking an object in the list.

### D4: DynamicFormComponent as a Shared Standalone Component

**Decision**: Place `DynamicFormComponent` in `src/app/shared/dynamic-form/` as a standalone Angular component. It accepts `fields: FieldDefinition[]` and an optional `value: Record<string, unknown>` (for edit pre-fill). It exposes a `formGroup` property that the parent can read to get form state.

**Rationale**: Placing it in `shared/` makes it importable by both admin dialogs (for future field preview) and the upcoming dynamic records UI. The component builds a `FormGroup` programmatically using `FormBuilder`, mapping each field's `dataType` to the appropriate control and validators.

**Lookup field handling**: Lookup fields make an async call to `/api/records/:objectApiName` to populate a `MatSelect`. The object API name is resolved by looking up the `lookupObjectDefinitionId` in the already-loaded objects list (passed as an optional `objects` input).

### D5: apiName / apiKey Auto-Generation

**Decision**: `apiName` is derived on the frontend when the user types the object name: lowercased, spaces replaced with underscores, special characters stripped. The derived value is shown read-only in the create dialog so the user can see it. In the edit dialog the field is shown as a locked chip/badge. Same pattern for field `apiKey`.

**Rationale**: Admins shouldn't need to type API names manually, but they must be able to verify what will be generated. Locking after save prevents orphan data (records stored under the old key).

### D6: MatNativeDateModule for Date Pickers

**Decision**: Use `MatNativeDateModule` (zero external dependency) for date/datetime fields in the dynamic form.

**Rationale**: The project has no existing date library dependency. Luxon/Moment would add weight. Native Date is sufficient for admin and basic record forms.

## Risks / Trade-offs

- **Lookup field latency** → The dynamic form must fetch records for lookup dropdowns. Mitigation: show a loading spinner in the MatSelect and handle empty/error state gracefully with a disabled placeholder.

- **Routing refactor breaks `/admin/users`** → Nesting users under the admin shell changes the component hierarchy. The `UsersPage` currently uses its own `MatToolbar` for nav — this toolbar should be removed (or made shell-aware) after the shell is introduced. Mitigation: update `UsersPage` to drop its top-level toolbar during this change.

- **Field type immutability UX confusion** → Users may not immediately understand why `dataType` is not editable. Mitigation: show a tooltip/hint "Field type cannot be changed after creation to protect existing record data."

- **Icon name validation** → The icon input accepts a free-text Material icon name. Invalid names render a broken icon. Mitigation: show a live preview of the icon using `<mat-icon>` as the user types, so they get immediate feedback.

## Migration Plan

No data migration required. No breaking API changes. Deployment is frontend-only:
1. Deploy updated Angular app
2. Verify `/admin/objects` route is accessible to admin users
3. Existing `/admin/users` route continues to work under the new shell

Rollback: revert the frontend build — no persistent state changes.
