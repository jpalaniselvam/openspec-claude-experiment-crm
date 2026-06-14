# object-definitions

## Purpose

Defines the API for managing object definitions — the user-configurable schema types that belong to an organization. Object definitions are the backbone of the flexible data model, each carrying an `apiName`, display metadata, a `schemaVersion`, and an `isArchived` flag. All management operations are restricted to admin-role callers.

## Requirements

### Requirement: Object definition fields
Each object definition SHALL belong to exactly one organization and SHALL have an `apiName` (lowercase snake_case, matching `^[a-z][a-z0-9_]*$`) that is unique within that organization, a `name`, a `pluralName`, optional `description`, `icon`, and `color`, a `schemaVersion` starting at `1`, and an `isArchived` flag defaulting to `false`.

#### Scenario: apiName is derived from name when omitted
- **WHEN** an admin calls `POST /api/objects` with `{ name: "Doctor", pluralName: "Doctors" }` and no `apiName`
- **THEN** the created object definition has `apiName = "doctor"`

#### Scenario: apiName uniqueness within organization
- **WHEN** an admin calls `POST /api/objects` with an `apiName` that already exists for an object definition in the same organization
- **THEN** the response is `409` with error code `OBJECT_API_NAME_TAKEN`

#### Scenario: apiName format is validated
- **WHEN** an admin calls `POST /api/objects` with an explicit `apiName` that does not match `^[a-z][a-z0-9_]*$`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

### Requirement: Create object definition
`POST /api/objects` SHALL create a new object definition in the caller's organization, restricted to callers whose `role` is `admin`.

#### Scenario: Admin creates an object definition
- **WHEN** an authenticated user with `role = admin` calls `POST /api/objects` with a valid `{ name, pluralName }` body
- **THEN** the response is `201` with the created object's `id`, `apiName`, `name`, `pluralName`, `description`, `icon`, `color`, `schemaVersion = 1`, and `isArchived = false`

#### Scenario: Invalid payload is rejected
- **WHEN** an admin calls `POST /api/objects` with a missing or empty `name` or `pluralName`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Member is forbidden from creating object definitions
- **WHEN** an authenticated user with `role = member` calls `POST /api/objects`
- **THEN** the response is `403` with error code `FORBIDDEN`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `POST /api/objects`
- **THEN** the response is `401` with error code `UNAUTHORIZED`

### Requirement: List object definitions
`GET /api/objects` SHALL return the non-archived object definitions belonging to the caller's organization, restricted to callers whose `role` is `admin`.

#### Scenario: Admin lists object definitions in their organization
- **WHEN** an authenticated user with `role = admin` calls `GET /api/objects`
- **THEN** the response is `200` with a list of non-archived object definitions belonging only to that admin's organization

#### Scenario: Member is forbidden from listing object definitions
- **WHEN** an authenticated user with `role = member` calls `GET /api/objects`
- **THEN** the response is `403` with error code `FORBIDDEN`

### Requirement: Get object definition by id
`GET /api/objects/:id` SHALL return a single object definition belonging to the caller's organization, restricted to callers whose `role` is `admin`.

#### Scenario: Admin fetches an object definition
- **WHEN** an authenticated user with `role = admin` calls `GET /api/objects/:id` for an object definition `id` in their organization
- **THEN** the response is `200` with that object definition's details

#### Scenario: Object definition not found or in another organization
- **WHEN** an authenticated user with `role = admin` calls `GET /api/objects/:id` for an `id` that does not exist or belongs to a different organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

### Requirement: Update object definition
`PATCH /api/objects/:id` SHALL update an existing object definition's `name`, `pluralName`, `description`, `icon`, `color`, and/or `isArchived` within the caller's organization, restricted to callers whose `role` is `admin`. The `apiName` SHALL NOT be modifiable.

#### Scenario: Admin updates an object definition's display fields
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ name: "Physician" }` for an object definition in their organization
- **THEN** the response is `200` and the object definition's `name` is `"Physician"`

#### Scenario: Admin archives an object definition
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ isArchived: true }`
- **THEN** the response is `200` and the object definition's `isArchived` is `true`
- **AND** subsequent calls to `GET /api/objects` no longer include it
- **AND** subsequent calls to `GET/POST/PUT/DELETE /api/records/:objectApiName...` for that object's `apiName` respond `404` with error code `OBJECT_NOT_FOUND`

#### Scenario: apiName in request body is ignored or rejected
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with a body containing `apiName`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Updating an object definition outside the caller's organization is not found
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` for an `id` that does not exist or belongs to a different organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

#### Scenario: Member is forbidden from updating object definitions
- **WHEN** an authenticated user with `role = member` calls `PATCH /api/objects/:id`
- **THEN** the response is `403` with error code `FORBIDDEN`
