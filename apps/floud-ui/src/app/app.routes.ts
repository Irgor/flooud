import type { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  {
    path: 'signup',
    loadComponent: () => import('./features/signup/signup').then((c) => c.Signup),
    canActivate: [guestGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((c) => c.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'upload',
    loadComponent: () => import('./features/upload/upload').then((c) => c.upload),
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () => import('./features/files/files').then((c) => c.Files),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then((c) => c.Profile),
    canActivate: [authGuard],
  },
];
