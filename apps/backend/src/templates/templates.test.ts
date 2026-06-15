import { describe, expect, it } from "vitest";
import { fieldDataTypeSchema } from "../validation/fields.js";
import { templates } from "./index.js";

const VALID_DATA_TYPES = new Set(fieldDataTypeSchema.options);
const DISPLAY_FIELD_DATA_TYPES = new Set(["text", "long_text"]);

describe("template catalog", () => {
  it("contains the four required templates", () => {
    expect(Object.keys(templates).sort()).toEqual(
      ["automobile", "real-estate-crm", "recruitment-crm", "sales-crm"].sort(),
    );

    for (const template of Object.values(templates)) {
      expect(template.objects.length).toBeGreaterThan(0);
    }
  });

  it("every field uses an existing data type", () => {
    for (const template of Object.values(templates)) {
      for (const object of template.objects) {
        for (const field of object.fields) {
          expect(VALID_DATA_TYPES.has(field.dataType)).toBe(true);
        }
      }
    }
  });

  it("every object's sortOrder 0 field is text or long_text", () => {
    for (const template of Object.values(templates)) {
      for (const object of template.objects) {
        const firstField = object.fields.find((field) => field.sortOrder === 0);

        expect(firstField).toBeDefined();
        expect(DISPLAY_FIELD_DATA_TYPES.has(firstField!.dataType)).toBe(true);
      }
    }
  });

  it("every lookup field references an object within the same template", () => {
    for (const template of Object.values(templates)) {
      const apiNames = new Set(template.objects.map((object) => object.apiName));

      for (const object of template.objects) {
        for (const field of object.fields) {
          if (field.dataType === "lookup") {
            expect(field.lookupTargetApiName).toBeDefined();
            expect(apiNames.has(field.lookupTargetApiName!)).toBe(true);
          }
        }
      }
    }
  });
});
