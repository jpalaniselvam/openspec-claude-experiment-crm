import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApplyTemplateDialog } from '../apply-template-dialog/apply-template-dialog';
import { TemplateSummary, TemplatesService } from '../templates.service';

@Component({
  selector: 'app-templates-page',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './templates-page.html',
  styleUrl: './templates-page.scss',
})
export class TemplatesPage implements OnInit {
  private readonly templatesService = inject(TemplatesService);
  private readonly dialog = inject(MatDialog);

  readonly templates = signal<TemplateSummary[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadTemplates();
  }

  async loadTemplates(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    const response = await this.templatesService.list();
    this.loading.set(false);
    if (response.success) {
      this.templates.set(response.data);
    } else {
      this.errorMessage.set(response.error.message);
    }
  }

  openApplyDialog(template: TemplateSummary): void {
    this.dialog.open(ApplyTemplateDialog, { width: '560px', data: template });
  }
}
