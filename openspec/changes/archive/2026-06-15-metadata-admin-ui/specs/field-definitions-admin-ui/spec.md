## ADDED Requirements

### Requirement: Admin can view fields for an object
The system SHALL display a "Fields" section on the object detail page at `/admin/objects/:id`. The section SHALL list all field definitions for that object in a table showing: name, API key, data type (as a badge/chip), and flags (required, unique, searchable). Fields SHALL be ordered by `sortOrder`.

#### Scenario: Admin views object detail page
- **WHEN** an admin navigates to `/admin/objects/:id`
- **THEN** the object's metadata and a table of its field definitions are displayed on the same page

### Requirement: Admin can create a new field definition
The system SHALL provide an "Add Field" button on the object detail page that opens a `MatDialog`. The dialog SHALL include: name (required), API key (auto-derived from name as snake_case, read-only, shown for verification), data type (required, dropdown, cannot be changed after save), isRequired, isUnique, isSearchable, isReadOnly (checkboxes), and defaultValue (type-specific input). When `dataType` is `picklist`, the dialog SHALL show a chip-input for managing the list of allowed values (`options[]`). When `dataType` is `lookup`, the dialog SHALL show a dropdown to select the target object definition.

#### Scenario: apiKey auto-derivation
- **WHEN** the admin types a field name (e.g., "First Name")
- **THEN** the `apiKey` field auto-derives to `first_name` and is shown read-only

#### Scenario: Admin creates a picklist field
- **WHEN** the admin selects `picklist` as the data type
- **THEN** a chip input appears for entering picklist options; the admin can add/remove options before saving

#### Scenario: Admin creates a lookup field
- **WHEN** the admin selects `lookup` as the data type
- **THEN** a dropdown appears listing all active object definitions for selection as the lookup target

#### Scenario: Admin submits the create field form
- **WHEN** the admin fills required fields and clicks "Create"
- **THEN** a POST to `/api/objects/:id/fields` is made, the dialog closes, and the new field appears in the fields table

### Requirement: Admin can edit limited field properties
The system SHALL allow admins to edit a field's name, isRequired, isUnique, isSearchable, and isReadOnly flags. The `dataType` SHALL be displayed as a static badge (not an editable dropdown) with a tooltip: "Field type cannot be changed after creation to protect existing record data." The `apiKey` SHALL be displayed as a locked, read-only value.

#### Scenario: Admin opens the edit field dialog
- **WHEN** the admin clicks the edit action on a field row
- **THEN** the edit dialog opens with name and flags editable, dataType shown as a read-only badge, and apiKey shown as immutable

#### Scenario: Admin saves field edits
- **WHEN** the admin modifies the name and clicks "Save"
- **THEN** a PATCH to `/api/objects/:objectId/fields/:fieldId` is made and the table reflects the changes

### Requirement: Admin can delete a field definition
The system SHALL allow admins to delete a field. Before deleting, the system SHALL display a confirmation dialog. The delete operation SHALL send `DELETE /api/objects/:objectId/fields/:fieldId`.

#### Scenario: Admin deletes a field
- **WHEN** the admin clicks "Delete" on a field row and confirms the dialog
- **THEN** the field is removed from the table and the DELETE request succeeds

#### Scenario: Field deletion blocked (field in use)
- **WHEN** the DELETE request returns a `FIELD_IN_USE` error
- **THEN** an error message is shown: "This field cannot be deleted because it is referenced by other configurations."
