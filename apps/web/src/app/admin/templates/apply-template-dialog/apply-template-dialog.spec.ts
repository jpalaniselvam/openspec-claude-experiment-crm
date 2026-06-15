import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { ApplyTemplateDialog } from './apply-template-dialog';
import { ApplyTemplateResultData, TemplateSummary, TemplatesService } from '../templates.service';

const TEMPLATE: TemplateSummary = {
  key: 'sales-crm',
  name: 'Sales CRM',
  description: 'Pipeline for sales teams',
  objects: [
    { apiName: 'deal', name: 'Deal', pluralName: 'Deals', fieldCount: 9 },
    { apiName: 'contact', name: 'Contact', pluralName: 'Contacts', fieldCount: 6 },
  ],
};

describe('ApplyTemplateDialog', () => {
  let component: ApplyTemplateDialog;
  let fixture: ComponentFixture<ApplyTemplateDialog>;
  let templatesService: jasmine.SpyObj<TemplatesService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ApplyTemplateDialog>>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    templatesService = jasmine.createSpyObj<TemplatesService>('TemplatesService', ['list', 'apply']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<ApplyTemplateDialog>>('MatDialogRef', ['close']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ApplyTemplateDialog, NoopAnimationsModule],
      providers: [
        { provide: TemplatesService, useValue: templatesService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: TEMPLATE },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyTemplateDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the confirm step showing the template summary', () => {
    expect(component.step()).toBe('confirm');
    const items = fixture.nativeElement.querySelectorAll('.template-objects li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Deals · 9 fields');
  });

  it('does not call apply when cancelled', () => {
    component.cancel();

    expect(templatesService.apply).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('goes through confirm -> applying -> result with created and skipped objects', async () => {
    const result: ApplyTemplateResultData = {
      templateKey: 'sales-crm',
      created: [{ apiName: 'deal', id: 'obj-1', fieldsCreated: ['name', 'amount'], fieldsSkipped: [] }],
      skipped: [{ apiName: 'contact', reason: 'OBJECT_ALREADY_EXISTS' }],
    };
    templatesService.apply.and.resolveTo({ success: true, data: result });

    const applyPromise = component.apply();
    expect(component.step()).toBe('applying');

    await applyPromise;
    fixture.detectChanges();

    expect(templatesService.apply).toHaveBeenCalledWith('sales-crm');
    expect(component.step()).toBe('result');

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('deal');
    expect(html).toContain('2 fields created');
    expect(html).toContain('contact');
    expect(html).toContain('Already exists in your org — skipped');
  });

  it('handles an idempotent re-apply where everything is skipped', async () => {
    const result: ApplyTemplateResultData = {
      templateKey: 'sales-crm',
      created: [],
      skipped: [
        { apiName: 'deal', reason: 'OBJECT_ALREADY_EXISTS' },
        { apiName: 'contact', reason: 'OBJECT_ALREADY_EXISTS' },
      ],
    };
    templatesService.apply.and.resolveTo({ success: true, data: result });

    await component.apply();
    fixture.detectChanges();

    expect(component.step()).toBe('result');
    expect(fixture.nativeElement.querySelector('#btn-view-objects')).toBeFalsy();
    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Already exists in your org — skipped');
  });

  it('shows a friendly message for a created object with a fieldsSkipped entry', async () => {
    const result: ApplyTemplateResultData = {
      templateKey: 'sales-crm',
      created: [
        {
          apiName: 'deal',
          id: 'obj-1',
          fieldsCreated: ['name'],
          fieldsSkipped: [{ apiKey: 'account', reason: 'LOOKUP_TARGET_ARCHIVED' }],
        },
      ],
      skipped: [],
    };
    templatesService.apply.and.resolveTo({ success: true, data: result });

    await component.apply();
    fixture.detectChanges();

    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Linked object is archived — field skipped');

    const viewObjectsBtn = fixture.nativeElement.querySelector('#btn-view-objects');
    expect(viewObjectsBtn).toBeTruthy();

    component.viewObjects();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/objects']);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('shows an error message and only a close action when apply fails', async () => {
    templatesService.apply.and.resolveTo({ success: false, error: { code: 'TEMPLATE_NOT_FOUND', message: 'Unknown template "sales-crm"' } });

    await component.apply();
    fixture.detectChanges();

    expect(component.step()).toBe('result');
    expect(component.errorMessage()).toBe('Unknown template "sales-crm"');
    expect(fixture.nativeElement.querySelector('#btn-close-apply-template')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#btn-done-apply-template')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#btn-view-objects')).toBeFalsy();
  });
});
