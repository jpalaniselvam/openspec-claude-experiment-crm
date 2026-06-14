## Purpose

Defines the backend authentication requirements for tenant-scoped login: organization-scoped user identity, credential-based login, payload validation, session validation, logout, and response envelope conventions.

## Requirements

### Requirement: Organization-Scoped User Identity
The system SHALL store each user as belonging to exactly one organization, identified by an organization slug, with the username unique within that organization (but not necessarily globally unique).

#### Scenario: Same username allowed across different organizations
- **WHEN** organization `acme` has a user with username `jane` and organization `globex` also creates a user with username `jane`
- **THEN** both users are created successfully and are treated as distinct accounts

#### Scenario: Duplicate username within the same organization is rejected
- **WHEN** an attempt is made to create a second user with username `jane` in organization `acme`
- **THEN** the system SHALL reject the creation due to the unique `(organization_id, username)` constraint

### Requirement: Credential-Based Login
The system SHALL provide a `POST /api/auth/login` endpoint that authenticates a user using an organization slug, username, and password.

#### Scenario: Successful login with valid credentials
- **WHEN** a request is sent with a valid organization slug, an existing username within that organization, and the correct password, and the account status is `active`
- **THEN** the system SHALL respond with `success: true`, set a session cookie, and include the user's id, username, display name, and organization slug in the response data

#### Scenario: Unknown organization slug
- **WHEN** a request is sent with an organization slug that does not correspond to any organization
- **THEN** the system SHALL respond with `success: false` and `error.code = "INVALID_CREDENTIALS"`, without indicating that the organization does not exist

#### Scenario: Unknown username within a valid organization
- **WHEN** a request is sent with a valid organization slug but a username that does not exist within that organization
- **THEN** the system SHALL respond with `success: false` and `error.code = "INVALID_CREDENTIALS"`, without indicating that the username does not exist

#### Scenario: Incorrect password
- **WHEN** a request is sent with a valid organization slug and an existing username, but an incorrect password
- **THEN** the system SHALL respond with `success: false` and `error.code = "INVALID_CREDENTIALS"`, and SHALL NOT create a session

#### Scenario: Disabled account
- **WHEN** a request is sent with a valid organization slug, existing username, and correct password, but the user's `status` is `disabled`
- **THEN** the system SHALL respond with `success: false`, `error.code = "ACCOUNT_DISABLED"`, and SHALL NOT create a session

### Requirement: Login Payload Validation
The system SHALL validate the login request payload (`organizationSlug`, `username`, `password`) using a shared Zod schema before performing any lookup.

#### Scenario: Missing or empty required field
- **WHEN** a login request is sent with `organizationSlug`, `username`, or `password` missing or empty
- **THEN** the system SHALL respond with HTTP 400, `success: false`, and `error.code = "VALIDATION_ERROR"`, without querying the database

### Requirement: Session Validation
The system SHALL provide a `GET /api/auth/session` endpoint that returns the current authenticated user and organization when a valid session cookie is present.

#### Scenario: Valid session
- **WHEN** a request is made with a valid, non-expired session cookie
- **THEN** the system SHALL respond with `success: true` and the current user's id, username, display name, and organization slug

#### Scenario: Missing or invalid session
- **WHEN** a request is made without a session cookie, or with an invalid/expired session cookie
- **THEN** the system SHALL respond with HTTP 401 and `success: false`

### Requirement: Logout
The system SHALL provide a `POST /api/auth/logout` endpoint that invalidates the current session.

#### Scenario: Logout with active session
- **WHEN** an authenticated request is made to `POST /api/auth/logout`
- **THEN** the system SHALL invalidate the session server-side, clear the session cookie, and respond with `success: true`

#### Scenario: Logout without an active session
- **WHEN** a request is made to `POST /api/auth/logout` without a valid session cookie
- **THEN** the system SHALL respond with `success: true` (idempotent) without error

### Requirement: Standard Response Envelope
All `/api/auth/*` endpoints SHALL return a consistent JSON envelope of the form `{ success: boolean, data?: object, error?: { code: string, message: string } }`.

#### Scenario: Successful response shape
- **WHEN** any `/api/auth/*` endpoint completes successfully
- **THEN** the response body SHALL include `success: true` and a `data` object (which may be empty)

#### Scenario: Error response shape
- **WHEN** any `/api/auth/*` endpoint fails (validation, authentication, or server error)
- **THEN** the response body SHALL include `success: false` and an `error` object containing `code` and `message`
