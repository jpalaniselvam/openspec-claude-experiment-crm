## 1. Foundation & Routing Refactor

- [x] 1.1 Install any missing Angular Material modules: verify `MatSidenavModule`, `MatChipsModule`, `MatDatepickerModule`, `MatNativeDateModule`, `MatSlideToggleModule`, `MatIconModule`, `MatTooltipModule` are available in the project
- [x] 1.2 Create `AdminShellComponent` (`src/app/admin/admin-shell/`) with a `MatSidenav`-based layout — collapsible sidebar with toggle button, nav links for Dashboard, Objects, Users, and a `<router-outlet>` in the main content area
- [x] 1.3 Update `app.routes.ts` to nest all `/admin/**` routes as children of the `AdminShellComponent`, using lazy `loadComponent` for each child page
- [x] 1.4 Update `UsersPage` to remove its standalone `MatToolbar` nav (navigation is now owned by the admin shell)

## 2. Angular Services

- [x] 2.1 Create `ObjectsService` (`src/app/admin/objects/objects.service.ts`) with `list()`, `create()`, `update()`, and typed interfaces: `ObjectDefinition`, `CreateObjectInput`, `UpdateObjectInput`
- [x] 2.2 Create `FieldsService` (`src/app/admin/objects/fields.service.ts`) with `list(objectId)`, `create(objectId)`, `update(objectId, fieldId)`, `delete(objectId, fieldId)`, and typed interfaces: `FieldDefinition`, `CreateFieldInput`, `UpdateFieldInput`

## 3. Object Definitions Admin UI

- [x] 3.1 Create `ObjectsPageComponent` (`src/app/admin/objects/objects-page/`) — table with columns: icon, name, apiName, field count, status; "Create Object" button; "Show Archived" toggle; archive action per row
- [x] 3.2 Create `CreateObjectDialogComponent` (`src/app/admin/objects/create-object-dialog/`) — form with name, pluralName, description, icon (MatInput with live `<mat-icon>` preview), color (color input); auto-derive and display read-only `apiName` from the name field
- [x] 3.3 Create `EditObjectDialogComponent` (`src/app/admin/objects/edit-object-dialog/`) — same fields as create but `apiName` shown as a locked chip/badge; pre-populated with existing values
- [x] 3.4 Wire archive action on `ObjectsPageComponent`: open `MatDialog` confirmation with the archive warning message, then PATCH `isArchived: true` on confirm
- [x] 3.5 Create `ObjectDetailPageComponent` (`src/app/admin/objects/object-detail-page/`) — shows object metadata at top (name, apiName, description, icon, color) with an Edit button that opens `EditObjectDialogComponent`

## 4. Field Definitions Admin UI

- [x] 4.1 Add a "Fields" section to `ObjectDetailPageComponent` — table with columns: name, apiKey, dataType (badge/chip), required, unique, searchable; "Add Field" button; edit and delete actions per row
- [x] 4.2 Create `CreateFieldDialogComponent` (`src/app/admin/objects/create-field-dialog/`) — fields: name (auto-derives apiKey shown read-only), dataType dropdown (all 12 types), isRequired/isUnique/isSearchable/isReadOnly checkboxes; conditionally show picklist chip-input (when type=picklist) or lookup object dropdown (when type=lookup)
- [x] 4.3 Create `EditFieldDialogComponent` (`src/app/admin/objects/edit-field-dialog/`) — editable: name, isRequired, isUnique, isSearchable, isReadOnly; dataType shown as static badge with tooltip "Field type cannot be changed after creation"; apiKey shown as immutable
- [x] 4.4 Wire delete action on the fields table: open `MatDialog` confirmation, then call `FieldsService.delete()`; handle `FIELD_IN_USE` error with a descriptive message

## 5. Dynamic Form Component

- [x] 5.1 Create `DynamicFormComponent` (`src/app/shared/dynamic-form/`) as a standalone Angular component that accepts `fields: FieldDefinition[]` and optional `value: Record<string, unknown>`
- [x] 5.2 Implement `FormGroup` construction in `DynamicFormComponent`: iterate `fields`, create a `FormControl` per field with `Validators.required` if `isRequired`, and disable the control if `isReadOnly`
- [x] 5.3 Implement widget rendering in `dynamic-form.html`: use `@switch` (or `@if`) on `field.dataType` to render the correct Material widget for each type — `MatInput` (text/email/phone/url), `MatTextarea` (long_text), `MatInput[type=number]` (number/decimal), `MatSlideToggle` (boolean), `MatDatepicker` (date), `MatDatepicker` + time input (datetime), `MatSelect` from `options[]` (picklist), async `MatSelect` (lookup)
- [x] 5.4 Implement lookup field resolution in `DynamicFormComponent`: accept an optional `objects: ObjectDefinition[]` input; for lookup fields, resolve the target object's `apiName` and fetch `/api/records/:apiName` to populate the `MatSelect`; show a loading state during fetch
- [x] 5.5 Implement `getFormValue()` public method that returns `formGroup.getRawValue()` keyed by each field's `apiKey`
- [x] 5.6 Implement value pre-population: when `value` input changes, patch the `formGroup` with the provided record values

## 6. Verification

- [x] 6.1 Verify `/admin/objects` loads correctly with the collapsible sidebar, objects list renders, and the "Show Archived" toggle works
- [x] 6.2 Verify create object dialog: typing a name auto-derives the apiName; form submits correctly; new object appears in the list
- [x] 6.3 Verify edit object dialog: apiName is shown as immutable; changes save correctly via PATCH
- [x] 6.4 Verify archive flow: confirmation dialog shows the warning message; archiving hides the object from the default list
- [x] 6.5 Verify object detail page: clicking an object from the list navigates to the detail page; the fields table loads correctly
- [x] 6.6 Verify create field dialog: apiKey auto-derivation works; picklist chip input appears for picklist type; lookup object dropdown appears for lookup type; field appears in the table after creation
- [x] 6.7 Verify edit field dialog: dataType shown as static badge; name and flags are editable and save via PATCH
- [x] 6.8 Verify field delete: confirmation dialog appears; successful delete removes the field from the table; FIELD_IN_USE error shows correct message
- [x] 6.9 Verify `DynamicFormComponent` renders all 12 field types correctly with appropriate widgets; required validation prevents submit; read-only fields are disabled; value pre-population works for edit mode
- [x] 6.10 Verify `/admin/users` still works correctly under the new admin shell routing
