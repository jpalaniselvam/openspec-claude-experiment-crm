## ADDED Requirements

### Requirement: Record fields
Each record SHALL belong to exactly one organization and exactly one object definition, and SHALL store its field values as a `data` object whose keys are field definition `apiKey`s.

#### Scenario: Record includes id, object reference, and data
- **WHEN** a record is created for an object definition
- **THEN** the record has an `id`, the `data` object provided in the request, `createdAt`, and `updatedAt`

### Requirement: Resolve object by apiName
All record endpoints SHALL resolve `:objectApiName` to a non-archived object definition belonging to the caller's organization, returning `404` with error code `OBJECT_NOT_FOUND` if no such object definition exists.

#### Scenario: Unknown object apiName
- **WHEN** an authenticated user calls any `/api/records/:objectApiName...` endpoint with an `:objectApiName` that does not match a non-archived object definition in their organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

### Requirement: Create record
`POST /api/records/:objectApiName` SHALL create a record for the resolved object definition in the caller's organization, after validating the request body's `data` against the object's current field definitions.

#### Scenario: Valid record is created
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a `data` object satisfying all current field definitions (required fields present with correctly-typed values)
- **THEN** the response is `201` with the created record's `id`, `objectDefinitionId`, `data`, `createdAt`, and `updatedAt`

#### Scenario: Missing required field is rejected
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a `data` object missing a value for a field definition where `isRequired = true`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Wrong-typed value is rejected
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a `data` value that does not match its field definition's `dataType` (e.g. a string for a `number` field)
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Picklist value not in options is rejected
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a value for a `picklist` field that is not one of that field's `options`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Lookup value referencing a nonexistent record is rejected
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a value for a `lookup` field whose id does not match any record of the field's `lookupObjectDefinitionId` in the caller's organization
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Lookup value referencing an existing record is accepted
- **WHEN** an authenticated user calls `POST /api/records/:objectApiName` with a value for a `lookup` field whose id matches an existing record of the field's `lookupObjectDefinitionId` in the caller's organization
- **THEN** the response is `201` and the created record's `data` includes that lookup value

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `POST /api/records/:objectApiName`
- **THEN** the response is `401` with error code `UNAUTHORIZED`

### Requirement: List records
`GET /api/records/:objectApiName` SHALL return the records of the resolved object definition belonging to the caller's organization.

#### Scenario: User lists records for an object
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName`
- **THEN** the response is `200` with an `items` array of records belonging only to that object definition and the caller's organization

### Requirement: Get record by id
`GET /api/records/:objectApiName/:id` SHALL return a single record belonging to the resolved object definition and the caller's organization.

#### Scenario: User fetches a record
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id` for a record `id` that belongs to the resolved object definition and the caller's organization
- **THEN** the response is `200` with that record's `id`, `objectDefinitionId`, `data`, `createdAt`, and `updatedAt`

#### Scenario: Record not found
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id` for an `id` that does not exist, belongs to a different object definition, or belongs to a different organization
- **THEN** the response is `404` with error code `RECORD_NOT_FOUND`

### Requirement: Update record
`PUT /api/records/:objectApiName/:id` SHALL replace a record's `data` with the request body, after validating it against the object's current field definitions, the same way as record creation.

#### Scenario: Valid update replaces data
- **WHEN** an authenticated user calls `PUT /api/records/:objectApiName/:id` with a `data` object satisfying all current field definitions, for a record in the caller's organization
- **THEN** the response is `200` and the record's `data` is replaced with the provided value
- **AND** `updatedAt` is refreshed

#### Scenario: Invalid update is rejected
- **WHEN** an authenticated user calls `PUT /api/records/:objectApiName/:id` with a `data` object that fails validation against the object's current field definitions (per the create-record validation scenarios)
- **THEN** the response is `400` with error code `VALIDATION_ERROR`
- **AND** the record's stored `data` is unchanged

#### Scenario: Record not found
- **WHEN** an authenticated user calls `PUT /api/records/:objectApiName/:id` for an `id` that does not exist, belongs to a different object definition, or belongs to a different organization
- **THEN** the response is `404` with error code `RECORD_NOT_FOUND`

### Requirement: Delete record
`DELETE /api/records/:objectApiName/:id` SHALL delete a record belonging to the resolved object definition and the caller's organization.

#### Scenario: User deletes a record
- **WHEN** an authenticated user calls `DELETE /api/records/:objectApiName/:id` for a record in the caller's organization
- **THEN** the response is `200` and the record no longer exists

#### Scenario: Record not found
- **WHEN** an authenticated user calls `DELETE /api/records/:objectApiName/:id` for an `id` that does not exist, belongs to a different object definition, or belongs to a different organization
- **THEN** the response is `404` with error code `RECORD_NOT_FOUND`
