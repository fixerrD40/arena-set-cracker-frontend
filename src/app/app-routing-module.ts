import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/pages/index/index').then(m => m.Index)
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./components/pages/about/about').then(m => m.About)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
