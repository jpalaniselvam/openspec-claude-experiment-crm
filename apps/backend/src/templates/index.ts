import { automobileTemplate } from "./automobile.js";
import { realEstateCrmTemplate } from "./real-estate.js";
import { recruitmentCrmTemplate } from "./recruitment-crm.js";
import { salesCrmTemplate } from "./sales-crm.js";
import type { Template } from "./types.js";

export const templates: Record<string, Template> = {
  "sales-crm": salesCrmTemplate,
  "recruitment-crm": recruitmentCrmTemplate,
  automobile: automobileTemplate,
  "real-estate-crm": realEstateCrmTemplate,
};

export function getTemplate(key: string): Template | undefined {
  return templates[key];
}

export interface TemplateObjectSummary {
  apiName: string;
  name: string;
  pluralName: string;
  fieldCount: number;
}

export interface TemplateSummary {
  key: string;
  name: string;
  description: string;
  objects: TemplateObjectSummary[];
}

export function listTemplateSummaries(): TemplateSummary[] {
  return Object.values(templates).map((template) => ({
    key: template.key,
    name: template.name,
    description: template.description,
    objects: template.objects.map((object) => ({
      apiName: object.apiName,
      name: object.name,
      pluralName: object.pluralName,
      fieldCount: object.fields.length,
    })),
  }));
}
