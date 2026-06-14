import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatNativeDateModule } from '@angular/material/core';
import { FieldDefinition } from '../../admin/objects/fields.service';
import { ObjectDefinition } from '../../admin/objects/objects.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dynamic-form',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatNativeDateModule,
  ],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) fields: FieldDefinition[] = [];
  @Input() value?: Record<string, unknown> | null;
  @Input() objects?: ObjectDefinition[];

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly formGroup = this.fb.group({});
  readonly lookupOptions = signal<Record<string, { id: string; label: string }[]>>({});
  readonly lookupLoading = signal<Record<string, boolean>>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.buildForm();
      this.loadLookupOptions();
    }

    if (changes['value'] && this.value) {
      this.formGroup.patchValue(this.value);
    }
  }

  getFormValue(): Record<string, unknown> {
    return this.formGroup.getRawValue();
  }

  private buildForm(): void {
    // Clear existing controls
    Object.keys(this.formGroup.controls).forEach((key) => {
      this.formGroup.removeControl(key);
    });

    // Add new controls
    for (const field of this.fields) {
      const validators = [];
      if (field.isRequired) {
        validators.push(Validators.required);
      }
      if (field.dataType === 'email') {
        validators.push(Validators.email);
      }

      const control = this.fb.control(
        { value: field.defaultValue ?? null, disabled: field.isReadOnly },
        validators
      );

      this.formGroup.addControl(field.apiKey, control);
    }

    // Patch value if already provided
    if (this.value) {
      this.formGroup.patchValue(this.value);
    }
  }

  private async loadLookupOptions(): Promise<void> {
    const lookupFields = this.fields.filter((f) => f.dataType === 'lookup' && f.lookupObjectDefinitionId);
    if (lookupFields.length === 0 || !this.objects || this.objects.length === 0) {
      return;
    }

    for (const field of lookupFields) {
      const targetObj = this.objects.find((o) => o.id === field.lookupObjectDefinitionId);
      if (!targetObj) continue;

      this.lookupLoading.update((loading) => ({ ...loading, [field.apiKey]: true }));

      try {
        const response = await firstValueFrom(
          this.http.get<{ success: boolean; data: any[] }>(`/api/records/${targetObj.apiName}`)
        );

        if (response?.success && response.data) {
          const options = response.data.map((record) => {
            // Try to find a reasonable display label: name, title, or just ID
            const label = record.name || record.title || record.id || 'Unknown';
            return { id: record.id, label };
          });
          this.lookupOptions.update((opts) => ({ ...opts, [field.apiKey]: options }));
        }
      } catch (err) {
        console.error(`Failed to load lookup options for field ${field.apiKey}`, err);
      } finally {
        this.lookupLoading.update((loading) => ({ ...loading, [field.apiKey]: false }));
      }
    }
  }
}
