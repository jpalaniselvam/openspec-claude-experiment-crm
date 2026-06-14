import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../../core/api-response';

export interface ObjectDefinition {
  id: string;
  apiName: string;
  name: string;
  pluralName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  schemaVersion: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObjectInput {
  apiName: string;
  name: string;
  pluralName: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateObjectInput {
  name?: string;
  pluralName?: string;
  description?: string;
  icon?: string;
  color?: string;
  isArchived?: boolean;
}

export const COMMON_ICONS = [
  'category', 'business', 'people', 'person', 'group', 'work', 'assignment',
  'shopping_cart', 'store', 'attach_money', 'account_balance', 'receipt',
  'local_hospital', 'medical_services', 'favorite', 'monitor_heart', 
  'science', 'school', 'build', 'event', 'today', 'calendar_month',
  'task', 'inventory', 'local_shipping', 'flight', 'home', 
  'dashboard', 'assessment', 'analytics', 'email', 'phone',
  'chat', 'campaign', 'bug_report', 'verified', 'folder', 'description'
];

@Injectable({ providedIn: 'root' })
export class ObjectsService {
  private readonly http = inject(HttpClient);

  list(): Promise<ApiResponse<ObjectDefinition[]>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<ObjectDefinition[]>>('/api/objects')
        .pipe(catchError((err) => of(err.error as ApiResponse<ObjectDefinition[]>))),
    );
  }

  get(id: string): Promise<ApiResponse<ObjectDefinition>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<ObjectDefinition>>(`/api/objects/${id}`)
        .pipe(catchError((err) => of(err.error as ApiResponse<ObjectDefinition>))),
    );
  }

  create(input: CreateObjectInput): Promise<ApiResponse<ObjectDefinition>> {
    return firstValueFrom(
      this.http
        .post<ApiResponse<ObjectDefinition>>('/api/objects', input)
        .pipe(catchError((err) => of(err.error as ApiResponse<ObjectDefinition>))),
    );
  }

  update(id: string, input: UpdateObjectInput): Promise<ApiResponse<ObjectDefinition>> {
    return firstValueFrom(
      this.http
        .patch<ApiResponse<ObjectDefinition>>(`/api/objects/${id}`, input)
        .pipe(catchError((err) => of(err.error as ApiResponse<ObjectDefinition>))),
    );
  }
}
