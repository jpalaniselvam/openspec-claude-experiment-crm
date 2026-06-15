## MODIFIED Requirements

### Requirement: Admin shell renders a collapsible sidebar navigation
The system SHALL provide a shared shell component that wraps all authenticated routes and renders a `MatSidenav`-based layout, guarded only by authentication (not admin role). The sidebar SHALL display navigation links grouped into sections: Workspace (Dashboard), Data (one item per non-archived object definition, fetched via `GET /api/objects`), and Configuration (Objects, Users), where the Configuration section is rendered only for users whose `role` is `admin`. The sidebar SHALL be collapsible to an icon-only mode via a toggle button. The shell SHALL use Angular's `<router-outlet>` for rendering child pages in the main content area.

#### Scenario: Any authenticated user loads the shell
- **WHEN** an authenticated user (any role) navigates to any route wrapped by the shell
- **THEN** the shell renders with the sidebar visible and the appropriate page in the content area

#### Scenario: Data section lists non-archived objects
- **WHEN** an authenticated user (any role) views the sidebar
- **THEN** the Data section shows one nav item per non-archived object definition returned by `GET /api/objects`, each showing the object's icon and `pluralName` and linking to `/objects/:apiName`

#### Scenario: Configuration section is visible to admins
- **WHEN** an authenticated user with `role = admin` views the sidebar
- **THEN** the Configuration section is shown with links to Objects and Users

#### Scenario: Configuration section is hidden from members
- **WHEN** an authenticated user with `role = member` views the sidebar
- **THEN** the Configuration section is not shown

#### Scenario: User collapses the sidebar
- **WHEN** the user clicks the collapse/expand toggle button
- **THEN** the sidebar transitions to icon-only mode, showing only icon indicators for each nav item

#### Scenario: User expands the sidebar
- **WHEN** the sidebar is in icon-only mode and the user clicks the toggle
- **THEN** the sidebar expands to show full labels alongside icons

#### Scenario: Active route is highlighted
- **WHEN** the user is on a given route represented by a sidebar nav item (e.g., `/admin/objects` or `/objects/doctor`)
- **THEN** the corresponding sidebar nav item is visually highlighted as active
