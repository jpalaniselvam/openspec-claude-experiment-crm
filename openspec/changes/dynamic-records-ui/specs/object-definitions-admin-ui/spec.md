## MODIFIED Requirements

### Requirement: Admin can edit an object definition
The system SHALL allow admins to edit an existing object via a dialog. Editable fields SHALL include: name, plural name, description, icon, color, and display field. The `apiName` SHALL be displayed as a locked, read-only field with a visual indicator that it cannot be changed.

#### Scenario: Admin opens the edit dialog
- **WHEN** the admin clicks the edit action on an object row
- **THEN** the edit dialog opens with current values pre-populated and `apiName` shown as immutable

#### Scenario: Admin saves edits
- **WHEN** the admin changes the name and clicks "Save"
- **THEN** a PATCH request is sent to `/api/objects/:id` and the list reflects the updated name

#### Scenario: Display field options are scoped to text and long_text fields
- **WHEN** the admin opens the edit dialog for an object
- **THEN** the display field selector offers a "None (use default)" option plus one option per field definition on that object with `dataType` of `text` or `long_text`, and no other fields are offered

#### Scenario: Admin sets the display field
- **WHEN** the admin selects a field in the display field selector and clicks "Save"
- **THEN** a PATCH request is sent to `/api/objects/:id` with `{ displayFieldApiKey: <selected apiKey> }`

#### Scenario: Admin clears the display field
- **WHEN** the admin selects "None (use default)" in the display field selector and clicks "Save"
- **THEN** a PATCH request is sent to `/api/objects/:id` with `{ displayFieldApiKey: null }`

## ADDED Requirements

### Requirement: Object detail page shows the effective display field
The object detail page at `/admin/objects/:id` SHALL display which field is currently acting as the object's display field, distinguishing between an explicitly configured `displayFieldApiKey` and a default (first `text`/`long_text` field by `sortOrder`, or "none" if no eligible field exists).

#### Scenario: Explicit display field is shown
- **WHEN** an object definition has a non-null `displayFieldApiKey`
- **THEN** the object detail page shows that field's name as the display field

#### Scenario: Default display field is shown
- **WHEN** an object definition has `displayFieldApiKey = null` and at least one `text` or `long_text` field
- **THEN** the object detail page shows the first such field (by `sortOrder`) as the display field, labeled as a default

#### Scenario: No display field available
- **WHEN** an object definition has `displayFieldApiKey = null` and no `text` or `long_text` fields
- **THEN** the object detail page indicates that no display field is configured and records will be identified by id
