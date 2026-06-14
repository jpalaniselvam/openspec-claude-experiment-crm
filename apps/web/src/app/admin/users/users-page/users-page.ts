import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../../core/auth.service';
import { CreateUserDialog } from '../create-user-dialog/create-user-dialog';
import { OrgUser, UsersService } from '../users.service';

@Component({
  selector: 'app-users-page',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly users = signal<OrgUser[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly columns = ['username', 'displayName', 'email', 'role', 'status'];
  readonly roles: OrgUser['role'][] = ['admin', 'member'];
  readonly statuses: OrgUser['status'][] = ['active', 'disabled'];

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    const response = await this.usersService.list();

    this.loading.set(false);

    if (response.success) {
      this.users.set(response.data);
    } else {
      this.errorMessage.set(response.error.message);
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateUserDialog);

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.users.update((users) => [...users, created].sort((a, b) => a.username.localeCompare(b.username)));
      }
    });
  }

  async updateRole(user: OrgUser, role: OrgUser['role']): Promise<void> {
    await this.applyUpdate(user, { role });
  }

  async updateStatus(user: OrgUser, status: OrgUser['status']): Promise<void> {
    await this.applyUpdate(user, { status });
  }

  isSelf(user: OrgUser): boolean {
    return user.id === this.authService.user()?.id;
  }

  private async applyUpdate(user: OrgUser, changes: { role?: OrgUser['role']; status?: OrgUser['status'] }): Promise<void> {
    this.errorMessage.set(null);

    const response = await this.usersService.update(user.id, changes);

    if (response.success) {
      this.users.update((users) => users.map((u) => (u.id === user.id ? response.data : u)));
    } else {
      this.errorMessage.set(response.error.message);
    }
  }
}
