import { Routes } from '@angular/router';
import { deckGuard } from './core/guards/deck.guard';
import { welcomeGuard } from './core/guards/welcome.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/index/index.component').then(m => m.IndexComponent)
  },
  {
    path: 'library',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/library/library.component').then(m => m.LibraryComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./features/index/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'welcome', // Desktop offline first-run
    loadComponent: () => import('./features/index/welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/index/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/index/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'request-password-reset',
    loadComponent: () =>
      import('./features/index/request-password-reset/request-password-reset.component').then(
        (m) => m.RequestPasswordResetComponent
      )
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/index/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      )
  },
  {
    path: 'add-set',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/set/add/set-add.component').then(m => m.SetAddComponent)
  },
  {
    path: 'set/:id',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/set/set.component').then(m => m.SetComponent)
  },
  {
    path: 'add-deck',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/deck/add/deck-add.component').then(m => m.DeckAddComponent)
  },
  {
    path: 'deck/:id',
    canActivate: [welcomeGuard],
    canDeactivate: [deckGuard],
    loadComponent: () => import('./features/deck/deck.component').then(m => m.DeckComponent)
  },
  { path: '**', redirectTo: '' }
];
