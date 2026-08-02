// app.component.ts
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { UserProfileService } from './core/services/user-profile.service';
import { SetService } from './core/services/set.service';
import { DeckService } from './core/services/deck.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterModule,
    MatToolbarModule, MatTabsModule, MatButtonModule, MatIconModule, MatMenuModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private readonly router = inject(Router);
  protected readonly setService = inject(SetService);
  protected readonly deckService = inject(DeckService);
  public readonly userProfileService = inject(UserProfileService);

  // Core stream mappings
  protected readonly profile$ = this.userProfileService.config$;
  protected readonly workspace$ = this.setService.activeContext$;
  protected readonly activeDeck$ = this.deckService.activeDeck$; // 🌟 Expose live deck stream

  /** Checks if the user is currently sitting inside the deck route view context */
  protected isCurrentRouteDeck(): boolean {
    return this.router.url.includes('/deck/');
  }

  public navigateToSetLayer(setId: string): void {
    this.router.navigate(['/set', setId]);
  }

  public navigateToLibraryLayer(): void {
    this.setService.unloadWorkspace();
    this.router.navigate(['/']);
  }

  public handleHomeClick(): void {
    if (this.setService.currentWorkspaceSnapshot) {
      this.navigateToLibraryLayer();
    } else {
      this.setService.syncInstalledCache();
      this.router.navigate(['/']);
    }
  }

  public logout(): void {
    this.userProfileService.clearConfig().subscribe(() => {
      this.setService.unloadWorkspace();
      this.router.navigate(['/']);
    });
  }
}
