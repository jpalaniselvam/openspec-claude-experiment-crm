## ADDED Requirements

### Requirement: Admin can list all object definitions
The system SHALL display all object definitions for the current tenant in a table at `/admin/objects`. The table SHALL show name, icon (rendered as a Material icon), API name, field count, and archived status. By default, archived objects SHALL NOT be shown. A "Show archived" toggle SHALL allow admins to include archived objects in the list.

#### Scenario: Admin views the objects list
- **WHEN** an admin navigates to `/admin/objects`
- **THEN** a table of all active (non-archived) object definitions is displayed

#### Scenario: Admin toggles "Show archived"
- **WHEN** the admin enables the "Show archived" toggle
- **THEN** archived object definitions appear in the table, visually distinguished (e.g., muted/strikethrough style)

### Requirement: Admin can create a new object definition
The system SHALL provide a "Create Object" button on the objects list page that opens a `MatDialog`. The dialog SHALL include fields for: name (required), plural name (required), description (optional), icon (optional, Material icon name with live preview), and color (optional, hex color picker). The `apiName` SHALL be auto-derived from the name as a snake_case slug and displayed as a read-only field in the dialog so the admin can verify it before saving.

#### Scenario: apiName auto-derivation
- **WHEN** the admin types a name (e.g., "Doctor Visit")
- **THEN** the `apiName` field updates in real-time to the derived slug (e.g., `doctor_visit`) and is shown as read-only

#### Scenario: Admin submits the create form
- **WHEN** the admin fills in required fields and clicks "Create"
- **THEN** a POST request is sent to `/api/objects`, the dialog closes, and the new object appears in the list

#### Scenario: API name conflict
- **WHEN** the admin tries to create an object whose derived apiName already exists
- **THEN** the dialog shows an error message "An object with this API name already exists"

### Requirement: Admin can edit an object definition
The system SHALL allow admins to edit an existing object via a dialog. Editable fields SHALL include: name, plural name, description, icon, and color. The `apiName` SHALL be displayed as a locked, read-only field with a visual indicator that it cannot be changed.

#### Scenario: Admin opens the edit dialog
- **WHEN** the admin clicks the edit action on an object row
- **THEN** the edit dialog opens with current values pre-populated and `apiName` shown as immutable

#### Scenario: Admin saves edits
- **WHEN** the admin changes the name and clicks "Save"
- **THEN** a PATCH request is sent to `/api/objects/:id` and the list reflects the updated name

### Requirement: Admin can archive an object definition
The system SHALL allow admins to archive an object definition. Archiving SHALL send `PATCH /api/objects/:id` with `{ isArchived: true }`. Before archiving, the system SHALL display a confirmation dialog explaining that archiving hides the object from use but preserves all existing records.

#### Scenario: Admin archives an object
- **WHEN** the admin clicks "Archive" on an object row and confirms the dialog
- **THEN** the object is marked archived and disappears from the default list view (unless "Show archived" is enabled)

#### Scenario: Admin sees archive warning
- **WHEN** the admin clicks "Archive" on an object row
- **THEN** a confirmation dialog explains "Archiving hides this object from use but preserves all existing record data. This can be reversed by contacting support."
