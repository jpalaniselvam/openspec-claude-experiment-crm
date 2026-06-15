import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ObjectDefinition, ObjectsService } from '../../admin/objects/objects.service';
import { FieldDefinition, FieldsService } from '../../admin/objects/fields.service';
import { RecordDto, RecordsService } from '../records.service';
import { resolveEffectiveDisplayField } from '../../shared/display-field';

const MULTI_SELECT_FILTER_TYPES = new Set(['picklist', 'boolean', 'lookup']);

interface SortState {
  field: string | null;
  direction: 'asc' | 'desc' | null;
}

interface WorksheetRow {
  record: RecordDto;
  cells: Record<string, string>;
}

@Component({
  selector: 'app-object-worksheet-page',
  imports: [
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './object-worksheet-page.html',
  styleUrl: './object-worksheet-page.scss',
})
export class ObjectWorksheetPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly objectsService = inject(ObjectsService);
  private readonly fieldsService = inject(FieldsService);
  private readonly recordsService = inject(RecordsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private routerSub?: Subscription;

  readonly apiName = signal('');
  readonly object = signal<ObjectDefinition | null>(null);
  readonly allObjects = signal<ObjectDefinition[]>([]);
  readonly fields = signal<FieldDefinition[]>([]);
  readonly records = signal<RecordDto[]>([]);
  readonly lookupMaps = signal<Record<string, Record<string, string>>>({});
  readonly loading = signal(true);
  readonly objectNotFound = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly panelOpen = signal(false);

  readonly search = signal('');
  readonly multiFilters = signal<Record<string, string[]>>({});
  readonly textFilters = signal<Record<string, string>>({});
  readonly sort = signal<SortState>({ field: null, direction: null });

  readonly sortedFields = computed(() => [...this.fields()].sort((a, b) => a.sortOrder - b.sortOrder));
  readonly displayedColumns = computed(() => [...this.sortedFields().map((f) => f.apiKey), 'actions']);

  readonly rows = computed<WorksheetRow[]>(() => {
    const fields = this.sortedFields();
    const maps = this.lookupMaps();
    return this.records().map((record) => {
      const cells: Record<string, string> = {};
      for (const field of fields) {
        cells[field.apiKey] = this.cellValue(record, field, maps);
      }
      return { record, cells };
    });
  });

  readonly filteredRows = computed<WorksheetRow[]>(() => {
    const fields = this.sortedFields();
    const search = this.search().trim().toLowerCase();
    const multiFilters = this.multiFilters();
    const textFilters = this.textFilters();

    let result = this.rows().filter((row) => {
      if (search && !fields.some((f) => row.cells[f.apiKey].toLowerCase().includes(search))) {
        return false;
      }

      for (const field of fields) {
        const selected = multiFilters[field.apiKey];
        if (selected && selected.length > 0 && !selected.includes(row.cells[field.apiKey])) {
          return false;
        }

        const text = textFilters[field.apiKey];
        if (text && !row.cells[field.apiKey].toLowerCase().includes(text.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    const sort = this.sort();
    if (sort.field && sort.direction) {
      const field = sort.field;
      const direction = sort.direction;
      result = [...result].sort((a, b) => {
        const cmp = a.cells[field].localeCompare(b.cells[field], undefined, { numeric: true });
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.apiName.set(params.get('apiName') ?? '');
      this.search.set('');
      this.multiFilters.set({});
      this.textFilters.set({});
      this.sort.set({ field: null, direction: null });
      void this.loadAll();
    });

    this.panelOpen.set(this.route.children.length > 0);
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const hasChild = this.route.children.length > 0;
        const wasOpen = this.panelOpen();
        this.panelOpen.set(hasChild);
        if (wasOpen && !hasChild) {
          void this.loadRecords();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.objectNotFound.set(false);

    const objectsRes = await this.objectsService.list();
    if (!objectsRes.success) {
      this.errorMessage.set(objectsRes.error.message);
      this.loading.set(false);
      return;
    }

    this.allObjects.set(objectsRes.data);
    const object = objectsRes.data.find((o) => o.apiName === this.apiName() && !o.isArchived);
    if (!object) {
      this.objectNotFound.set(true);
      this.loading.set(false);
      return;
    }
    this.object.set(object);

    const [fieldsRes, recordsRes] = await Promise.all([
      this.fieldsService.list(object.id),
      this.recordsService.list(object.apiName),
    ]);

    if (!fieldsRes.success) {
      this.errorMessage.set(fieldsRes.error.message);
      this.loading.set(false);
      return;
    }
    if (!recordsRes.success) {
      this.errorMessage.set(recordsRes.error.message);
      this.loading.set(false);
      return;
    }

    this.fields.set(fieldsRes.data);
    this.records.set(recordsRes.data.items);
    this.lookupMaps.set(await this.loadLookupMaps(fieldsRes.data, objectsRes.data));
    this.loading.set(false);
  }

  async loadRecords(): Promise<void> {
    const object = this.object();
    if (!object) return;

    const res = await this.recordsService.list(object.apiName);
    if (res.success) {
      this.records.set(res.data.items);
    }
  }

  private async loadLookupMaps(
    fields: FieldDefinition[],
    allObjects: ObjectDefinition[],
  ): Promise<Record<string, Record<string, string>>> {
    const lookupFields = fields.filter((f) => f.dataType === 'lookup' && f.lookupObjectDefinitionId);
    const maps: Record<string, Record<string, string>> = {};

    for (const field of lookupFields) {
      const targetObject = allObjects.find((o) => o.id === field.lookupObjectDefinitionId);
      if (!targetObject) continue;

      const [recordsRes, fieldsRes] = await Promise.all([
        this.recordsService.list(targetObject.apiName),
        this.fieldsService.list(targetObject.id),
      ]);

      if (!recordsRes.success || !fieldsRes.success) continue;

      const displayApiKey = resolveEffectiveDisplayField(targetObject, fieldsRes.data);
      const map: Record<string, string> = {};
      for (const record of recordsRes.data.items) {
        const value = displayApiKey ? record.data[displayApiKey] : undefined;
        map[record.id] = typeof value === 'string' && value ? value : record.id;
      }
      maps[field.apiKey] = map;
    }

    return maps;
  }

  private cellValue(record: RecordDto, field: FieldDefinition, maps: Record<string, Record<string, string>>): string {
    const raw = record.data[field.apiKey];

    if (field.dataType === 'lookup') {
      if (typeof raw !== 'string' || !raw) return '';
      return maps[field.apiKey]?.[raw] ?? raw;
    }

    if (field.dataType === 'boolean') {
      if (raw === true) return 'Yes';
      if (raw === false) return 'No';
      return '';
    }

    if (raw === null || raw === undefined) return '';
    return String(raw);
  }

  isMultiSelectFilter(field: FieldDefinition): boolean {
    return MULTI_SELECT_FILTER_TYPES.has(field.dataType);
  }

  filterOptions(field: FieldDefinition): string[] {
    const values = new Set<string>();
    for (const row of this.rows()) {
      const value = row.cells[field.apiKey];
      if (value) values.add(value);
    }
    return [...values].sort();
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onMultiFilterChange(apiKey: string, values: string[]): void {
    this.multiFilters.update((filters) => ({ ...filters, [apiKey]: values }));
  }

  onTextFilterChange(apiKey: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.textFilters.update((filters) => ({ ...filters, [apiKey]: value }));
  }

  toggleSort(apiKey: string): void {
    this.sort.update((current) => {
      if (current.field !== apiKey) return { field: apiKey, direction: 'asc' };
      if (current.direction === 'asc') return { field: apiKey, direction: 'desc' };
      return { field: null, direction: null };
    });
  }

  sortIcon(apiKey: string): string {
    const current = this.sort();
    if (current.field !== apiKey) return 'unfold_more';
    return current.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  onDrawerOpenedChange(opened: boolean): void {
    if (!opened && this.panelOpen()) {
      void this.router.navigate(['/objects', this.apiName()]);
    }
  }

  displayValueFor(record: RecordDto): string {
    const object = this.object();
    if (!object) return record.id;

    const apiKey = resolveEffectiveDisplayField(object, this.fields());
    const value = apiKey ? record.data[apiKey] : undefined;
    return typeof value === 'string' && value ? value : record.id;
  }

  openDeleteDialog(record: RecordDto, event: Event): void {
    event.stopPropagation();

    const ref = this.dialog.open(DeleteRecordConfirmDialog, { data: { displayValue: this.displayValueFor(record) } });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        void this.deleteRecord(record);
      }
    });
  }

  private async deleteRecord(record: RecordDto): Promise<void> {
    const object = this.object();
    if (!object) return;

    const res = await this.recordsService.delete(object.apiName, record.id);
    if (res.success) {
      this.records.update((list) => list.filter((r) => r.id !== record.id));
      this.snackBar.open('Record deleted', 'Dismiss', { duration: 3000 });
    } else {
      this.snackBar.open(`Error: ${res.error.message}`, 'Dismiss', { duration: 5000 });
    }
  }
}

@Component({
  selector: 'app-delete-record-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Delete "{{ data.displayValue }}"?</h2>
    <mat-dialog-content>
      <p>This will permanently delete this record. This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" id="btn-cancel-delete-record">Cancel</button>
      <button mat-flat-button [mat-dialog-close]="true" id="btn-confirm-delete-record" class="delete-btn">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .delete-btn { background: var(--mat-sys-error) !important; color: var(--mat-sys-on-error) !important; }
  `],
})
export class DeleteRecordConfirmDialog {
  readonly data = inject<{ displayValue: string }>(MAT_DIALOG_DATA);
}
