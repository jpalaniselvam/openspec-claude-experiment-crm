import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMON_ICONS, ObjectDefinition, ObjectsService, UpdateObjectInput } from '../objects.service';
import { FieldDefinition } from '../fields.service';

export interface EditObjectDialogData {
  object: ObjectDefinition;
  fields?: FieldDefinition[];
}

const DISPLAY_FIELD_DATA_TYPES = new Set(['text', 'long_text']);

@Component({
  selector: 'app-edit-object-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './edit-object-dialog.html',
  styleUrl: './edit-object-dialog.scss',
})
export class EditObjectDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly objectsService = inject(ObjectsService);
  private readonly dialogRef = inject(MatDialogRef<EditObjectDialog>);
  private readonly dialogData = inject<any>(MAT_DIALOG_DATA);

  readonly object = (this.dialogData.object || this.dialogData) as ObjectDefinition;
  readonly displayFieldOptions = ((this.dialogData.fields || []) as FieldDefinition[]).filter(
    (field) => DISPLAY_FIELD_DATA_TYPES.has(field.dataType),
  );

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly iconPreview = signal('category');
  readonly commonIcons = COMMON_ICONS;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    pluralName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    description: [''],
    icon: ['category', Validators.required],
    color: ['#6750A4'],
    displayFieldApiKey: [''],
  });

  ngOnInit(): void {

    console.log('EditObjectDialog initialized with object:', this.dialogData);
    this.form.patchValue({
      name: this.object.name,
      pluralName: this.object.pluralName,
      description: this.object.description ?? '',
      icon: this.object.icon ?? '',
      color: this.object.color ?? '#6750A4',
      displayFieldApiKey: this.object.displayFieldApiKey ?? '',
    });
    this.iconPreview.set(this.object.icon ?? '');
    this.form.get('icon')!.valueChanges.subscribe((icon) => {
      this.iconPreview.set(icon ?? '');
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const input: UpdateObjectInput = {
      name: value.name!,
      pluralName: value.pluralName!,
      description: value.description ?? undefined,
      icon: value.icon ?? undefined,
      color: value.color ?? undefined,
      displayFieldApiKey: value.displayFieldApiKey || null,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const response = await this.objectsService.update(this.object.id, input);

    this.saving.set(false);

    if (response.success) {
      this.dialogRef.close(response.data);
    } else {
      this.errorMessage.set(response.error.message);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
