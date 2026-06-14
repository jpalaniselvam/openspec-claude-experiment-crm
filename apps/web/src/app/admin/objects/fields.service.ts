import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../../core/api-response';

export type FieldDataType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'picklist'
  | 'lookup';

export const FIELD_DATA_TYPES: { value: FieldDataType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'picklist', label: 'Picklist' },
  { value: 'lookup', label: 'Lookup' },
];

export interface FieldDefinition {
  id: string;
  objectDefinitionId: string;
  apiKey: string;
  name: string;
  dataType: FieldDataType;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isReadOnly: boolean;
  defaultValue: unknown | null;
  options: string[] | null;
  lookupObjectDefinitionId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldInput {
  apiKey: string;
  name: string;
  dataType: FieldDataType;
  isRequired?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  isReadOnly?: boolean;
  defaultValue?: unknown;
  options?: string[];
  lookupObjectDefinitionId?: string;
}

export interface UpdateFieldInput {
  name?: string;
  isRequired?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  isReadOnly?: boolean;
  defaultValue?: unknown;
  options?: string[];
}

@Injectable({ providedIn: 'root' })
export class FieldsService {
  private readonly http = inject(HttpClient);

  list(objectId: string): Promise<ApiResponse<FieldDefinition[]>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<FieldDefinition[]>>(`/api/objects/${objectId}/fields`)
        .pipe(catchError((err) => of(err.error as ApiResponse<FieldDefinition[]>))),
    );
  }

  create(objectId: string, input: CreateFieldInput): Promise<ApiResponse<FieldDefinition>> {
    return firstValueFrom(
      this.http
        .post<ApiResponse<FieldDefinition>>(`/api/objects/${objectId}/fields`, input)
        .pipe(catchError((err) => of(err.error as ApiResponse<FieldDefinition>))),
    );
  }

  update(objectId: string, fieldId: string, input: UpdateFieldInput): Promise<ApiResponse<FieldDefinition>> {
    return firstValueFrom(
      this.http
        .patch<ApiResponse<FieldDefinition>>(`/api/objects/${objectId}/fields/${fieldId}`, input)
        .pipe(catchError((err) => of(err.error as ApiResponse<FieldDefinition>))),
    );
  }

  delete(objectId: string, fieldId: string): Promise<ApiResponse<object>> {
    return firstValueFrom(
      this.http
        .delete<ApiResponse<object>>(`/api/objects/${objectId}/fields/${fieldId}`)
        .pipe(catchError((err) => of(err.error as ApiResponse<object>))),
    );
  }
}
