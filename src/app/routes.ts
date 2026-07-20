import { Routes } from '@angular/router';
import { welcomeGuard } from './core/guards/welcome.guard';

export const routes: Routes = [
  // ==========================================
  // 1. PUBLIC UNGUARDED ROUTES
  // ==========================================
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/index/welcome/welcome').then(m => m.WelcomeComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(m => m.Register)
  },
  {
    path: 'request-password-reset',
    loadComponent: () =>
      import('./features/auth/request-password-reset/request-password-reset').then(m => m.RequestPasswordReset)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(m => m.ResetPassword)
  },

  // ==========================================
  // 2. CORE LOCAL RUNTIME (Protected by Onboarding)
  // ==========================================
  {
    path: '',
    canActivate: [welcomeGuard], // Halts view loading until app_config.json is verified
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/index/index').then(m => m.Index)
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/index/about/about').then(m => m.About)
      },
      {
        path: 'add-set',
        loadComponent: () =>
          import('./features/set/add-set/add-set').then(m => m.AddSet)
      },
      {
        path: 'set/:id',
        loadComponent: () =>
          import('./features/set/set-detail/set-detail').then(m => m.SetDetail)
      },
      {
        path: 'add-deck',
        loadComponent: () =>
          import('./features/deck/add-deck/add-deck').then(m => m.AddDeck)
      },
      {
        path: 'deck/:id',
        loadComponent: () =>
          import('./features/deck/deck-content/deck-content').then(m => m.DeckContent)
      }
    ]
  },

  // ==========================================
  // 3. CATCH-ALL WILDCARD REDIRECT
  // ==========================================
  { path: '**', redirectTo: '' }
];
