import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { COMMON_ICONS, CreateObjectInput, ObjectsService } from '../objects.service';

function toApiName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

@Component({
  selector: 'app-create-object-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './create-object-dialog.html',
  styleUrl: './create-object-dialog.scss',
})
export class CreateObjectDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly objectsService = inject(ObjectsService);
  private readonly dialogRef = inject(MatDialogRef<CreateObjectDialog>);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly derivedApiName = signal('');
  readonly iconPreview = signal('category');
  readonly commonIcons = COMMON_ICONS;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    pluralName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    description: [''],
    icon: ['category', Validators.required],
    color: ['#6750A4'],
  });

  ngOnInit(): void {
    this.form.get('name')!.valueChanges.subscribe((name) => {
      this.derivedApiName.set(toApiName(name ?? ''));
    });
    this.form.get('icon')!.valueChanges.subscribe((icon) => {
      this.iconPreview.set(icon ?? '');
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const input: CreateObjectInput = {
      apiName: this.derivedApiName(),
      name: value.name!,
      pluralName: value.pluralName!,
      description: value.description ?? undefined,
      icon: value.icon ?? undefined,
      color: value.color ?? undefined,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const response = await this.objectsService.create(input);

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
