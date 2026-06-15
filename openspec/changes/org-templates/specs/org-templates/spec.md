## ADDED Requirements

### Requirement: Built-in template catalog
The system SHALL provide a built-in catalog of starter data-model templates. Each template has a unique kebab-case `key`, a `name`, a `description`, and a list of object definitions to create; each object definition has an `apiName`, `name`, `pluralName`, optional `description`/`icon`/`color`, and a list of field definitions using only the field `dataType`s already supported by `field-definitions` (`text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`). The catalog SHALL include exactly these four templates: `sales-crm` (Company, Contact, Deal, Activity, Task), `recruitment-crm` (Company, Recruiter, Job Opening, Candidate, Interview), `automobile` (Customer, Salesperson, Vehicle, Sales Order, Service Appointment), and `real-estate-crm` (Agent, Property, Seller, Buyer, Lead).

#### Scenario: Catalog contains the four required templates
- **WHEN** the template catalog is loaded
- **THEN** it contains templates with keys `sales-crm`, `recruitment-crm`, `automobile`, and `real-estate-crm`, each with at least one object definition

#### Scenario: Every template field uses an existing data type
- **WHEN** the template catalog is loaded
- **THEN** every field definition in every template object has a `dataType` that is one of `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `email`, `phone`, `url`, `picklist`, `lookup`

#### Scenario: Every template object has a text field at sortOrder 0
- **WHEN** the template catalog is loaded
- **THEN** for every object definition in every template, the field with `sortOrder = 0` has `dataType` of `text` or `long_text`

#### Scenario: Lookup fields reference objects within the same template
- **WHEN** the template catalog is loaded
- **THEN** every field with `dataType = "lookup"` in a template has a lookup target that matches the `apiName` of another object definition within that same template

### Requirement: List available templates
`GET /api/templates` SHALL return the template catalog (for each template: `key`, `name`, `description`, and a summary of its objects — `apiName`, `name`, `pluralName`, and field count), restricted to callers whose `role` is `admin`.

#### Scenario: Admin lists templates
- **WHEN** an authenticated user with `role = admin` calls `GET /api/templates`
- **THEN** the response is `200` with all four catalog templates and their object summaries

#### Scenario: Member is forbidden
- **WHEN** an authenticated user with `role = member` calls `GET /api/templates`
- **THEN** the response is `403` with error code `FORBIDDEN`

### Requirement: Apply a template to the current organization
`POST /api/templates/:key/apply` SHALL create object definitions and field definitions for the named template's objects in the caller's organization, restricted to callers whose `role` is `admin`. For each template object whose `apiName` does not already exist (in any `isArchived` state) in the organization, the object definition and all of its field definitions SHALL be created, with `lookup` fields resolved to the corresponding object definitions created in the same call (or to a pre-existing object definition of the same `apiName`, if that object's `apiName` collided and was therefore skipped). For each template object whose `apiName` already exists in the organization, the object definition SHALL be skipped: no object or field definitions are created or modified for it. The response SHALL report, for each template object, whether it was created or skipped (and why).

#### Scenario: Apply to an organization with no colliding objects
- **WHEN** an authenticated user with `role = admin` calls `POST /api/templates/sales-crm/apply` for an organization that has none of the `sales-crm` template's `apiName`s
- **THEN** the response is `200`
- **AND** an object definition and all its field definitions are created for each of the template's objects (Company, Contact, Deal, Activity, Task)
- **AND** the response's `created` list includes every template object with its new `id`

#### Scenario: Unknown template key
- **WHEN** an authenticated user with `role = admin` calls `POST /api/templates/does-not-exist/apply`
- **THEN** the response is `404` with error code `TEMPLATE_NOT_FOUND`

#### Scenario: Member is forbidden
- **WHEN** an authenticated user with `role = member` calls `POST /api/templates/sales-crm/apply`
- **THEN** the response is `403` with error code `FORBIDDEN`

#### Scenario: Colliding object is skipped without modification
- **WHEN** an organization already has an object definition with `apiName = "company"` (created independently of any template, with its own fields)
- **AND** an authenticated user with `role = admin` calls `POST /api/templates/sales-crm/apply`
- **THEN** the response is `200`
- **AND** the response's `skipped` list includes the `company` object with reason `OBJECT_ALREADY_EXISTS`
- **AND** no field definitions are added to or removed from the existing `company` object definition
- **AND** the remaining `sales-crm` objects (Contact, Deal, Activity, Task) are created as normal

#### Scenario: Re-applying a template is idempotent
- **WHEN** an authenticated user with `role = admin` calls `POST /api/templates/sales-crm/apply` for an organization where `sales-crm` was already fully applied
- **THEN** the response is `200`
- **AND** the response's `skipped` list includes every `sales-crm` object with reason `OBJECT_ALREADY_EXISTS`
- **AND** no new object or field definitions are created

#### Scenario: Lookup fields are wired to sibling objects created in the same apply
- **WHEN** an authenticated user with `role = admin` calls `POST /api/templates/sales-crm/apply` for an organization with none of the template's objects
- **THEN** the created `Contact` object's `company` lookup field has `lookupObjectDefinitionId` equal to the `id` of the created `Company` object
- **AND** the created `Deal` object's lookup fields referencing `Company` and `Contact` have `lookupObjectDefinitionId` equal to the `id`s of the created `Company` and `Contact` objects respectively

#### Scenario: Lookup target collided and is archived
- **WHEN** an organization already has an archived object definition with `apiName = "company"`
- **AND** an authenticated user with `role = admin` calls `POST /api/templates/sales-crm/apply`
- **THEN** the response is `200`
- **AND** the `company` object is skipped with reason `OBJECT_ALREADY_EXISTS`
- **AND** the created `Contact` and `Deal` objects are created without their `company`-targeting lookup field, and the response notes those fields as skipped with reason `LOOKUP_TARGET_ARCHIVED`

### Requirement: Created objects resolve a display field by default
Object definitions created by applying a template SHALL be created with `displayFieldApiKey = null`, relying on the existing default-resolution rule (first `text`/`long_text` field by `sortOrder`) to produce a human-readable display field.

#### Scenario: Created object has an effective display field without explicit configuration
- **WHEN** an authenticated user with `role = admin` applies the `sales-crm` template
- **THEN** each created object definition has `displayFieldApiKey = null`
- **AND** resolving the effective display field for each created object returns its `sortOrder = 0` field's `apiKey`
