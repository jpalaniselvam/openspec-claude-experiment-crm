import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TemplatesPage } from './templates-page';
import { TemplateSummary, TemplatesService } from '../templates.service';

const TEMPLATES: TemplateSummary[] = [
  {
    key: 'sales-crm',
    name: 'Sales CRM',
    description: 'Pipeline for sales teams',
    objects: [
      { apiName: 'deal', name: 'Deal', pluralName: 'Deals', fieldCount: 9 },
      { apiName: 'contact', name: 'Contact', pluralName: 'Contacts', fieldCount: 6 },
    ],
  },
  {
    key: 'recruitment-crm',
    name: 'Recruitment CRM',
    description: 'Track candidates and openings',
    objects: [{ apiName: 'candidate', name: 'Candidate', pluralName: 'Candidates', fieldCount: 8 }],
  },
  {
    key: 'automobile',
    name: 'Automobile',
    description: 'Dealership inventory and sales',
    objects: [{ apiName: 'vehicle', name: 'Vehicle', pluralName: 'Vehicles', fieldCount: 10 }],
  },
  {
    key: 'real-estate-crm',
    name: 'Real Estate CRM',
    description: 'Listings and clients',
    objects: [{ apiName: 'listing', name: 'Listing', pluralName: 'Listings', fieldCount: 7 }],
  },
];

describe('TemplatesPage', () => {
  let component: TemplatesPage;
  let fixture: ComponentFixture<TemplatesPage>;
  let templatesService: jasmine.SpyObj<TemplatesService>;

  beforeEach(async () => {
    templatesService = jasmine.createSpyObj<TemplatesService>('TemplatesService', ['list', 'apply']);
    templatesService.list.and.resolveTo({ success: true, data: TEMPLATES });

    await TestBed.configureTestingModule({
      imports: [TemplatesPage, NoopAnimationsModule],
      providers: [{ provide: TemplatesService, useValue: templatesService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesPage);
    component = fixture.componentInstance;
  });

  it('loads and renders all four templates on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.templates()).toEqual(TEMPLATES);
    expect(component.loading()).toBe(false);

    const panels = fixture.nativeElement.querySelectorAll('mat-expansion-panel');
    expect(panels.length).toBe(4);
    expect(fixture.nativeElement.querySelector('#panel-template-sales-crm')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#panel-template-recruitment-crm')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#panel-template-automobile')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#panel-template-real-estate-crm')).toBeTruthy();
  });

  it('shows a loading spinner while fetching templates', () => {
    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
  });

  it('shows an error message when loading fails', async () => {
    templatesService.list.and.resolveTo({ success: false, error: { code: 'UNAUTHORIZED', message: 'No active session' } });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No active session');
    expect(fixture.nativeElement.querySelector('.error-msg')?.textContent).toContain('No active session');
  });
});
