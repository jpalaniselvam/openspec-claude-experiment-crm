import type { CreateFieldInput } from "../validation/fields.js";

export type TemplateFieldDataType = CreateFieldInput["dataType"];

export interface TemplateField {
  apiKey: string;
  name: string;
  dataType: TemplateFieldDataType;
  isRequired?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  isReadOnly?: boolean;
  defaultValue?: unknown;
  options?: string[];
  /** Template-local `apiName` of the object this lookup field targets (only for `dataType: "lookup"`). */
  lookupTargetApiName?: string;
  sortOrder: number;
}

export interface TemplateObject {
  apiName: string;
  name: string;
  pluralName: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: TemplateField[];
}

export interface Template {
  key: string;
  name: string;
  description: string;
  objects: TemplateObject[];
}
