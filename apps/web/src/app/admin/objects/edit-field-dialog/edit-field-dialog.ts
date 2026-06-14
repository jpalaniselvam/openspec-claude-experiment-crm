import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldDefinition, FieldsService, UpdateFieldInput } from '../fields.service';

export interface EditFieldDialogData {
  objectId: string;
  field: FieldDefinition;
}

@Component({
  selector: 'app-edit-field-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './edit-field-dialog.html',
  styleUrl: './edit-field-dialog.scss',
})
export class EditFieldDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly fieldsService = inject(FieldsService);
  private readonly dialogRef = inject(MatDialogRef<EditFieldDialog>);
  readonly data = inject<EditFieldDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    isRequired: [false],
    isUnique: [false],
    isSearchable: [false],
    isReadOnly: [false],
  });

  ngOnInit(): void {
    this.form.patchValue({
      name: this.data.field.name,
      isRequired: this.data.field.isRequired,
      isUnique: this.data.field.isUnique,
      isSearchable: this.data.field.isSearchable,
      isReadOnly: this.data.field.isReadOnly,
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const input: UpdateFieldInput = {
      name: value.name!,
      isRequired: value.isRequired ?? false,
      isUnique: value.isUnique ?? false,
      isSearchable: value.isSearchable ?? false,
      isReadOnly: value.isReadOnly ?? false,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const response = await this.fieldsService.update(this.data.objectId, this.data.field.id, input);

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
