import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DynamicFormComponent } from '../../shared/dynamic-form/dynamic-form';
import { ObjectDefinition, ObjectsService } from '../../admin/objects/objects.service';
import { FieldDefinition, FieldsService } from '../../admin/objects/fields.service';
import { RecordDto, RecordsService, RelatedRecordGroup } from '../records.service';
import { resolveEffectiveDisplayField } from '../../shared/display-field';

type PanelMode = 'create' | 'edit';

@Component({
  selector: 'app-record-panel',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, DynamicFormComponent],
  templateUrl: './record-panel.html',
  styleUrl: './record-panel.scss',
})
export class RecordPanel implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly objectsService = inject(ObjectsService);
  private readonly fieldsService = inject(FieldsService);
  private readonly recordsService = inject(RecordsService);
  private paramsSub?: Subscription;

  @ViewChild(DynamicFormComponent) form?: DynamicFormComponent;

  readonly apiName = signal('');
  readonly recordId = signal('');
  readonly mode = signal<PanelMode>('create');
  readonly object = signal<ObjectDefinition | null>(null);
  readonly allObjects = signal<ObjectDefinition[]>([]);
  readonly fields = signal<FieldDefinition[]>([]);
  readonly record = signal<RecordDto | null>(null);
  readonly related = signal<RelatedRecordGroup[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const parent = this.route.parent!;
    this.paramsSub = combineLatest([parent.paramMap, this.route.paramMap, this.route.url]).subscribe(
      ([parentParams, params, urlSegments]) => {
        const apiName = parentParams.get('apiName') ?? '';
        const recordId = params.get('id') ?? urlSegments[0]?.path ?? '';
        if (!apiName || !recordId) return;

        this.apiName.set(apiName);
        this.recordId.set(recordId);
        void this.loadAll();
      },
    );
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe();
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.notFound.set(false);
    this.related.set([]);
    this.record.set(null);

    const objectsRes = await this.objectsService.list();
    if (!objectsRes.success) {
      this.errorMessage.set(objectsRes.error.message);
      this.loading.set(false);
      return;
    }

    this.allObjects.set(objectsRes.data);
    const object = objectsRes.data.find((o) => o.apiName === this.apiName());
    if (!object) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.object.set(object);

    const fieldsRes = await this.fieldsService.list(object.id);
    if (!fieldsRes.success) {
      this.errorMessage.set(fieldsRes.error.message);
      this.loading.set(false);
      return;
    }
    this.fields.set(fieldsRes.data);

    if (this.recordId() === 'new') {
      this.mode.set('create');
      this.loading.set(false);
      return;
    }

    this.mode.set('edit');
    const recordRes = await this.recordsService.get(object.apiName, this.recordId());
    if (!recordRes.success) {
      if (recordRes.error.code === 'RECORD_NOT_FOUND') {
        this.notFound.set(true);
      } else {
        this.errorMessage.set(recordRes.error.message);
      }
      this.loading.set(false);
      return;
    }

    this.record.set(recordRes.data);
    this.loading.set(false);

    const relatedRes = await this.recordsService.getRelated(object.apiName, this.recordId());
    if (relatedRes.success) {
      this.related.set(relatedRes.data.related);
    }
  }

  title(): string {
    const object = this.object();
    if (!object) return '';

    if (this.mode() === 'create') {
      return `New ${object.name}`;
    }

    const record = this.record();
    if (!record) return object.name;

    const apiKey = resolveEffectiveDisplayField(object, this.fields());
    const value = apiKey ? record.data[apiKey] : undefined;
    return typeof value === 'string' && value ? value : record.id;
  }

  async save(): Promise<void> {
    const object = this.object();
    if (!object || !this.form) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const value = this.form.getFormValue();
    const res =
      this.mode() === 'create'
        ? await this.recordsService.create(object.apiName, value)
        : await this.recordsService.update(object.apiName, this.recordId(), value);

    this.saving.set(false);

    if (res.success) {
      void this.router.navigate(['/objects', object.apiName]);
    } else {
      this.errorMessage.set(res.error.message);
    }
  }

  cancel(): void {
    const object = this.object();
    void this.router.navigate(['/objects', object ? object.apiName : this.apiName()]);
  }
}
