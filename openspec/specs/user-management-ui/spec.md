# Capability: user-management-ui

## Purpose

Defines the frontend behaviour for the admin Users page, including route access control, user listing, create/edit flows, and navigation visibility.

## Requirements

### Requirement: Admin-only Users page route
The frontend SHALL provide a `/admin/users` route that is accessible only to authenticated users whose `role` is `admin`.

#### Scenario: Admin navigates to the Users page
- **WHEN** a user with `role = admin` navigates to `/admin/users`
- **THEN** the Users page is displayed

#### Scenario: Member is redirected away from the Users page
- **WHEN** an authenticated user with `role = member` navigates to `/admin/users`
- **THEN** the user is redirected to the dashboard route and the Users page is not displayed

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated user navigates to `/admin/users`
- **THEN** the user is redirected to `/login`

### Requirement: Organization users list
The Users page SHALL display the users belonging to the admin's organization, including each user's username, display name, email, role, and status.

#### Scenario: Users page lists organization users
- **WHEN** the Users page loads for an admin
- **THEN** it displays a table of users from `GET /api/users`, each row showing username, display name, email, role, and status

### Requirement: Create user dialog
The Users page SHALL provide a control to open a dialog for creating a new user, submitting `username`, `displayName`, `email`, `password`, and `role` to `POST /api/users`.

#### Scenario: Admin creates a new user
- **WHEN** an admin fills in the create-user dialog with valid values and submits
- **THEN** `POST /api/users` is called with the entered values
- **AND** on success the dialog closes and the new user appears in the users list

#### Scenario: Validation errors are shown in the dialog
- **WHEN** an admin submits the create-user dialog with a missing required field
- **THEN** the dialog displays a validation error and does not submit the request

#### Scenario: Duplicate username error is shown
- **WHEN** `POST /api/users` responds with error code `USERNAME_TAKEN`
- **THEN** the dialog displays an error indicating the username is already in use and remains open

### Requirement: Edit user role and status
The Users page SHALL allow an admin to change another user's `role` and `status` via `PATCH /api/users/:id`, and SHALL disable these controls for the admin's own row.

#### Scenario: Admin changes a user's role
- **WHEN** an admin selects a different role for another user's row and confirms
- **THEN** `PATCH /api/users/:id` is called with the new `role`
- **AND** on success the user's row reflects the updated role

#### Scenario: Admin disables a user account
- **WHEN** an admin sets another user's status to `disabled` and confirms
- **THEN** `PATCH /api/users/:id` is called with `{ status: "disabled" }`
- **AND** on success the user's row reflects the `disabled` status

#### Scenario: Admin cannot edit their own role or status
- **WHEN** the Users page renders the row corresponding to the signed-in admin
- **THEN** the role and status controls for that row are disabled

### Requirement: Admin navigation entry
The application navigation SHALL show a "Users" link to `/admin/users` only when the signed-in user's `role` is `admin`.

#### Scenario: Admin sees the Users nav link
- **WHEN** a user with `role = admin` is signed in
- **THEN** the navigation includes a "Users" link to `/admin/users`

#### Scenario: Member does not see the Users nav link
- **WHEN** a user with `role = member` is signed in
- **THEN** the navigation does not include a "Users" link
