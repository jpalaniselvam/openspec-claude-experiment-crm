import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { UsersPage } from './users-page';
import { OrgUser, UsersService } from '../users.service';
import { AuthService, AuthUser } from '../../../core/auth.service';

const SELF: AuthUser = { id: '1', username: 'acme:jane', displayName: 'Jane Doe', organizationSlug: 'acme', role: 'admin' };

const USERS: OrgUser[] = [
  { id: '1', username: 'acme:jane', displayName: 'Jane Doe', email: 'jane@example.com', role: 'admin', status: 'active' },
  { id: '2', username: 'acme:bob', displayName: 'Bob Smith', email: 'bob@example.com', role: 'member', status: 'disabled' },
];

describe('UsersPage', () => {
  let component: UsersPage;
  let fixture: ComponentFixture<UsersPage>;
  let usersService: jasmine.SpyObj<UsersService>;
  let dialog: MatDialog;

  beforeEach(async () => {
    usersService = jasmine.createSpyObj<UsersService>('UsersService', ['list', 'create', 'update']);
    usersService.list.and.resolveTo({ success: true, data: USERS });

    await TestBed.configureTestingModule({
      imports: [UsersPage, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: { user: () => SELF } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersPage);
    component = fixture.componentInstance;
    dialog = fixture.debugElement.injector.get(MatDialog);
  });

  it('loads and renders the users list on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.users()).toEqual(USERS);
    expect(component.loading()).toBe(false);

    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
  });

  it('shows an error message when loading fails', async () => {
    usersService.list.and.resolveTo({ success: false, error: { code: 'UNAUTHORIZED', message: 'No active session' } });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.errorMessage()).toBe('No active session');
    expect(component.users()).toEqual([]);
  });

  describe('openCreateDialog', () => {
    it('adds the newly created user to the list, keeping it sorted', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const createdUser: OrgUser = {
        id: '3',
        username: 'acme:adam',
        displayName: 'Adam Lee',
        email: 'adam@example.com',
        role: 'member',
        status: 'active',
      };
      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(createdUser) } as never);

      component.openCreateDialog();

      expect(component.users().map((u) => u.username)).toEqual(['acme:adam', 'acme:bob', 'acme:jane']);
    });

    it('does not modify the list when the dialog is dismissed without creating a user', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as never);

      component.openCreateDialog();

      expect(component.users()).toEqual(USERS);
    });
  });

  describe('role and status updates', () => {
    it('updates a user role', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const updated: OrgUser = { ...USERS[1], role: 'admin' };
      usersService.update.and.resolveTo({ success: true, data: updated });

      await component.updateRole(USERS[1], 'admin');

      expect(usersService.update).toHaveBeenCalledWith('2', { role: 'admin' });
      expect(component.users().find((u) => u.id === '2')).toEqual(updated);
    });

    it('updates a user status', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const updated: OrgUser = { ...USERS[1], status: 'active' };
      usersService.update.and.resolveTo({ success: true, data: updated });

      await component.updateStatus(USERS[1], 'active');

      expect(usersService.update).toHaveBeenCalledWith('2', { status: 'active' });
      expect(component.users().find((u) => u.id === '2')).toEqual(updated);
    });

    it('shows an error message when an update fails', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      usersService.update.and.resolveTo({
        success: false,
        error: { code: 'SELF_MODIFICATION', message: "You can't change your own role or status" },
      });

      await component.updateRole(USERS[0], 'member');

      expect(component.errorMessage()).toBe("You can't change your own role or status");
    });
  });

  describe('isSelf', () => {
    it('returns true for the signed-in user', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.isSelf(USERS[0])).toBe(true);
    });

    it('returns false for other users', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.isSelf(USERS[1])).toBe(false);
    });
  });
});
