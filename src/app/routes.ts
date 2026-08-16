import { Routes } from '@angular/router';
import { deckGuard } from './core/guards/deck.guard';
import { welcomeGuard } from './core/guards/welcome.guard';

export const routes: Routes = [
  // ==========================================
  // 1. GLOBAL ROOT LANDING (The First-Boot Welcome Card)
  // ==========================================
  {
    path: '',
    pathMatch: 'full',
    canActivate: [welcomeGuard], // 🌟 Redirects configured users to /library immediately
    loadComponent: () => import('./features/index/index.component').then(m => m.IndexComponent)
  },

  // ==========================================
  // 2. CONFIGURED CORE DASHBOARD HOME
  // ==========================================
  {
    path: 'library',
    canActivate: [welcomeGuard], // 🌟 Protects against manual URL entry if unconfigured
    loadComponent: () => import('./features/library/library.component').then(m => m.LibraryComponent)
  },

  // ==========================================
  // 3. PUBLIC ENTRY FLOWS (Unguarded targets for the Index button)
  // ==========================================
  {
    path: 'about',
    loadComponent: () => import('./features/index/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'welcome', // Desktop offline initialization endpoint
    loadComponent: () => import('./features/index/welcome/welcome.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'login', // Cloud web/mobile login endpoint
    loadComponent: () => import('./features/index/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/index/register/register.component').then(m => m.RegisterComponent)
  },

  // ==========================================
  // 4. SECURED DATA SUBSYSTEMS
  // ==========================================
  {
    path: 'add-set',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/set/add/add.set.component').then(m => m.AddSetComponent)
  },
  {
    path: 'set/:id',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/set/set.component').then(m => m.SetComponent)
  },
  {
    path: 'add-deck',
    canActivate: [welcomeGuard],
    loadComponent: () => import('./features/deck/add/add.deck.component').then(m => m.AddDeckComponent)
  },
  {
    path: 'deck/:id',
    canActivate: [welcomeGuard],
    canDeactivate: [deckGuard],
    loadComponent: () => import('./features/deck/deck.component').then(m => m.DeckComponent)
  },

  // ==========================================
  // 5. CATCH-ALL WILDCARD REDIRECT
  // ==========================================
  { path: '**', redirectTo: '' }
];
