import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("../services/template-service.js", () => ({
  listTemplates: vi.fn(),
  applyTemplate: vi.fn(),
}));

vi.mock("../services/object-definition-service.js", () => ({
  listObjectDefinitions: vi.fn(),
  createObjectDefinition: vi.fn(),
  getObjectDefinition: vi.fn(),
  updateObjectDefinition: vi.fn(),
}));

vi.mock("../services/field-definition-service.js", () => ({
  listFieldDefinitions: vi.fn(),
  createFieldDefinition: vi.fn(),
  updateFieldDefinition: vi.fn(),
  deleteFieldDefinition: vi.fn(),
}));

const { listTemplates, applyTemplate } = await import("../services/template-service.js");
const { listObjectDefinitions } = await import("../services/object-definition-service.js");
const { listFieldDefinitions } = await import("../services/field-definition-service.js");
const { listTemplateSummaries } = await import("../templates/index.js");
const { createApp } = await import("../app.js");

const app = createApp();

const ADMIN_SESSION = { user: { id: "admin-1", organizationId: "org-1", role: "admin" } };
const MEMBER_SESSION = { user: { id: "user-1", organizationId: "org-1", role: "member" } };

const TEMPLATE_SUMMARIES = listTemplateSummaries();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/templates", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/templates");

    expect(res.status).toBe(401);
    expect(listTemplates).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when the session user is a member", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).get("/api/templates");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(listTemplates).not.toHaveBeenCalled();
  });

  it("returns 200 with all four catalog templates for an admin", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listTemplates).mockReturnValueOnce(TEMPLATE_SUMMARIES);

    const res = await request(app).get("/api/templates");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: TEMPLATE_SUMMARIES });
    expect((res.body.data as Array<{ key: string }>).map((t) => t.key).sort()).toEqual(
      ["automobile", "real-estate-crm", "recruitment-crm", "sales-crm"].sort(),
    );
  });
});

describe("POST /api/templates/:key/apply", () => {
  it("returns 401 when there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await request(app).post("/api/templates/sales-crm/apply");

    expect(res.status).toBe(401);
    expect(applyTemplate).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when the session user is a member", async () => {
    getSessionMock.mockResolvedValueOnce(MEMBER_SESSION);

    const res = await request(app).post("/api/templates/sales-crm/apply");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(applyTemplate).not.toHaveBeenCalled();
  });

  it("returns 404 TEMPLATE_NOT_FOUND for an unknown template key", async () => {
    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(applyTemplate).mockResolvedValueOnce({
      ok: false,
      code: "TEMPLATE_NOT_FOUND",
      message: 'Unknown template "unknown-key"',
    });

    const res = await request(app).post("/api/templates/unknown-key/apply");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TEMPLATE_NOT_FOUND");
    expect(applyTemplate).toHaveBeenCalledWith("org-1", "unknown-key");
  });

  it("applies sales-crm to a fresh org, and the created objects/fields are reflected by the objects and fields APIs", async () => {
    const applyResult = {
      templateKey: "sales-crm",
      created: [
        { apiName: "company", id: "company-id", fieldsCreated: ["name", "industry"], fieldsSkipped: [] },
        { apiName: "contact", id: "contact-id", fieldsCreated: ["name", "company"], fieldsSkipped: [] },
        { apiName: "deal", id: "deal-id", fieldsCreated: ["name", "company", "primary_contact"], fieldsSkipped: [] },
        { apiName: "activity", id: "activity-id", fieldsCreated: ["subject"], fieldsSkipped: [] },
        { apiName: "task", id: "task-id", fieldsCreated: ["title"], fieldsSkipped: [] },
      ],
      skipped: [],
    };

    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(applyTemplate).mockResolvedValueOnce({ ok: true, result: applyResult });

    const applyRes = await request(app).post("/api/templates/sales-crm/apply");

    expect(applyRes.status).toBe(200);
    expect(applyRes.body).toEqual({ success: true, data: applyResult });
    expect(applyTemplate).toHaveBeenCalledWith("org-1", "sales-crm");

    const OBJECT_DTOS = applyResult.created.map((object) => ({
      id: object.id,
      apiName: object.apiName,
      name: object.apiName,
      pluralName: `${object.apiName}s`,
      description: null,
      icon: null,
      color: null,
      schemaVersion: 1 + object.fieldsCreated.length,
      isArchived: false,
      displayFieldApiKey: null,
    }));

    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listObjectDefinitions).mockResolvedValueOnce(OBJECT_DTOS);

    const objectsRes = await request(app).get("/api/objects");

    expect(objectsRes.status).toBe(200);
    expect((objectsRes.body.data as Array<{ apiName: string }>).map((o) => o.apiName)).toEqual(
      expect.arrayContaining(["company", "contact", "deal", "activity", "task"]),
    );

    const COMPANY_LOOKUP_FIELD = {
      id: "field-contact-company",
      apiKey: "company",
      name: "Company",
      dataType: "lookup",
      isRequired: false,
      isUnique: false,
      isSearchable: false,
      isReadOnly: false,
      defaultValue: null,
      options: null,
      lookupObjectDefinitionId: "company-id",
      sortOrder: 1,
    };

    getSessionMock.mockResolvedValueOnce(ADMIN_SESSION);
    vi.mocked(listFieldDefinitions).mockResolvedValueOnce({ ok: true, fields: [COMPANY_LOOKUP_FIELD] });

    const fieldsRes = await request(app).get("/api/objects/contact-id/fields");

    expect(fieldsRes.status).toBe(200);
    expect(listFieldDefinitions).toHaveBeenCalledWith("org-1", "contact-id");

    const companyField = (fieldsRes.body.data as Array<{ apiKey: string; lookupObjectDefinitionId: string | null }>).find(
      (field) => field.apiKey === "company",
    );
    expect(companyField?.lookupObjectDefinitionId).toBe("company-id");
  });
});
