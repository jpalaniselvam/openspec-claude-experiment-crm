import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Login } from './login';
import { AuthService, LoginResult } from '../../core/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setFormValue(): void {
    component.form.setValue({ organizationSlug: 'acme', username: 'jane', password: 'Password123!' });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders labeled fields, a masked password input, and a Log In button', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Organization ID');
    expect(compiled.textContent).toContain('Username');
    expect(compiled.textContent).toContain('Password');
    expect(compiled.textContent).toContain('Log In');

    const passwordInput = compiled.querySelector('input[formControlName="password"]') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });

  it('shows required-field errors and does not call the backend when the form is empty', () => {
    component.onSubmit();
    fixture.detectChanges();

    expect(authService.login).not.toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('mat-error').length).toBe(3);
  });

  it('navigates to /dashboard on a successful login', async () => {
    authService.login.and.resolveTo({ success: true } satisfies LoginResult);
    setFormValue();

    await component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.errorMessage()).toBeNull();
    expect(component.submitting()).toBe(false);
  });

  it('shows a generic error for invalid credentials and stays on the page', async () => {
    authService.login.and.resolveTo({ success: false, errorCode: 'INVALID_CREDENTIALS' } satisfies LoginResult);
    setFormValue();

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Invalid organization ID, username, or password.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Invalid organization ID, username, or password.');
  });

  it('shows a distinct message for a disabled account', async () => {
    authService.login.and.resolveTo({ success: false, errorCode: 'ACCOUNT_DISABLED' } satisfies LoginResult);
    setFormValue();

    await component.onSubmit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Your account has been disabled. Contact your administrator.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('disables the submit button and shows a spinner while the request is in flight', async () => {
    let resolveLogin!: (result: LoginResult) => void;
    authService.login.and.returnValue(new Promise<LoginResult>((resolve) => (resolveLogin = resolve)));
    setFormValue();

    const submitPromise = component.onSubmit();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();

    resolveLogin({ success: true });
    await submitPromise;
  });
});
