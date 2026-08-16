import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SetService } from '../../core/services/set.service';
import { MtgSet } from '../../shared/models/set/set';
import { Observable, switchMap, of, map, forkJoin } from 'rxjs';

// Define a crisp UI model extension that holds our safely resolved image link
export interface UIMtgSet extends MtgSet {
  resolvedCoverArt: string;
}

@Component({
  selector: 'app-library-component', // 🌟 Matches your component selector naming pattern
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // 🌟 Ensure this is explicitly available for your about/welcome links
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './library.html',
  styleUrl: './library.css'
})
export class LibraryComponent implements OnInit {
  protected readonly setService = inject(SetService);
  private readonly router = inject(Router);

  // 🌟 STRATEGY SHIFT: Self-contained presentation matrix stream driven by reactive changes
  public uiInstalledSets$: Observable<UIMtgSet[]> | null = null;
  public isProcessing = false;

  ngOnInit(): void {
    this.setService.syncInstalledCache();

    // 🚀 ATOMIC PATH COMBINATOR: Intercepts core state changes and resolves platform asset URIs dynamically
    this.uiInstalledSets$ = this.setService.installedSets$.pipe(
      switchMap((setsArray: MtgSet[]) => {
        if (!setsArray || setsArray.length === 0) {
          return of([]);
        }

        // Map every installed set code to its respective platform-authorized file layout channel
        const asyncMappings = setsArray.map((set) =>
          this.setService.getSetCoverWebViewUri(set.code).pipe(
            map((resolvedPath) => ({
              ...set,
              resolvedCoverArt: resolvedPath
            } as UIMtgSet))
          )
        );

        return forkJoin(asyncMappings);
      })
    );
  }

  public onInstallClick(): void {
    const setCode = prompt('Enter a Magic Set Code to install (e.g., ltr, dsk, blb):');
    if (!setCode || this.isProcessing) return;

    this.isProcessing = true;

    // 🌟 FIX: Updated method signature string lookup to match your exact 'getSetByCode' implementation!
    this.setService['scryfallService'].getSetByCode(setCode.trim().toLowerCase()).subscribe({
      next: (scryfallSet) => {
        this.setService.install(scryfallSet);
        this.isProcessing = false;
      },
      error: () => {
        alert(`Could not locate Scryfall set metadata for code: ${setCode}`);
        this.isProcessing = false;
      }
    });
  }

  public onSelectSet(set: UIMtgSet): void {
    this.setService.loadSetWorkspace(set.id, set.code.toLowerCase());
    this.router.navigate(['/set', set.id]);
  }

  public onDeleteSet(event: Event, set: UIMtgSet): void {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to completely uninstall ${set.name}?`) || this.isProcessing) return;

    this.isProcessing = true;
    this.setService.uninstall(set).subscribe({
      next: () => {
        this.isProcessing = false;
      },
      error: (err) => {
        console.error('[Library] Uninstall failure:', err);
        alert('An error occurred during local uninstallation.');
        this.isProcessing = false;
      }
    });
  }
}
