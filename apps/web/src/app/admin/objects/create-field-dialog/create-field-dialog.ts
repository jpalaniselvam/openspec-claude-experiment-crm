import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { CreateFieldInput, FIELD_DATA_TYPES, FieldDataType, FieldsService } from '../fields.service';
import { ObjectDefinition } from '../objects.service';

function toApiKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

export interface CreateFieldDialogData {
  objectId: string;
  objects: ObjectDefinition[];
}

@Component({
  selector: 'app-create-field-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './create-field-dialog.html',
  styleUrl: './create-field-dialog.scss',
})
export class CreateFieldDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly fieldsService = inject(FieldsService);
  private readonly dialogRef = inject(MatDialogRef<CreateFieldDialog>);
  readonly data = inject<CreateFieldDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly derivedApiKey = signal('');
  readonly picklistOptions = signal<string[]>([]);

  readonly fieldTypes = FIELD_DATA_TYPES;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    dataType: ['' as FieldDataType, [Validators.required]],
    isRequired: [false],
    isUnique: [false],
    isSearchable: [false],
    isReadOnly: [false],
    lookupObjectDefinitionId: [''],
  });

  get selectedType(): FieldDataType {
    return this.form.get('dataType')!.value as FieldDataType;
  }

  get isPicklist(): boolean {
    return this.selectedType === 'picklist';
  }

  get isLookup(): boolean {
    return this.selectedType === 'lookup';
  }

  ngOnInit(): void {
    this.form.get('name')!.valueChanges.subscribe((name) => {
      this.derivedApiKey.set(toApiKey(name ?? ''));
    });
  }

  addOption(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.picklistOptions.update((opts) => [...opts, value]);
    }
    event.chipInput!.clear();
  }

  removeOption(option: string): void {
    this.picklistOptions.update((opts) => opts.filter((o) => o !== option));
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const input: CreateFieldInput = {
      apiKey: this.derivedApiKey(),
      name: value.name!,
      dataType: value.dataType as FieldDataType,
      isRequired: value.isRequired ?? false,
      isUnique: value.isUnique ?? false,
      isSearchable: value.isSearchable ?? false,
      isReadOnly: value.isReadOnly ?? false,
    };

    if (this.isPicklist) {
      input.options = this.picklistOptions();
    }

    if (this.isLookup && value.lookupObjectDefinitionId) {
      input.lookupObjectDefinitionId = value.lookupObjectDefinitionId;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const response = await this.fieldsService.create(this.data.objectId, input);

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
