## Why

The flexible data model backend (objects, fields, dynamic records) is fully live, but there is zero UI to manage it. Admins cannot create objects, define fields, or configure the schema without calling raw APIs. This change makes the feature usable by putting a polished Angular admin UI in front of the existing backend.

## What Changes

- Add a collapsible sidebar shell layout for all admin pages, replacing the current link-based navigation
- Add an **Objects** admin section at `/admin/objects` with list, create, edit, and archive capabilities
- Add a **Fields** section embedded within each object's detail page at `/admin/objects/:id`, with create, edit (limited), and delete capabilities
- Add a reusable `DynamicFormComponent` that renders a reactive Angular form from `FieldDefinition[]` metadata — powers both the field preview in admin and future record CRUD UIs
- Restructure routing to nest all admin routes under a shared `AdminShellComponent`

## Capabilities

### New Capabilities

- `object-definitions-admin-ui`: Admin UI for managing object definitions — list, create, edit (name/description/icon/color), and archive objects. The `apiName` is auto-derived from the object name on creation and is immutable afterward.
- `field-definitions-admin-ui`: Admin UI for managing field definitions per object — list, create, delete, and limited edit (name/description/flags only). Field `dataType` and `apiKey` are immutable after creation.
- `dynamic-form-renderer`: Reusable Angular component that takes a `FieldDefinition[]` and renders a fully functional Angular reactive form. Supports all field types: text, long_text, number, decimal, boolean, date, datetime, email, phone, url, picklist, and lookup.
- `admin-shell-nav`: Collapsible sidebar navigation shell that wraps all admin routes, with sections for Dashboard, Objects, and Users.

### Modified Capabilities

- `object-definitions`: No requirement changes — the existing spec remains valid. UI consumes existing `GET/POST/PATCH /api/objects` endpoints as-is.
- `field-definitions`: No requirement changes — the existing spec remains valid. UI consumes existing `GET/POST/PATCH/DELETE /api/objects/:id/fields` endpoints as-is.

## Impact

- **Frontend routing**: `app.routes.ts` restructured to use lazy-loaded `AdminShellComponent` as a parent route for all `/admin/*` paths
- **New Angular services**: `ObjectsService`, `FieldsService` (mirror the existing `UsersService` pattern)
- **New Angular components**: `AdminShellComponent`, `ObjectsPageComponent`, `ObjectDetailPageComponent`, `CreateObjectDialogComponent`, `EditObjectDialogComponent`, `CreateFieldDialogComponent`, `EditFieldDialogComponent`, `DynamicFormComponent`
- **Dependencies**: Requires `MatNativeDateModule` for datepicker support if not already present; `MatIconModule` for Material icon name input/preview; `MatChipsModule` for picklist options management; `MatSidenavModule` for the collapsible shell
- **No backend changes required**: All backend APIs are already live
