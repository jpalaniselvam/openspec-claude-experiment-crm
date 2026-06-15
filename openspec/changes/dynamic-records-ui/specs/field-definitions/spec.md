## MODIFIED Requirements

### Requirement: List field definitions
`GET /api/objects/:objectId/fields` SHALL return the field definitions for the specified object definition, ordered by `sortOrder`, available to any authenticated user in the object definition's organization regardless of `role`.

#### Scenario: Authenticated user lists fields for an object
- **WHEN** an authenticated user calls `GET /api/objects/:objectId/fields` for an object definition in their organization
- **THEN** the response is `200` with the object's field definitions ordered by `sortOrder`

#### Scenario: Object definition not found or in another organization
- **WHEN** an authenticated user calls `GET /api/objects/:objectId/fields` where `:objectId` does not exist or belongs to a different organization
- **THEN** the response is `404` with error code `OBJECT_NOT_FOUND`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `GET /api/objects/:objectId/fields`
- **THEN** the response is `401` with error code `UNAUTHORIZED`
