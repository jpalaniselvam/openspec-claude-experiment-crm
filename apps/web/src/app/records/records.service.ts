import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../core/api-response';

export interface RecordDto {
  id: string;
  objectDefinitionId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedRecordSummary {
  id: string;
  displayValue: string;
}

export interface RelatedRecordGroup {
  objectApiName: string;
  objectName: string;
  pluralName: string;
  fieldApiKey: string;
  fieldName: string;
  records: RelatedRecordSummary[];
}

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly http = inject(HttpClient);

  list(apiName: string): Promise<ApiResponse<{ items: RecordDto[] }>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<{ items: RecordDto[] }>>(`/api/records/${apiName}`)
        .pipe(catchError((err) => of(err.error as ApiResponse<{ items: RecordDto[] }>))),
    );
  }

  get(apiName: string, id: string): Promise<ApiResponse<RecordDto>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<RecordDto>>(`/api/records/${apiName}/${id}`)
        .pipe(catchError((err) => of(err.error as ApiResponse<RecordDto>))),
    );
  }

  create(apiName: string, data: Record<string, unknown>): Promise<ApiResponse<RecordDto>> {
    return firstValueFrom(
      this.http
        .post<ApiResponse<RecordDto>>(`/api/records/${apiName}`, data)
        .pipe(catchError((err) => of(err.error as ApiResponse<RecordDto>))),
    );
  }

  update(apiName: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<RecordDto>> {
    return firstValueFrom(
      this.http
        .put<ApiResponse<RecordDto>>(`/api/records/${apiName}/${id}`, data)
        .pipe(catchError((err) => of(err.error as ApiResponse<RecordDto>))),
    );
  }

  delete(apiName: string, id: string): Promise<ApiResponse<object>> {
    return firstValueFrom(
      this.http
        .delete<ApiResponse<object>>(`/api/records/${apiName}/${id}`)
        .pipe(catchError((err) => of(err.error as ApiResponse<object>))),
    );
  }

  getRelated(apiName: string, id: string): Promise<ApiResponse<{ related: RelatedRecordGroup[] }>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<{ related: RelatedRecordGroup[] }>>(`/api/records/${apiName}/${id}/related`)
        .pipe(catchError((err) => of(err.error as ApiResponse<{ related: RelatedRecordGroup[] }>))),
    );
  }
}
