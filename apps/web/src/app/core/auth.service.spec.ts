import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService, AuthUser } from './auth.service';

const USER: AuthUser = { id: '1', username: 'jane', displayName: 'Jane Doe', organizationSlug: 'acme', role: 'admin' };

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts unauthenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  describe('login', () => {
    it('stores the user and reports success on a successful login', async () => {
      const credentials = { organizationSlug: 'acme', username: 'jane', password: 'Password123!' };
      const resultPromise = service.login(credentials);

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush({ success: true, data: USER });

      expect(await resultPromise).toEqual({ success: true });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.user()).toEqual(USER);
    });

    it('reports the error code and leaves the user unauthenticated on invalid credentials', async () => {
      const resultPromise = service.login({ organizationSlug: 'acme', username: 'jane', password: 'wrong' });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid organization ID, username, or password' } },
        { status: 401, statusText: 'Unauthorized' },
      );

      expect(await resultPromise).toEqual({
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid organization ID, username, or password',
      });
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('checkSession', () => {
    it('marks the user authenticated when a session is active', async () => {
      const resultPromise = service.checkSession();

      const req = httpMock.expectOne('/api/auth/session');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: USER });

      await resultPromise;
      expect(service.isAuthenticated()).toBe(true);
      expect(service.initialized()).toBe(true);
    });

    it('marks the user unauthenticated when there is no active session', async () => {
      const resultPromise = service.checkSession();

      const req = httpMock.expectOne('/api/auth/session');
      req.flush({ success: false, error: { code: 'UNAUTHORIZED', message: 'No active session' } }, { status: 401, statusText: 'Unauthorized' });

      await resultPromise;
      expect(service.isAuthenticated()).toBe(false);
      expect(service.initialized()).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears the authenticated user', async () => {
      const loginPromise = service.login({ organizationSlug: 'acme', username: 'jane', password: 'Password123!' });
      httpMock.expectOne('/api/auth/login').flush({ success: true, data: USER });
      await loginPromise;
      expect(service.isAuthenticated()).toBe(true);

      const logoutPromise = service.logout();
      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: {} });

      await logoutPromise;
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });
  });
});
