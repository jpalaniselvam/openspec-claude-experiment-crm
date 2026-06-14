import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

const ROUTE = {} as ActivatedRouteSnapshot;
const STATE = {} as RouterStateSnapshot;

function configure(isAuthenticated: boolean): void {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } }],
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
