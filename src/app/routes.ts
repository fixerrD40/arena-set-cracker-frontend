import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pages/index/index').then(m => m.Index)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/auth/register/register').then(m => m.Register)
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./components/pages/about/about').then(m => m.About)
  },
  {
    path: 'add-set',
    loadComponent: () =>
      import('./components/operations/add-set/add-set').then(m => m.AddSet)
  },
  {
    path: 'add-deck',
    loadComponent: () =>
      import('./components/operations/add-deck/add-deck').then(m => m.AddDeck)
  },
];
