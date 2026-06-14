import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ObjectDefinition, ObjectsService } from '../objects.service';
import { FieldDefinition, FieldsService } from '../fields.service';
import { CreateFieldDialog, CreateFieldDialogData } from '../create-field-dialog/create-field-dialog';
import { EditFieldDialog, EditFieldDialogData } from '../edit-field-dialog/edit-field-dialog';
import { EditObjectDialog } from '../edit-object-dialog/edit-object-dialog';

@Component({
  selector: 'app-object-detail-page',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './object-detail-page.html',
  styleUrl: './object-detail-page.scss',
})
export class ObjectDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly objectsService = inject(ObjectsService);
  private readonly fieldsService = inject(FieldsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly objectId = this.route.snapshot.paramMap.get('id')!;
  readonly object = signal<ObjectDefinition | null>(null);
  readonly allObjects = signal<ObjectDefinition[]>([]);
  readonly fields = signal<FieldDefinition[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly columns = ['name', 'apiKey', 'dataType', 'flags', 'actions'];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadObjectAndFields(), this.loadAllObjects()]);
  }

  async loadObjectAndFields(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    const [objRes, fieldsRes] = await Promise.all([
      this.objectsService.get(this.objectId),
      this.fieldsService.list(this.objectId),
    ]);

    this.loading.set(false);

    if (objRes.success && fieldsRes.success) {
      this.object.set(objRes.data);
      this.fields.set(fieldsRes.data);
    } else {
      this.errorMessage.set(!objRes.success ? objRes.error.message : (fieldsRes as any).error.message);
    }
  }

  async loadAllObjects(): Promise<void> {
    const res = await this.objectsService.list();
    if (res.success) {
      this.allObjects.set(res.data);
    }
  }

  openEditObjectDialog(): void {
    const obj = this.object();
    if (!obj) return;

    const ref = this.dialog.open(EditObjectDialog, { width: '540px', data: obj });
    ref.afterClosed().subscribe((updated: ObjectDefinition | null) => {
      if (updated) {
        this.object.set(updated);
        this.snackBar.open(`Object "${updated.name}" updated`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  openCreateFieldDialog(): void {
    const data: CreateFieldDialogData = {
      objectId: this.objectId,
      objects: this.allObjects(),
    };
    const ref = this.dialog.open(CreateFieldDialog, { width: '600px', data });
    ref.afterClosed().subscribe((created: FieldDefinition | null) => {
      if (created) {
        this.fields.update((list) => [...list, created]);
        this.snackBar.open(`Field "${created.name}" created`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  openEditFieldDialog(field: FieldDefinition): void {
    const data: EditFieldDialogData = {
      objectId: this.objectId,
      field,
    };
    const ref = this.dialog.open(EditFieldDialog, { width: '540px', data });
    ref.afterClosed().subscribe((updated: FieldDefinition | null) => {
      if (updated) {
        this.fields.update((list) => list.map((f) => (f.id === updated.id ? updated : f)));
        this.snackBar.open(`Field "${updated.name}" updated`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  openDeleteFieldDialog(field: FieldDefinition): void {
    const ref = this.dialog.open(DeleteFieldConfirmDialog, { data: field });
    ref.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.deleteField(field);
      }
    });
  }

  private async deleteField(field: FieldDefinition): Promise<void> {
    const response = await this.fieldsService.delete(this.objectId, field.id);
    if (response.success) {
      this.fields.update((list) => list.filter((f) => f.id !== field.id));
      this.snackBar.open(`Field "${field.name}" deleted`, 'Dismiss', { duration: 3000 });
    } else {
      if (response.error.code === 'FIELD_IN_USE') {
        this.snackBar.open('This field cannot be deleted because it is referenced by other configurations.', 'Dismiss', { duration: 5000 });
      } else {
        this.snackBar.open(`Error: ${response.error.message}`, 'Dismiss', { duration: 5000 });
      }
    }
  }
}

// Inline delete confirmation dialog
import { ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-field-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Delete Field "{{ field.name }}"?</h2>
    <mat-dialog-content>
      <p>This will permanently delete the field definition.</p>
      <p class="warning-note">
        <mat-icon>warning</mat-icon>
        <strong>Warning:</strong> Any record data stored in this field will become inaccessible. This action cannot be undone.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" id="btn-cancel-delete-field">Cancel</button>
      <button mat-flat-button [mat-dialog-close]="true" id="btn-confirm-delete-field" class="delete-btn">Delete Field</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning-note { display: flex; align-items: flex-start; gap: 8px; color: var(--mat-sys-error); font-size: 0.875rem; background: var(--mat-sys-error-container); padding: 12px; border-radius: 4px; margin-top: 16px; }
    .warning-note mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .delete-btn { background: var(--mat-sys-error) !important; color: var(--mat-sys-on-error) !important; }
  `],
})
export class DeleteFieldConfirmDialog {
  readonly field = inject<FieldDefinition>(MAT_DIALOG_DATA);
}
