import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateObjectDialog } from '../create-object-dialog/create-object-dialog';
import { EditObjectDialog, EditObjectDialogData } from '../edit-object-dialog/edit-object-dialog';
import { FieldsService } from '../fields.service';
import { ObjectDefinition, ObjectsService } from '../objects.service';

@Component({
  selector: 'app-objects-page',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './objects-page.html',
  styleUrl: './objects-page.scss',
})
export class ObjectsPage implements OnInit {
  private readonly objectsService = inject(ObjectsService);
  private readonly fieldsService = inject(FieldsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly allObjects = signal<ObjectDefinition[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showArchived = signal(false);

  readonly columns = ['icon', 'name', 'apiName', 'status', 'actions'];

  get visibleObjects(): ObjectDefinition[] {
    const all = this.allObjects();
    return this.showArchived() ? all : all.filter((o) => !o.isArchived);
  }

  async ngOnInit(): Promise<void> {
    await this.loadObjects();
  }

  async loadObjects(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    const response = await this.objectsService.list();
    this.loading.set(false);
    if (response.success) {
      this.allObjects.set(response.data);
    } else {
      this.errorMessage.set(response.error.message);
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(CreateObjectDialog, { width: '540px' });
    ref.afterClosed().subscribe((created: ObjectDefinition | null) => {
      if (created) {
        this.allObjects.update((list) => [...list, created]);
        this.snackBar.open(`Object "${created.name}" created`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  async openEditDialog(obj: ObjectDefinition): Promise<void> {
    const fieldsRes = await this.fieldsService.list(obj.id);
    const data: EditObjectDialogData = {
      object: obj,
      fields: fieldsRes.success ? fieldsRes.data : [],
    };
    const ref = this.dialog.open(EditObjectDialog, { width: '540px', data });
    ref.afterClosed().subscribe((updated: ObjectDefinition | null) => {
      if (updated) {
        this.allObjects.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      }
    });
  }

  navigateToDetail(obj: ObjectDefinition): void {
    this.router.navigate(['/admin/objects', obj.id]);
  }

  openArchiveDialog(obj: ObjectDefinition): void {
    const ref = this.dialog.open(ArchiveConfirmDialog, { data: obj });
    ref.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.archiveObject(obj);
      }
    });
  }

  private async archiveObject(obj: ObjectDefinition): Promise<void> {
    const response = await this.objectsService.update(obj.id, { isArchived: true });
    if (response.success) {
      this.allObjects.update((list) => list.map((o) => (o.id === obj.id ? response.data : o)));
      this.snackBar.open(`"${obj.name}" archived`, 'Dismiss', { duration: 4000 });
    } else {
      this.snackBar.open(`Error: ${response.error.message}`, 'Dismiss', { duration: 5000 });
    }
  }
}

// Inline archive confirmation dialog
import { ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-archive-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Archive "{{ object.name }}"?</h2>
    <mat-dialog-content>
      <p>Archiving hides this object from use but <strong>preserves all existing record data</strong>. The object will no longer appear in the app or be available for creating new records.</p>
      <p class="warning-note">
        <mat-icon>info</mat-icon>
        This action can be reversed by an administrator.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" id="btn-cancel-archive">Cancel</button>
      <button mat-flat-button [mat-dialog-close]="true" id="btn-confirm-archive" class="archive-btn">Archive</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .warning-note { display: flex; align-items: center; gap: 8px; color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .archive-btn { background: var(--mat-sys-error) !important; color: var(--mat-sys-on-error) !important; }
  `],
})
export class ArchiveConfirmDialog {
  readonly object = inject<ObjectDefinition>(MAT_DIALOG_DATA);
}
