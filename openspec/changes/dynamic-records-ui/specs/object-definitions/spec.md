## MODIFIED Requirements

### Requirement: Object definition fields
Each object definition SHALL belong to exactly one organization and SHALL have an `apiName` (lowercase snake_case, matching `^[a-z][a-z0-9_]*$`) that is unique within that organization, a `name`, a `pluralName`, optional `description`, `icon`, and `color`, a `schemaVersion` starting at `1`, an `isArchived` flag defaulting to `false`, and a nullable `displayFieldApiKey` defaulting to `null`.

#### Scenario: apiName is derived from name when omitted
- **WHEN** an admin calls `POST /api/objects` with `{ name: "Doctor", pluralName: "Doctors" }` and no `apiName`
- **THEN** the created object definition has `apiName = "doctor"`

#### Scenario: apiName uniqueness within organization
- **WHEN** an admin calls `POST /api/objects` with an `apiName` that already exists for an object definition in the same organization
- **THEN** the response is `409` with error code `OBJECT_API_NAME_TAKEN`

#### Scenario: apiName format is validated
- **WHEN** an admin calls `POST /api/objects` with an explicit `apiName` that does not match `^[a-z][a-z0-9_]*$`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: displayFieldApiKey defaults to null
- **WHEN** an admin calls `POST /api/objects` with a valid `{ name, pluralName }` body
- **THEN** the created object definition has `displayFieldApiKey = null`

#### Scenario: Effective display field falls back to first text/long_text field
- **WHEN** an object definition has `displayFieldApiKey = null` and has one or more field definitions with `dataType` of `text` or `long_text`
- **THEN** the effective display field for that object is the field with the lowest `sortOrder` among those with `dataType` of `text` or `long_text`

#### Scenario: Effective display field falls back to record id
- **WHEN** an object definition has `displayFieldApiKey = null` and has no field definitions with `dataType` of `text` or `long_text`
- **THEN** the effective display field for that object is absent, and consumers SHALL use the record's `id` as its display value

### Requirement: List object definitions
`GET /api/objects` SHALL return the non-archived object definitions belonging to the caller's organization, available to any authenticated user in that organization regardless of `role`.

#### Scenario: Authenticated user lists object definitions in their organization
- **WHEN** an authenticated user calls `GET /api/objects`
- **THEN** the response is `200` with a list of non-archived object definitions belonging only to that user's organization

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `GET /api/objects`
- **THEN** the response is `401` with error code `UNAUTHORIZED`

### Requirement: Get object definition by id
`GET /api/objects/:id` SHALL return a single object definition belonging to the caller's organization, available to any authenticated user in that organization regardless of `role`.

#### Scenario: Authenticated user fetches an object definition
- **WHEN** an authenticated user calls `GET /api/objects/:id` for an object definition `id` in their organization
- **THEN** the response is `200` with that object definition's details, including `displayFieldApiKey`

#### Scenario: Object definition not found or in another organization
- **WHEN** an authenticated user calls `GET /api/objects/:id` for an `id` that does not exist or belongs to a different organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `GET /api/objects/:id`
- **THEN** the response is `401` with error code `UNAUTHORIZED`

### Requirement: Update object definition
`PATCH /api/objects/:id` SHALL update an existing object definition's `name`, `pluralName`, `description`, `icon`, `color`, `displayFieldApiKey`, and/or `isArchived` within the caller's organization, restricted to callers whose `role` is `admin`. The `apiName` SHALL NOT be modifiable.

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

#### Scenario: Admin sets a valid display field
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ displayFieldApiKey: "name" }` where `"name"` is the `apiKey` of one of that object's own field definitions with `dataType` of `text` or `long_text`
- **THEN** the response is `200` and the object definition's `displayFieldApiKey` is `"name"`

#### Scenario: Admin clears the display field
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ displayFieldApiKey: null }`
- **THEN** the response is `200` and the object definition's `displayFieldApiKey` is `null`

#### Scenario: Display field referencing a non-text field is rejected
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ displayFieldApiKey: <apiKey> }` where `<apiKey>` belongs to a field definition on that object whose `dataType` is not `text` or `long_text`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Display field referencing a nonexistent field is rejected
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:id` with `{ displayFieldApiKey: <apiKey> }` where `<apiKey>` does not match any field definition belonging to that object
- **THEN** the response is `400` with error code `VALIDATION_ERROR`
