# Dynamic Form Renderer

## Purpose
TBD: This capability provides dynamic, data-driven form rendering based on metadata definitions.

## Requirements

### Requirement: DynamicFormComponent renders a reactive form from field metadata
The system SHALL provide a standalone Angular `DynamicFormComponent` that accepts an array of `FieldDefinition` objects and builds a `FormGroup` programmatically. Each field definition SHALL map to a form control with appropriate validators. The component SHALL expose the constructed `FormGroup` via a public property so parent components can read form state and validity.

#### Scenario: Component initializes with field definitions
- **WHEN** `DynamicFormComponent` is provided a `FieldDefinition[]` input
- **THEN** it builds a `FormGroup` with one control per field, applying `Validators.required` for fields where `isRequired` is true

#### Scenario: Component receives an existing value for edit mode
- **WHEN** the optional `value: Record<string, unknown>` input is provided
- **THEN** each form control is pre-populated with the corresponding value from the record

### Requirement: Dynamic form renders correct widget per field data type
The system SHALL render the appropriate Angular Material input widget for each supported field data type:
- `text`, `email`, `phone`, `url` → `MatInput` (text input; email/url apply format validators)
- `long_text` → `MatTextarea`
- `number`, `decimal` → `MatInput` with `type="number"`
- `boolean` → `MatSlideToggle`
- `date` → `MatDatepicker` (date only)
- `datetime` → `MatDatepicker` (date) plus a time text input
- `picklist` → `MatSelect` populated from the field's `options[]` array
- `lookup` → `MatSelect` populated asynchronously from the resolved object's records

#### Scenario: Text field renders as MatInput
- **WHEN** a field with `dataType: "text"` is included
- **THEN** a labeled `MatInput` of type text is rendered for that field

#### Scenario: Boolean field renders as MatSlideToggle
- **WHEN** a field with `dataType: "boolean"` is included
- **THEN** a `MatSlideToggle` is rendered for that field

#### Scenario: Picklist field renders as MatSelect with options
- **WHEN** a field with `dataType: "picklist"` and `options: ["Option A", "Option B"]` is included
- **THEN** a `MatSelect` is rendered with those options as `<mat-option>` items

#### Scenario: Lookup field shows loading then options
- **WHEN** a field with `dataType: "lookup"` is included
- **THEN** the `MatSelect` shows a loading indicator while fetching records, then populates with the fetched record labels

### Requirement: Read-only fields are rendered as disabled inputs
The system SHALL render fields where `isReadOnly` is true as disabled form controls. The widget SHALL still be visible but non-interactive, with a visual indication that the field cannot be edited.

#### Scenario: Read-only field is non-interactive
- **WHEN** a field with `isReadOnly: true` is rendered
- **THEN** the corresponding form control is disabled and visually styled as read-only

### Requirement: Dynamic form emits validity state to parent
The system SHALL allow parent components to access the `FormGroup` directly. The component SHALL expose a `getFormValue()` method that returns the current form value as `Record<string, unknown>`.

#### Scenario: Parent reads form value on submit
- **WHEN** a parent component calls `dynamicForm.getFormValue()`
- **THEN** it receives the current values of all form controls as a plain object keyed by `apiKey`
