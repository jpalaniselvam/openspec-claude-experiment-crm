import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../../core/api-response';

export interface OrgUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'disabled';
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role: 'admin' | 'member';
}

export interface UpdateUserInput {
  displayName?: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'disabled';
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(): Promise<ApiResponse<OrgUser[]>> {
    return firstValueFrom(
      this.http.get<ApiResponse<OrgUser[]>>('/api/users').pipe(catchError((err) => of(err.error as ApiResponse<OrgUser[]>))),
    );
  }

  create(input: CreateUserInput): Promise<ApiResponse<OrgUser>> {
    return firstValueFrom(
      this.http.post<ApiResponse<OrgUser>>('/api/users', input).pipe(catchError((err) => of(err.error as ApiResponse<OrgUser>))),
    );
  }

  update(id: string, input: UpdateUserInput): Promise<ApiResponse<OrgUser>> {
    return firstValueFrom(
      this.http
        .patch<ApiResponse<OrgUser>>(`/api/users/${id}`, input)
        .pipe(catchError((err) => of(err.error as ApiResponse<OrgUser>))),
    );
  }
}
