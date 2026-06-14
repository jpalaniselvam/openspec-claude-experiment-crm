# field-definitions

## Purpose

Defines the API for managing field definitions on object definitions. Field definitions describe the schema of a record's `data` object, including data types, validation rules, and display metadata. All field management operations are restricted to admin-role callers.

## Requirements

### Requirement: Field definition fields
Each field definition SHALL belong to exactly one object definition and SHALL have an `apiKey` (lowercase snake_case, matching `^[a-z][a-z0-9_]*$`) that is unique within that object definition, a `name`, a `dataType` (one of `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`), flags `isRequired`, `isUnique`, `isSearchable`, and `isReadOnly` (each defaulting to `false`), an optional `defaultValue`, an optional `options` array (used for `picklist`), an optional `lookupObjectDefinitionId` (used for `lookup`), and a `sortOrder`.

#### Scenario: apiKey is derived from name when omitted
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Years Experience", dataType: "number" }` and no `apiKey`
- **THEN** the created field definition has `apiKey = "years_experience"`

#### Scenario: apiKey uniqueness within object definition
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with an `apiKey` that already exists for a field on the same object definition
- **THEN** the response is `409` with error code `FIELD_API_KEY_TAKEN`

#### Scenario: apiKey format is validated
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with an explicit `apiKey` that does not match `^[a-z][a-z0-9_]*$`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Unsupported dataType is rejected
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with a `dataType` that is not one of the supported values
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

### Requirement: Picklist fields require options
A field definition with `dataType = "picklist"` SHALL require a non-empty `options` array of strings.

#### Scenario: Picklist field created with options
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Status", dataType: "picklist", options: ["new", "active", "closed"] }`
- **THEN** the response is `201` and the created field's `options` is `["new", "active", "closed"]`

#### Scenario: Picklist field without options is rejected
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Status", dataType: "picklist" }` and no `options` (or an empty array)
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

### Requirement: Lookup fields require a target object definition
A field definition with `dataType = "lookup"` SHALL require a `lookupObjectDefinitionId` referencing an existing, non-archived object definition in the same organization.

#### Scenario: Lookup field created with a valid target
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Hospital", dataType: "lookup", lookupObjectDefinitionId: <id of an existing object definition in the same org> }`
- **THEN** the response is `201` and the created field's `lookupObjectDefinitionId` matches the provided id

#### Scenario: Lookup field without a target is rejected
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Hospital", dataType: "lookup" }` and no `lookupObjectDefinitionId`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Lookup field referencing a nonexistent or foreign-org object definition is rejected
- **WHEN** an admin calls `POST /api/objects/:objectId/fields` with `{ name: "Hospital", dataType: "lookup", lookupObjectDefinitionId: <id that does not exist or belongs to another organization> }`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

### Requirement: Create field definition
`POST /api/objects/:objectId/fields` SHALL create a new field definition on the specified object definition, restricted to callers whose `role` is `admin`, and SHALL increment the object definition's `schemaVersion` by 1.

#### Scenario: Admin creates a field
- **WHEN** an authenticated user with `role = admin` calls `POST /api/objects/:objectId/fields` with a valid body for an object definition in their organization
- **THEN** the response is `201` with the created field definition
- **AND** the object definition's `schemaVersion` is incremented by 1

#### Scenario: Member is forbidden from creating fields
- **WHEN** an authenticated user with `role = member` calls `POST /api/objects/:objectId/fields`
- **THEN** the response is `403` with error code `FORBIDDEN`

#### Scenario: Object definition not found
- **WHEN** an authenticated user with `role = admin` calls `POST /api/objects/:objectId/fields` where `:objectId` does not exist or belongs to another organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

### Requirement: List field definitions
`GET /api/objects/:objectId/fields` SHALL return the field definitions for the specified object definition, ordered by `sortOrder`, restricted to callers whose `role` is `admin`.

#### Scenario: Admin lists fields for an object
- **WHEN** an authenticated user with `role = admin` calls `GET /api/objects/:objectId/fields` for an object definition in their organization
- **THEN** the response is `200` with the object's field definitions ordered by `sortOrder`

#### Scenario: Member is forbidden from listing fields
- **WHEN** an authenticated user with `role = member` calls `GET /api/objects/:objectId/fields`
- **THEN** the response is `403` with error code `FORBIDDEN`

### Requirement: Update field definition
`PATCH /api/objects/:objectId/fields/:fieldId` SHALL update a field definition's `name`, `isRequired`, `isUnique`, `isSearchable`, `isReadOnly`, `defaultValue`, `options`, and/or `sortOrder`, restricted to callers whose `role` is `admin`, and SHALL increment the object definition's `schemaVersion` by 1. The `apiKey`, `dataType`, and `lookupObjectDefinitionId` SHALL NOT be modifiable.

#### Scenario: Admin updates a field's flags
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:objectId/fields/:fieldId` with `{ isRequired: true }`
- **THEN** the response is `200`, the field's `isRequired` is `true`
- **AND** the object definition's `schemaVersion` is incremented by 1

#### Scenario: Immutable field properties are rejected
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:objectId/fields/:fieldId` with a body containing `apiKey`, `dataType`, or `lookupObjectDefinitionId`
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Field not found
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/objects/:objectId/fields/:fieldId` where `:fieldId` does not exist on `:objectId`
- **THEN** the response is `404` with error code `FIELD_NOT_FOUND`

#### Scenario: Member is forbidden from updating fields
- **WHEN** an authenticated user with `role = member` calls `PATCH /api/objects/:objectId/fields/:fieldId`
- **THEN** the response is `403` with error code `FORBIDDEN`

### Requirement: Delete field definition
`DELETE /api/objects/:objectId/fields/:fieldId` SHALL delete a field definition, restricted to callers whose `role` is `admin`, and SHALL increment the object definition's `schemaVersion` by 1. The deletion SHALL be rejected if any record of that object has a non-null value for the field's `apiKey`.

#### Scenario: Admin deletes an unused field
- **WHEN** an authenticated user with `role = admin` calls `DELETE /api/objects/:objectId/fields/:fieldId` for a field that no record currently has a non-null value for
- **THEN** the response is `200`, the field definition no longer exists
- **AND** the object definition's `schemaVersion` is incremented by 1

#### Scenario: Deleting a field in use is rejected
- **WHEN** an authenticated user with `role = admin` calls `DELETE /api/objects/:objectId/fields/:fieldId` for a field where at least one record of that object has a non-null value at `data.<apiKey>`
- **THEN** the response is `409` with error code `FIELD_IN_USE`

#### Scenario: Field not found
- **WHEN** an authenticated user with `role = admin` calls `DELETE /api/objects/:objectId/fields/:fieldId` where `:fieldId` does not exist on `:objectId`
- **THEN** the response is `404` with error code `FIELD_NOT_FOUND`

#### Scenario: Member is forbidden from deleting fields
- **WHEN** an authenticated user with `role = member` calls `DELETE /api/objects/:objectId/fields/:fieldId`
- **THEN** the response is `403` with error code `FORBIDDEN`
