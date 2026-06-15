## ADDED Requirements

### Requirement: Admin templates page lists the catalog
The system SHALL provide an admin-only page at `/admin/templates`, reachable only by users with `role = admin` (consistent with the existing `/admin/**` route guard). On load, the page SHALL call `GET /api/templates` and display each returned template's `name` and `description`, along with the `pluralName` and field count of each of its `objects`.

#### Scenario: Admin views the templates page
- **WHEN** an authenticated user with `role = admin` navigates to `/admin/templates`
- **THEN** the page shows all four catalog templates, each with its name, description, and a list of its objects (plural name and field count)

#### Scenario: Member cannot reach the templates page
- **WHEN** an authenticated user with `role = member` attempts to navigate to `/admin/templates`
- **THEN** the user is redirected away from the page, consistent with other `/admin/**` routes

### Requirement: Admin applies a template via confirmation dialog
The system SHALL let an admin apply a template to their organization only after confirming in a dialog. The dialog SHALL show the same object/field-count summary as the templates page before the admin confirms. On confirmation, the system SHALL call `POST /api/templates/:key/apply` and show a loading state until the response is received.

#### Scenario: Admin opens the apply dialog
- **WHEN** an admin clicks "Apply Template" for a given template
- **THEN** a dialog opens showing that template's objects and field counts, with options to confirm or cancel

#### Scenario: Admin cancels before applying
- **WHEN** an admin closes or cancels the apply dialog without confirming
- **THEN** no request is sent to `POST /api/templates/:key/apply`

#### Scenario: Admin confirms and the request is in flight
- **WHEN** an admin confirms the apply dialog
- **THEN** the system calls `POST /api/templates/:key/apply` for that template's `key` and shows a loading indicator with the confirm/cancel actions disabled until a response is received

### Requirement: Apply result shows created and skipped objects
After a successful `POST /api/templates/:key/apply` response, the system SHALL display, within the same dialog, the list of `created` objects (each with its `apiName` and number of fields created) and the list of `skipped` objects (each with its `apiName` and a human-readable reason). For each created object that has `fieldsSkipped` entries, the system SHALL display a human-readable reason for each skipped field. If any objects were created, the system SHALL offer a way to navigate to `/admin/objects`.

#### Scenario: Apply to an organization with no colliding objects
- **WHEN** an admin applies a template to an organization that has none of its objects yet
- **THEN** the result view lists every template object under "created" with its field count
- **AND** an option to view `/admin/objects` is shown

#### Scenario: Re-applying an already-applied template
- **WHEN** an admin applies a template that was already fully applied to their organization
- **THEN** the result view lists every template object under "skipped" with a human-readable "already exists" reason
- **AND** no object is listed under "created"

#### Scenario: A created object has a lookup field skipped due to an archived target
- **WHEN** an admin applies a template and the response includes a created object with a `fieldsSkipped` entry reporting `LOOKUP_TARGET_ARCHIVED`
- **THEN** the result view shows that object as created and additionally shows a human-readable message indicating the linked field was skipped because its target object is archived

### Requirement: Apply failure is shown without losing context
If `POST /api/templates/:key/apply` fails (e.g. network error or unexpected server error), the system SHALL display an error message within the dialog and allow the admin to close it, without navigating away from the templates page.

#### Scenario: Apply request fails
- **WHEN** an admin confirms the apply dialog and the request fails
- **THEN** the dialog shows an error message instead of a created/skipped result
- **AND** the admin can close the dialog and remains on `/admin/templates`
