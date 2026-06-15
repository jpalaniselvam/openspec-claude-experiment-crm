import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplyTemplateResultData, TemplateSummary, TemplatesService } from '../templates.service';

export type ApplyDialogStep = 'confirm' | 'applying' | 'result';

const FRIENDLY_REASONS: Record<string, string> = {
  OBJECT_ALREADY_EXISTS: 'Already exists in your org — skipped',
  LOOKUP_TARGET_ARCHIVED: 'Linked object is archived — field skipped',
};

export function friendlyReason(reason: string): string {
  return FRIENDLY_REASONS[reason] ?? reason;
}

@Component({
  selector: 'app-apply-template-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './apply-template-dialog.html',
  styleUrl: './apply-template-dialog.scss',
})
export class ApplyTemplateDialog {
  private readonly templatesService = inject(TemplatesService);
  private readonly dialogRef = inject(MatDialogRef<ApplyTemplateDialog>);
  private readonly router = inject(Router);

  readonly template = inject<TemplateSummary>(MAT_DIALOG_DATA);

  readonly step = signal<ApplyDialogStep>('confirm');
  readonly result = signal<ApplyTemplateResultData | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly friendlyReason = friendlyReason;

  async apply(): Promise<void> {
    this.step.set('applying');

    const response = await this.templatesService.apply(this.template.key);

    if (response.success) {
      this.result.set(response.data);
    } else {
      this.errorMessage.set(response.error.message);
    }

    this.step.set('result');
  }

  cancel(): void {
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }

  viewObjects(): void {
    this.dialogRef.close();
    this.router.navigate(['/admin/objects']);
  }
}
