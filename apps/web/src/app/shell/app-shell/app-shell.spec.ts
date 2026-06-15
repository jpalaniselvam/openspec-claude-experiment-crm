import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AppShell } from './app-shell';
import { ObjectDefinition, ObjectsService } from '../../admin/objects/objects.service';
import { AuthService, AuthUser } from '../../core/auth.service';

const MEMBER: AuthUser = { id: '1', username: 'acme:bob', displayName: 'Bob Smith', organizationSlug: 'acme', role: 'member' };
const ADMIN: AuthUser = { id: '2', username: 'acme:jane', displayName: 'Jane Doe', organizationSlug: 'acme', role: 'admin' };

const OBJECTS: ObjectDefinition[] = [
  {
    id: 'obj-1',
    apiName: 'doctor',
    name: 'Doctor',
    pluralName: 'Doctors',
    description: null,
    icon: 'medical_services',
    color: null,
    schemaVersion: 1,
    isArchived: false,
    displayFieldApiKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'obj-2',
    apiName: 'hospital',
    name: 'Hospital',
    pluralName: 'Hospitals',
    description: null,
    icon: 'local_hospital',
    color: null,
    schemaVersion: 1,
    isArchived: false,
    displayFieldApiKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function setup(user: AuthUser): Promise<{ fixture: ComponentFixture<AppShell>; objectsService: jasmine.SpyObj<ObjectsService> }> {
  const objectsService = jasmine.createSpyObj<ObjectsService>('ObjectsService', ['list']);
  objectsService.list.and.resolveTo({ success: true, data: OBJECTS });

  await TestBed.configureTestingModule({
    imports: [AppShell, NoopAnimationsModule],
    providers: [
      provideRouter([{ path: 'objects/:apiName', children: [] }]),
      { provide: ObjectsService, useValue: objectsService },
      { provide: AuthService, useValue: { user: () => user, isAdmin: () => user.role === 'admin', logout: () => Promise.resolve() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AppShell);
  return { fixture, objectsService };
}

describe('AppShell', () => {
  it('loads for any authenticated user', async () => {
    const { fixture } = await setup(MEMBER);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dashboardLink = fixture.nativeElement.querySelector('#nav-dashboard');
    expect(dashboardLink).toBeTruthy();
  });

  it('renders the DATA section from GET /api/objects', async () => {
    const { fixture, objectsService } = await setup(MEMBER);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(objectsService.list).toHaveBeenCalled();
    expect(fixture.componentInstance.objects()).toEqual(OBJECTS);

    const doctorLink = fixture.nativeElement.querySelector('#nav-object-doctor');
    const hospitalLink = fixture.nativeElement.querySelector('#nav-object-hospital');
    expect(doctorLink?.textContent).toContain('Doctors');
    expect(hospitalLink?.textContent).toContain('Hospitals');
  });

  it('shows the CONFIGURATION section for admins', async () => {
    const { fixture } = await setup(ADMIN);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#nav-objects')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#nav-users')).toBeTruthy();

    const templatesLink = fixture.nativeElement.querySelector('#nav-templates');
    expect(templatesLink).toBeTruthy();
    expect(templatesLink.getAttribute('href')).toBe('/admin/templates');
    expect(templatesLink.textContent).toContain('Templates');
  });

  it('hides the CONFIGURATION section for members', async () => {
    const { fixture } = await setup(MEMBER);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#nav-objects')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#nav-templates')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#nav-users')).toBeFalsy();
  });

  it('toggles the collapsed state of the sidebar', async () => {
    const { fixture } = await setup(MEMBER);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.collapsed()).toBe(false);

    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();

    expect(fixture.componentInstance.collapsed()).toBe(true);
    const sidenav = fixture.nativeElement.querySelector('.shell-sidenav');
    expect(sidenav.classList.contains('collapsed')).toBe(true);

    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();

    expect(fixture.componentInstance.collapsed()).toBe(false);
  });

  it('highlights the active route in the DATA section', async () => {
    const { fixture } = await setup(MEMBER);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/objects/doctor');
    fixture.detectChanges();

    const doctorLink = fixture.nativeElement.querySelector('#nav-object-doctor');
    const hospitalLink = fixture.nativeElement.querySelector('#nav-object-hospital');
    expect(doctorLink.classList.contains('active-link')).toBe(true);
    expect(hospitalLink.classList.contains('active-link')).toBe(false);
  });
});
