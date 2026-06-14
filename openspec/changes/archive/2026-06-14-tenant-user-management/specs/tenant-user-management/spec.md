## ADDED Requirements

### Requirement: User role
Each user SHALL have a `role` of either `admin` or `member`, defaulting to `member` when not specified at creation.

#### Scenario: New user defaults to member role
- **WHEN** a user is created without an explicit role
- **THEN** the user's `role` is `member`

#### Scenario: Role is included in session and login responses
- **WHEN** an authenticated user calls `GET /api/auth/session` or successfully calls `POST /api/auth/login`
- **THEN** the response includes the user's `role` (`admin` or `member`)

### Requirement: List organization users
`GET /api/users` SHALL return the users belonging to the caller's organization, and SHALL be restricted to callers whose `role` is `admin`.

#### Scenario: Admin lists users in their organization
- **WHEN** an authenticated user with `role = admin` calls `GET /api/users`
- **THEN** the response is `200` with a list of users belonging only to that admin's organization, each including `id`, `username`, `displayName`, `email`, `role`, and `status`

#### Scenario: Member is forbidden from listing users
- **WHEN** an authenticated user with `role = member` calls `GET /api/users`
- **THEN** the response is `403` with error code `FORBIDDEN`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no valid session calls `GET /api/users`
- **THEN** the response is `401` with error code `UNAUTHORIZED`

### Requirement: Create organization user
`POST /api/users` SHALL create a new user within the caller's organization, restricted to callers whose `role` is `admin`.

#### Scenario: Admin creates a new user
- **WHEN** an authenticated user with `role = admin` calls `POST /api/users` with a valid `{ username, displayName, email, password, role }` body
- **THEN** the response is `201` with the created user's `id`, `username`, `displayName`, `email`, `role`, and `status`
- **AND** the created user belongs to the admin's organization with `status = active`

#### Scenario: Duplicate username within organization is rejected
- **WHEN** an admin calls `POST /api/users` with a `username` already used by another user in the same organization
- **THEN** the response is `409` with error code `USERNAME_TAKEN`

#### Scenario: Invalid payload is rejected
- **WHEN** an admin calls `POST /api/users` with a missing or invalid field (e.g. empty `username` or `password`)
- **THEN** the response is `400` with error code `VALIDATION_ERROR`

#### Scenario: Member is forbidden from creating users
- **WHEN** an authenticated user with `role = member` calls `POST /api/users`
- **THEN** the response is `403` with error code `FORBIDDEN`

### Requirement: Update organization user
`PATCH /api/users/:id` SHALL update an existing user's `displayName`, `role`, and/or `status` within the caller's organization, restricted to callers whose `role` is `admin`.

#### Scenario: Admin updates another user's role
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/users/:id` with `{ role: "admin" }` for a user in the same organization
- **THEN** the response is `200` and the target user's `role` is `admin`

#### Scenario: Admin disables another user's account
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/users/:id` with `{ status: "disabled" }` for a user in the same organization
- **THEN** the response is `200` and the target user's `status` is `disabled`

#### Scenario: Admin cannot change their own role or status
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/users/:id` where `:id` is their own user id, with a body containing `role` or `status`
- **THEN** the response is `400` with error code `SELF_MODIFICATION`

#### Scenario: Updating a user outside the caller's organization is not found
- **WHEN** an authenticated user with `role = admin` calls `PATCH /api/users/:id` for a `:id` that does not exist or belongs to a different organization
- **THEN** the response is `404` with error code `NOT_FOUND`

#### Scenario: Member is forbidden from updating users
- **WHEN** an authenticated user with `role = member` calls `PATCH /api/users/:id`
- **THEN** the response is `403` with error code `FORBIDDEN`
