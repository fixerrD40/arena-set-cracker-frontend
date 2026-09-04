import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SetService } from '../../core/services/set.service';
import { MtgSet } from '../../shared/models/set/set';
import { Observable, switchMap, of, map, forkJoin } from 'rxjs';
import { SetInstallComponent } from '../set/install/set-install.component';

/** Set row plus a platform-resolved cover art URI for the template. */
export interface UIMtgSet extends MtgSet {
  resolvedCoverArt: string;
}

@Component({
  selector: 'app-library-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SetInstallComponent
  ],
  templateUrl: './library.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './library.css'
})
export class LibraryComponent implements OnInit {
  protected readonly setService = inject(SetService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public uiInstalledSets$: Observable<UIMtgSet[]> | null = null;
  public isProcessing = false;
  public showInstall = false;

  ngOnInit(): void {
    this.setService.syncInstalledCache();

    if (this.route.snapshot.queryParamMap.get('install') === '1') {
      this.showInstall = true;
    }

    this.uiInstalledSets$ = this.setService.installedSets$.pipe(
      switchMap((setsArray: MtgSet[]) => {
        if (!setsArray || setsArray.length === 0) {
          return of([]);
        }

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
    this.showInstall = true;
  }

  public onInstallDismiss(): void {
    if (this.setService.hasActiveInstall()) {
      return;
    }
    this.showInstall = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { install: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  public onInstallCompleted(set: MtgSet): void {
    this.showInstall = false;
    this.setService.loadSetWorkspace(set.id);
    this.router.navigate(['/set', set.id]);
  }

  public onSelectSet(set: UIMtgSet): void {
    this.setService.loadSetWorkspace(set.id);
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
