import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';

import { CreateUserDialog } from './create-user-dialog';
import { OrgUser, UsersService } from '../users.service';

const CREATED_USER: OrgUser = {
  id: '2',
  username: 'acme:newuser',
  displayName: 'New User',
  email: 'new@example.com',
  role: 'member',
  status: 'active',
};

describe('CreateUserDialog', () => {
  let component: CreateUserDialog;
  let fixture: ComponentFixture<CreateUserDialog>;
  let usersService: jasmine.SpyObj<UsersService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CreateUserDialog, OrgUser>>;

  beforeEach(async () => {
    usersService = jasmine.createSpyObj<UsersService>('UsersService', ['create']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<CreateUserDialog, OrgUser>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [CreateUserDialog, NoopAnimationsModule],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateUserDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.form.setValue({
      username: 'newuser',
      displayName: 'New User',
      email: 'new@example.com',
      password: 'Password123!',
      role: 'member',
    });
  }

  it('does not submit and marks fields touched when the form is invalid', async () => {
    await component.onSubmit();

    expect(usersService.create).not.toHaveBeenCalled();
    expect(component.form.get('username')?.touched).toBe(true);
  });

  it('closes the dialog with the created user on success', async () => {
    fillValidForm();
    usersService.create.and.resolveTo({ success: true, data: CREATED_USER });

    await component.onSubmit();

    expect(usersService.create).toHaveBeenCalledWith(component.form.getRawValue());
    expect(dialogRef.close).toHaveBeenCalledWith(CREATED_USER);
    expect(component.submitting()).toBe(false);
  });

  it('shows a friendly message when the username is already taken', async () => {
    fillValidForm();
    usersService.create.and.resolveTo({
      success: false,
      error: { code: 'USERNAME_TAKEN', message: 'Username already exists' },
    });

    await component.onSubmit();

    expect(component.errorMessage()).toBe('This username is already in use.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('shows the server error message for other failures', async () => {
    fillValidForm();
    usersService.create.and.resolveTo({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email must be a valid email address' },
    });

    await component.onSubmit();

    expect(component.errorMessage()).toBe('Email must be a valid email address');
  });

  it('closes without a result on cancel', () => {
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
