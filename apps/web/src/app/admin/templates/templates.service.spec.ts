import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApplyTemplateResultData, TemplateSummary, TemplatesService } from './templates.service';

const TEMPLATES: TemplateSummary[] = [
  {
    key: 'sales-crm',
    name: 'Sales CRM',
    description: 'A starter sales pipeline',
    objects: [{ apiName: 'deal', name: 'Deal', pluralName: 'Deals', fieldCount: 9 }],
  },
];

const APPLY_RESULT: ApplyTemplateResultData = {
  templateKey: 'sales-crm',
  created: [{ apiName: 'deal', id: 'obj-1', fieldsCreated: ['name', 'amount'], fieldsSkipped: [] }],
  skipped: [],
};

describe('TemplatesService', () => {
  let service: TemplatesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TemplatesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('list', () => {
    it('returns the template catalog on success', async () => {
      const resultPromise = service.list();

      const req = httpMock.expectOne('/api/templates');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: TEMPLATES });

      expect(await resultPromise).toEqual({ success: true, data: TEMPLATES });
    });

    it('returns the error response on failure', async () => {
      const resultPromise = service.list();

      const req = httpMock.expectOne('/api/templates');
      req.flush(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No active session' } },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(await resultPromise).toEqual({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No active session' },
      });
    });
  });

  describe('apply', () => {
    it('returns the apply result on success', async () => {
      const resultPromise = service.apply('sales-crm');

      const req = httpMock.expectOne('/api/templates/sales-crm/apply');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: APPLY_RESULT });

      expect(await resultPromise).toEqual({ success: true, data: APPLY_RESULT });
    });

    it('returns the error response on failure', async () => {
      const resultPromise = service.apply('unknown-template');

      const req = httpMock.expectOne('/api/templates/unknown-template/apply');
      req.flush(
        { success: false, error: { code: 'TEMPLATE_NOT_FOUND', message: 'Unknown template "unknown-template"' } },
        { status: 404, statusText: 'Not Found' },
      );

      expect(await resultPromise).toEqual({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Unknown template "unknown-template"' },
      });
    });
  });
});
