## ADDED Requirements

### Requirement: Get related records (reverse lookups)
`GET /api/records/:objectApiName/:id/related` SHALL return records of other non-archived object definitions in the caller's organization whose `lookup` field definitions reference the resolved object definition, grouped by source object definition and lookup field. Each related record SHALL be identified by its `id` and a computed `displayValue`.

#### Scenario: Related records grouped by source object and field
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id/related` for a record that is referenced by one or more `lookup` fields of other non-archived object definitions in the organization
- **THEN** the response is `200` with a `related` array, one entry per `(source object definition, lookup field)` pair that has at least one matching record, each entry containing `objectApiName`, `objectName`, `pluralName`, `fieldApiKey`, `fieldName`, and a `records` array of `{ id, displayValue }`

#### Scenario: displayValue uses the source object's effective display field
- **WHEN** a related record's source object definition has an effective display field (per its `displayFieldApiKey` or default resolution)
- **THEN** that related record's `displayValue` is the value of `data[<effective display field apiKey>]`

#### Scenario: displayValue falls back to record id
- **WHEN** a related record's source object definition has no effective display field
- **THEN** that related record's `displayValue` is its `id`

#### Scenario: No related records
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id/related` for a record that no `lookup` field in the organization references
- **THEN** the response is `200` with `related: []`

#### Scenario: Unknown object apiName
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id/related` with an `:objectApiName` that does not match a non-archived object definition in their organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

#### Scenario: Record not found
- **WHEN** an authenticated user calls `GET /api/records/:objectApiName/:id/related` for an `:id` that does not exist, or belongs to a different object definition or organization
- **THEN** the response is `404` with error code `RECORD_NOT_FOUND`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `GET /api/records/:objectApiName/:id/related`
- **THEN** the response is `401` with error code `UNAUTHORIZED`
