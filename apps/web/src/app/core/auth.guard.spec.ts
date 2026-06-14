import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';

import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

const ROUTE = {} as ActivatedRouteSnapshot;
const STATE = {} as RouterStateSnapshot;

function configure(isAuthenticated: boolean): void {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } }],
  });
}

function configureAdmin(isAuthenticated: boolean, isAdmin: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated, isAdmin: () => isAdmin } },
    ],
  });
}

describe('authGuard', () => {
  it('allows navigation when authenticated', () => {
    configure(true);

    const result = TestBed.runInInjectionContext(() => authGuard(ROUTE, STATE));

    expect(result).toBe(true);
  });

  it('redirects to /login when not authenticated', () => {
    configure(false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => authGuard(ROUTE, STATE));

    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});

describe('adminGuard', () => {
  it('allows navigation for an authenticated admin', () => {
    configureAdmin(true, true);

    const result = TestBed.runInInjectionContext(() => adminGuard(ROUTE, STATE));

    expect(result).toBe(true);
  });

  it('redirects a non-admin to /dashboard', () => {
    configureAdmin(true, false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => adminGuard(ROUTE, STATE));

    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });

  it('redirects an unauthenticated user to /login', () => {
    configureAdmin(false, false);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => adminGuard(ROUTE, STATE));

    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});

describe('guestGuard', () => {
  it('allows navigation when not authenticated', () => {
    configure(false);

    const result = TestBed.runInInjectionContext(() => guestGuard(ROUTE, STATE));

    expect(result).toBe(true);
  });

  it('redirects to /dashboard when authenticated', () => {
    configure(true);
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => guestGuard(ROUTE, STATE));

    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
