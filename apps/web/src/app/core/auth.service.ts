import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from './api-response';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  organizationSlug: string;
  role: 'admin' | 'member';
}

export interface LoginCredentials {
  organizationSlug: string;
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly initializedSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private readonly http: HttpClient) {}

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const response = await firstValueFrom(
      this.http
        .post<ApiResponse<AuthUser>>('/api/auth/login', credentials)
        .pipe(catchError((err) => of(err.error as ApiResponse<AuthUser>))),
    );

    if (response?.success) {
      this.userSignal.set(response.data);
      return { success: true };
    }

    return {
      success: false,
      errorCode: response?.error?.code,
      errorMessage: response?.error?.message,
    };
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<object>>('/api/auth/logout', {}).pipe(catchError(() => of(null))),
    );
    this.userSignal.set(null);
  }

  async checkSession(): Promise<void> {
    const response = await firstValueFrom(
      this.http
        .get<ApiResponse<AuthUser>>('/api/auth/session')
        .pipe(catchError((err) => of(err.error as ApiResponse<AuthUser>))),
    );

    this.userSignal.set(response?.success ? response.data : null);
    this.initializedSignal.set(true);
  }
}
