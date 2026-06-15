import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ApiResponse } from '../../core/api-response';

export interface TemplateObjectSummary {
  apiName: string;
  name: string;
  pluralName: string;
  fieldCount: number;
}

export interface TemplateSummary {
  key: string;
  name: string;
  description: string;
  objects: TemplateObjectSummary[];
}

export interface CreatedTemplateObject {
  apiName: string;
  id: string;
  fieldsCreated: string[];
  fieldsSkipped: Array<{ apiKey: string; reason: 'LOOKUP_TARGET_ARCHIVED' }>;
}

export interface SkippedTemplateObject {
  apiName: string;
  reason: 'OBJECT_ALREADY_EXISTS';
}

export interface ApplyTemplateResultData {
  templateKey: string;
  created: CreatedTemplateObject[];
  skipped: SkippedTemplateObject[];
}

@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly http = inject(HttpClient);

  list(): Promise<ApiResponse<TemplateSummary[]>> {
    return firstValueFrom(
      this.http
        .get<ApiResponse<TemplateSummary[]>>('/api/templates')
        .pipe(catchError((err) => of(err.error as ApiResponse<TemplateSummary[]>))),
    );
  }

  apply(key: string): Promise<ApiResponse<ApplyTemplateResultData>> {
    return firstValueFrom(
      this.http
        .post<ApiResponse<ApplyTemplateResultData>>(`/api/templates/${key}/apply`, {})
        .pipe(catchError((err) => of(err.error as ApiResponse<ApplyTemplateResultData>))),
    );
  }
}
