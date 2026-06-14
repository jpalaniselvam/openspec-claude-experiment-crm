## ADDED Requirements

### Requirement: Login Form
The system SHALL present a login screen at the `/login` route with Angular Material fields for Organization ID, Username, and Password, plus a submit button.

#### Scenario: Initial render
- **WHEN** an unauthenticated user navigates to `/login`
- **THEN** the screen SHALL display labeled input fields for "Organization ID", "Username", and "Password" (masked), and a "Log In" button

#### Scenario: Client-side required field validation
- **WHEN** the user attempts to submit the form with one or more of Organization ID, Username, or Password left empty
- **THEN** the system SHALL prevent submission and display an inline validation message for each empty required field, without calling the backend

### Requirement: Login Submission and Feedback
The system SHALL submit valid form input to the backend login endpoint and reflect the result to the user.

#### Scenario: Successful login navigates to the app
- **WHEN** the user submits a valid Organization ID, Username, and Password and the backend responds with `success: true`
- **THEN** the system SHALL store the authenticated session state and navigate the user to the default authenticated route (dashboard)

#### Scenario: Invalid credentials show a generic error
- **WHEN** the user submits the form and the backend responds with `error.code = "INVALID_CREDENTIALS"`
- **THEN** the system SHALL display a single generic message (e.g. "Invalid organization ID, username, or password") near the form, SHALL NOT indicate which field was incorrect, and SHALL remain on `/login`

#### Scenario: Disabled account shows a specific error
- **WHEN** the user submits the form and the backend responds with `error.code = "ACCOUNT_DISABLED"`
- **THEN** the system SHALL display a message indicating the account is disabled and to contact an administrator, and SHALL remain on `/login`

#### Scenario: Submission in progress
- **WHEN** the user submits the form and a login request is in flight
- **THEN** the system SHALL disable the submit button and show a loading indicator until the request completes

### Requirement: Authenticated Route Guarding
The system SHALL restrict access to authenticated routes based on session state, restoring session state on app load.

#### Scenario: Unauthenticated access to a protected route
- **WHEN** a user with no valid session navigates to any route other than `/login`
- **THEN** the system SHALL redirect the user to `/login`

#### Scenario: Authenticated user visits the login route
- **WHEN** a user with a valid session navigates to `/login`
- **THEN** the system SHALL redirect the user to the default authenticated route (dashboard) instead of showing the login form

#### Scenario: Session restored on page reload
- **WHEN** a user with a valid session cookie reloads the application
- **THEN** the system SHALL call the session-check endpoint on startup and, if it returns `success: true`, treat the user as authenticated without requiring re-entry of credentials

### Requirement: Logout
The system SHALL allow an authenticated user to log out, clearing their session.

#### Scenario: User logs out
- **WHEN** an authenticated user triggers logout
- **THEN** the system SHALL call the backend logout endpoint, clear local authentication state, and redirect the user to `/login`
