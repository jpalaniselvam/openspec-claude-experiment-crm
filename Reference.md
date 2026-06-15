# Product Requirements Document (PRD)

## Important notics

# Flexible Data Model for CRM

## Version

1.0

## Overview

The Flexible Data Model enables tenants to define their own business entities, relationships, fields, and workflows instead of being constrained to a fixed CRM schema.

The system should support both:

* **Default templates** for new tenants (Sales CRM, Recruitment CRM, Healthcare CRM, etc.)
* **Fully customizable models** that can evolve without application code changes.

The feature should function as a metadata-driven platform where the UI, API, validation, search, and automation engine operate from metadata definitions.

---

# Problem Statement

Traditional CRMs assume every business revolves around Contacts, Companies, and Deals.

Many organizations require custom entities such as:

* Hospitals
* Clinics
* Doctors
* Patients
* Suppliers
* Assets
* Projects
* Contracts
* Policies
* Claims

Current CRM customization is limited and often requires engineering effort.

The platform should allow administrators to model their business domain through configuration.

---

# Goals

* Support unlimited custom object types
* Allow custom fields on every object
* Support relationships between objects
* Enable metadata-driven UI rendering
* Support runtime schema evolution
* Provide reusable templates
* Require no downtime for schema changes

---

# Non Goals

* Full relational database designer
* Arbitrary SQL execution
* User-defined stored procedures
* Complex graph database capabilities

---

# User Personas

## CRM Administrator

Creates and manages business entities.

## Sales Manager

Uses predefined Sales CRM templates.

## Operations Team

Creates custom workflows around operational entities.

## Developer

Uses APIs to interact with dynamically defined objects.

---

# Core Concepts

## Tenant

Top-level isolation boundary.

```
Tenant
    ├── Metadata
    ├── Objects
    ├── Relationships
    └── Records
```

---

## Object Definition

Represents an entity type.

Examples:

```
Contact
Company
Deal
Invoice
Project
Doctor
Hospital
Patient
```

Properties

* Name
* Plural Name
* API Name
* Icon
* Description
* Color
* Default View
* Audit Enabled
* Soft Delete Enabled

Example

```
Object

Name:
Doctor

API:
doctor

Storage:
doctor_records
```

---

## Field Definition

Each object contains fields.

Example

```
Doctor

First Name
Last Name
Qualification
Specialization
Years Experience
Hospital
License Number
```

Metadata

* Name
* Internal Name
* Data Type
* Required
* Default Value
* Indexed
* Searchable
* Unique
* Read Only

---

## Supported Field Types

### Primitive

* Text
* Long Text
* Number
* Decimal
* Currency
* Boolean
* Date
* DateTime
* Time
* Email
* Phone
* URL

### Advanced

* Picklist
* Multi Picklist
* Enum
* JSON
* Rich Text
* Formula
* AI Generated
* Lookup
* Attachment
* User Reference

---

## Relationship Types

### One to One

```
Person
    ↔ Passport
```

---

### One to Many

```
Hospital

    ↓

Doctors
```

---

### Many to Many

```
Doctor

    ↔

Specialization
```

implemented through junction objects.

---

## Record Storage

Records are stored separately from metadata.

```
Metadata

Doctor
Fields
Relationships

----------------

Data

Record
Record
Record
Record
```

Metadata changes should not require migration of existing records when possible.

---

# Dynamic UI

Object metadata drives UI generation.

Automatically generated:

* List view
* Detail page
* Create form
* Edit form
* Search
* Filters
* Sorting
* Kanban (optional)
* Table view

No frontend code changes should be required for new objects.

---

# Default Templates

## Sales CRM

Objects

* Contacts
* Companies
* Deals
* Activities
* Tasks

Relationships

```
Company

   ↓

Contacts

   ↓

Deals

   ↓

Tasks
```

---

## Recruitment CRM

Objects

* Candidate
* Company
* Job Opening
* Interview
* Recruiter

---

## Healthcare CRM

Objects

* Hospital
* Doctor
* Patient
* Appointment
* Department

---

## Real Estate CRM

Objects

* Property
* Agent
* Buyer
* Seller
* Lead

---

## Blank Workspace

Starts with only:

* User
* Team
* Activity
* Task

Administrator builds everything else.

---

# Metadata Management

Administrators can:

* Create object
* Rename object
* Archive object
* Create field
* Delete field
* Reorder fields
* Change display field
* Configure search fields
* Configure default sorting
* Configure icons
* Configure colors

---

# Schema Versioning

Every metadata change increments schema version.

```
Version 1

Doctor
Name

----------------

Version 2

Doctor
Name
Qualification

----------------

Version 3

Doctor
Name
Qualification
Hospital
```

Previous record data remains accessible.

---

# Validation Rules

Supported validations

* Required
* Regex
* Min value
* Max value
* Unique
* Cross-field validation
* Formula validation

Validation executes before persistence.

---

# Search

Global search indexes:

* Primary field
* Secondary fields
* Configured searchable fields

Supports:

* Full text
* Prefix search
* Filters
* Object-specific search
* Cross-object search

---

# Permissions

Permissions exist at multiple levels.

## Object

* Read
* Create
* Update
* Delete

## Field

* Read
* Edit
* Hidden

## Record

Ownership-based access.

---

# Audit Trail

Track:

* Field changes
* Previous value
* New value
* User
* Timestamp

Supports historical reconstruction.

---

# APIs

## Metadata APIs

```
GET /objects

POST /objects

PUT /objects/{id}

DELETE /objects/{id}
```

---

## Field APIs

```
GET /objects/{id}/fields

POST /fields

PUT /fields/{id}
```

---

## Record APIs

Dynamic endpoint

```
GET /records/{object}

POST /records/{object}

PUT /records/{object}/{id}

DELETE /records/{object}/{id}
```

Example

```
GET /records/doctor

POST /records/hospital

GET /records/patient
```

---

# Future Enhancements

* Computed fields
* Rollup fields
* AI-generated attributes
* Conditional field visibility
* Dynamic forms
* Approval workflows
* Visual relationship designer
* Graph visualization
* Custom scripting
* Event triggers
* Formula engine
* Low-code automation builder

---

# Success Metrics

* New object creation in under 2 minutes
* New field addition without deployment
* Zero downtime for metadata changes
* 95% of UI generated from metadata
* Less than 5 minutes to onboard a new tenant using templates
* Less than 30 minutes to model a new business domain

---

# Architecture Recommendation

Adopt a **metadata-driven architecture** with three logical layers:

1. **Metadata Layer**: Stores object definitions, fields, relationships, permissions, and layouts.
2. **Data Layer**: Stores tenant records using either a JSONB approach or an Entity-Attribute-Value (EAV) model, with indexing for commonly queried fields.
3. **Runtime Engine**: Dynamically generates APIs, forms, list views, validation rules, search indexes, and automation behaviors from metadata.

This approach keeps the platform extensible while avoiding schema migrations for most tenant-level customizations.
