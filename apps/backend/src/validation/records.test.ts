import { describe, expect, it, vi } from "vitest";
import { buildRecordSchema } from "./records.js";
import type { FieldDefinitionDto } from "../services/field-definition-service.js";

function field(overrides: Partial<FieldDefinitionDto>): FieldDefinitionDto {
  return {
    id: "field-1",
    apiKey: "field_1",
    name: "Field 1",
    dataType: "text",
    isRequired: false,
    isUnique: false,
    isSearchable: false,
    isReadOnly: false,
    defaultValue: null,
    options: null,
    lookupObjectDefinitionId: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe("buildRecordSchema", () => {
  it("rejects missing required fields", async () => {
    const schema = buildRecordSchema("org-1", [field({ apiKey: "name", dataType: "text", isRequired: true })]);

    const result = await schema.safeParseAsync({});

    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted or null", async () => {
    const schema = buildRecordSchema("org-1", [field({ apiKey: "nickname", dataType: "text", isRequired: false })]);

    expect((await schema.safeParseAsync({})).success).toBe(true);
    expect((await schema.safeParseAsync({ nickname: null })).success).toBe(true);
  });

  it("validates types per dataType", async () => {
    const schema = buildRecordSchema("org-1", [
      field({ apiKey: "age", dataType: "number" }),
      field({ apiKey: "active", dataType: "boolean" }),
      field({ apiKey: "email", dataType: "email" }),
      field({ apiKey: "website", dataType: "url" }),
      field({ apiKey: "birthday", dataType: "date" }),
      field({ apiKey: "seen_at", dataType: "datetime" }),
    ]);

    expect((await schema.safeParseAsync({ age: "not a number" })).success).toBe(false);
    expect((await schema.safeParseAsync({ active: "yes" })).success).toBe(false);
    expect((await schema.safeParseAsync({ email: "not-an-email" })).success).toBe(false);
    expect((await schema.safeParseAsync({ website: "not-a-url" })).success).toBe(false);
    expect((await schema.safeParseAsync({ birthday: "not-a-date" })).success).toBe(false);
    expect((await schema.safeParseAsync({ seen_at: "not-a-datetime" })).success).toBe(false);

    expect(
      (
        await schema.safeParseAsync({
          age: 30,
          active: true,
          email: "person@example.com",
          website: "https://example.com",
          birthday: "2026-01-01",
          seen_at: "2026-01-01T00:00:00.000Z",
        })
      ).success,
    ).toBe(true);
  });

  it("enforces picklist membership", async () => {
    const schema = buildRecordSchema("org-1", [field({ apiKey: "status", dataType: "picklist", options: ["open", "closed"] })]);

    expect((await schema.safeParseAsync({ status: "unknown" })).success).toBe(false);
    expect((await schema.safeParseAsync({ status: "open" })).success).toBe(true);
  });

  it("rejects unknown keys", async () => {
    const schema = buildRecordSchema("org-1", [field({ apiKey: "name", dataType: "text" })]);

    const result = await schema.safeParseAsync({ name: "Alice", extra: "nope" });

    expect(result.success).toBe(false);
  });

  describe("lookup fields", () => {
    const lookupField = field({
      apiKey: "assigned_doctor",
      dataType: "lookup",
      isRequired: true,
      lookupObjectDefinitionId: "obj-doctor",
    });

    it("fails when the referenced record does not exist", async () => {
      const lookupExists = vi.fn().mockResolvedValue(false);
      const schema = buildRecordSchema("org-1", [lookupField], lookupExists);

      const result = await schema.safeParseAsync({ assigned_doctor: "11111111-1111-4111-8111-111111111111" });

      expect(result.success).toBe(false);
      expect(lookupExists).toHaveBeenCalledWith("org-1", "obj-doctor", "11111111-1111-4111-8111-111111111111");
    });

    it("passes when the referenced record exists", async () => {
      const lookupExists = vi.fn().mockResolvedValue(true);
      const schema = buildRecordSchema("org-1", [lookupField], lookupExists);

      const result = await schema.safeParseAsync({ assigned_doctor: "11111111-1111-4111-8111-111111111111" });

      expect(result.success).toBe(true);
    });
  });
});
