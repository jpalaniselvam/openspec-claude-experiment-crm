## ADDED Requirements

### Requirement: Admin shell renders a collapsible sidebar navigation
The system SHALL provide a shared `AdminShellComponent` that wraps all admin routes (`/admin/**`) and renders a `MatSidenav`-based layout. The sidebar SHALL display navigation links grouped into sections: Workspace (Dashboard) and Configuration (Objects, Users). The sidebar SHALL be collapsible to an icon-only mode via a toggle button. The shell SHALL use Angular's `<router-outlet>` for rendering child admin pages in the main content area.

#### Scenario: Admin loads any admin page
- **WHEN** an authenticated admin user navigates to any `/admin/*` route
- **THEN** the admin shell renders with the sidebar visible and the appropriate page in the content area

#### Scenario: Admin collapses the sidebar
- **WHEN** the admin clicks the collapse/expand toggle button
- **THEN** the sidebar transitions to icon-only mode, showing only icon indicators for each nav item

#### Scenario: Admin expands the sidebar
- **WHEN** the sidebar is in icon-only mode and the admin clicks the toggle
- **THEN** the sidebar expands to show full labels alongside icons

#### Scenario: Active route is highlighted
- **WHEN** the admin is on a given admin route (e.g., `/admin/objects`)
- **THEN** the corresponding sidebar nav item is visually highlighted as active
