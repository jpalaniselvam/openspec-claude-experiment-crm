import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () => import('./shell/app-shell/app-shell').then((m) => m.AppShell),
    canActivate: [authGuard],
    children: [
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'users',
            loadComponent: () => import('./admin/users/users-page/users-page').then((m) => m.UsersPage),
          },
          {
            path: 'objects',
            loadComponent: () => import('./admin/objects/objects-page/objects-page').then((m) => m.ObjectsPage),
          },
          {
            path: 'objects/:id',
            loadComponent: () => import('./admin/objects/object-detail-page/object-detail-page').then((m) => m.ObjectDetailPage),
          },
          { path: '', pathMatch: 'full', redirectTo: 'objects' },
        ],
      },
      {
        path: 'objects/:apiName',
        loadComponent: () =>
          import('./records/object-worksheet-page/object-worksheet-page').then((m) => m.ObjectWorksheetPage),
        children: [
          {
            path: 'new',
            loadComponent: () => import('./records/record-panel/record-panel').then((m) => m.RecordPanel),
          },
          {
            path: ':id',
            loadComponent: () => import('./records/record-panel/record-panel').then((m) => m.RecordPanel),
          },
        ],
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
