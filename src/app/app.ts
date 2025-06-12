import { Component, ViewChild } from '@angular/core';

import { ContentLayout } from './components/content-layout/content-layout';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  protected title = 'arena-set-cracker';

  @ViewChild(ContentLayout) contentLayout!: ContentLayout;

  toggleSidenav() {
    this.contentLayout.toggleSidenav();
  }
}
