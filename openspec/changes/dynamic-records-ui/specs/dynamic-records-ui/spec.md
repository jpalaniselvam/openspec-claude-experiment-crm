## ADDED Requirements

### Requirement: Worksheet page lists records of an object definition
The system SHALL provide a route `/objects/:apiName` that renders a table ("worksheet") of all records belonging to the non-archived object definition identified by `:apiName` in the user's organization, with one column per field definition ordered by `sortOrder`, fetched via `GET /api/records/:apiName` without pagination (the full result set is loaded at once).

#### Scenario: User views a worksheet
- **WHEN** an authenticated user navigates to `/objects/:apiName` for a non-archived object definition in their organization
- **THEN** a table is rendered with one column per field definition (ordered by `sortOrder`) and one row per record returned by `GET /api/records/:apiName`

#### Scenario: Unknown or archived object apiName
- **WHEN** an authenticated user navigates to `/objects/:apiName` where `:apiName` does not match a non-archived object definition in their organization
- **THEN** the system shows a "not found" state instead of a table

#### Scenario: Empty worksheet
- **WHEN** an authenticated user navigates to `/objects/:apiName` for an object definition with no records
- **THEN** the table renders with column headers and an empty-state message instead of rows

### Requirement: Lookup columns display the referenced record's display value
For `lookup`-type fields, the worksheet SHALL render each cell using the referenced record's effective display value (resolved via the target object definition's `displayFieldApiKey` or its default resolution), not the raw record id.

#### Scenario: Lookup cell shows display value
- **WHEN** a record's `data` contains a value for a `lookup` field that matches a currently-loaded record of the target object
- **THEN** the corresponding cell shows that target record's effective display value

#### Scenario: Lookup cell for missing reference
- **WHEN** a record's `data` value for a `lookup` field does not match any currently-loaded record of the target object
- **THEN** the corresponding cell shows the raw id value as a fallback

### Requirement: Client-side search across visible columns
The worksheet page SHALL provide a search input that filters the displayed rows to those where at least one column's rendered value (including resolved lookup display values) contains the search text, case-insensitively.

#### Scenario: Search filters rows
- **WHEN** the user types text into the search input
- **THEN** only rows where at least one column's rendered value contains that text (case-insensitive) remain visible

#### Scenario: Clearing search restores all rows
- **WHEN** the user clears the search input
- **THEN** all rows (subject to any active column filters) are shown again

### Requirement: Column sort
The worksheet SHALL allow the user to sort by clicking a column header, cycling between ascending, descending, and unsorted order, using the column's rendered value (including resolved lookup display values).

#### Scenario: Sort ascending then descending
- **WHEN** the user clicks a column header
- **THEN** rows are sorted ascending by that column's rendered value

#### Scenario: Reverse sort
- **WHEN** the user clicks the same column header again while sorted ascending
- **THEN** rows are sorted descending by that column's rendered value

#### Scenario: Clear sort
- **WHEN** the user clicks the same column header a third time
- **THEN** the rows return to their original (unsorted) order

### Requirement: Column filter
The worksheet SHALL allow the user to filter rows by per-column values — a multi-select value picker for `picklist`, `boolean`, and `lookup` columns (populated from the distinct values/display values present in the loaded records), and a text-contains input for other column types — applied client-side in combination with search and sort.

#### Scenario: Filter a picklist column
- **WHEN** the user selects one or more values in a `picklist` column's filter
- **THEN** only rows whose value for that column matches one of the selected values remain visible

#### Scenario: Combine filter with search
- **WHEN** the user has both an active column filter and search text
- **THEN** only rows matching both the filter and the search remain visible

### Requirement: Create record via side panel
The worksheet page SHALL provide a "+ New" action that opens a side panel at the child route `/objects/:apiName/new`, rendering `DynamicFormComponent` with no initial value, built from the object's field definitions.

#### Scenario: Open create panel
- **WHEN** the user clicks "+ New" on the worksheet
- **THEN** the app navigates to `/objects/:apiName/new` and a side panel opens showing an empty form built from the object's field definitions

#### Scenario: Save new record
- **WHEN** the user fills the form and clicks "Save"
- **THEN** `POST /api/records/:apiName` is called with the form values, and on success the panel closes, the new record appears in the worksheet, and the app navigates back to `/objects/:apiName`

#### Scenario: Validation error on save
- **WHEN** `POST /api/records/:apiName` responds with `400` and error code `VALIDATION_ERROR`
- **THEN** the panel remains open and an error message is shown

#### Scenario: Cancel create
- **WHEN** the user closes the panel without saving
- **THEN** the app navigates back to `/objects/:apiName` and no record is created

### Requirement: Edit record via side panel
Clicking a worksheet row SHALL open a side panel at the child route `/objects/:apiName/:id`, rendering `DynamicFormComponent` pre-populated with that record's `data`, with the panel header showing the record's effective display value (or `id` if it has none).

#### Scenario: Open edit panel
- **WHEN** the user clicks a row in the worksheet
- **THEN** the app navigates to `/objects/:apiName/:id` and a side panel opens showing the record's current values in a form built from the object's field definitions, with the panel header showing the record's display value

#### Scenario: Save edited record
- **WHEN** the user modifies the form and clicks "Save"
- **THEN** `PUT /api/records/:apiName/:id` is called with the form values, and on success the worksheet row reflects the updated values and a confirmation is shown

#### Scenario: Validation error on save
- **WHEN** `PUT /api/records/:apiName/:id` responds with `400` and error code `VALIDATION_ERROR`
- **THEN** the panel remains open and an error message is shown

#### Scenario: Record not found
- **WHEN** the user navigates to `/objects/:apiName/:id` for an `:id` that does not exist in the resolved object definition
- **THEN** the panel shows a "not found" state instead of a form

### Requirement: Related records (reverse lookups) shown read-only
While the edit panel is open, the system SHALL display a "Related" section populated from `GET /api/records/:apiName/:id/related`, grouped by source object and lookup field, where each related record is a read-only link navigating to `/objects/:relatedObjectApiName/:relatedRecordId`.

#### Scenario: Related records grouped and linked
- **WHEN** the edit panel is open for a record that has related records
- **THEN** a "Related" section lists each group from `GET /api/records/:apiName/:id/related`, labeled with the source object's `pluralName` and the lookup field's name, and each related record is shown using its `displayValue` as a link to `/objects/:relatedObjectApiName/:relatedRecordId`

#### Scenario: No related records
- **WHEN** the edit panel is open for a record with no related records
- **THEN** the "Related" section is omitted or shown with an empty state

#### Scenario: Related records are not editable
- **WHEN** the user views the "Related" section
- **THEN** no inputs for editing related records' field values are rendered, and the only interaction is navigation to the related record

#### Scenario: Related section is not shown for new records
- **WHEN** the side panel is open in create mode (`/objects/:apiName/new`)
- **THEN** the "Related" section is not shown

### Requirement: Delete record with confirmation
The worksheet SHALL provide a row-level delete action that opens a confirmation dialog before calling `DELETE /api/records/:apiName/:id`.

#### Scenario: Delete confirmed
- **WHEN** the user triggers the delete action on a row and confirms the dialog
- **THEN** `DELETE /api/records/:apiName/:id` is called, and on success the row is removed from the worksheet

#### Scenario: Delete cancelled
- **WHEN** the user triggers the delete action on a row and cancels the dialog
- **THEN** no request is sent and the row remains in the worksheet
