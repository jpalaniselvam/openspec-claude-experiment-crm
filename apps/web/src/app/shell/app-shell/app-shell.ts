import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { ObjectDefinition, ObjectsService } from '../../admin/objects/objects.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatTooltipModule,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly objectsService = inject(ObjectsService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly isAdmin = this.authService.isAdmin;
  readonly collapsed = signal(false);
  readonly objects = signal<ObjectDefinition[]>([]);

  async ngOnInit(): Promise<void> {
    const response = await this.objectsService.list();
    if (response.success) {
      this.objects.set(response.data);
    }
  }

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
