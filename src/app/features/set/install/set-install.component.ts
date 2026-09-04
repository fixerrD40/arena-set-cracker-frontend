import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  output
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, filter, map, Observable, of, startWith, Subscription, switchMap, take, timeout } from 'rxjs';
import { ScryfallService } from '../../../core/services/api/scryfall/scryfall.service';
import { SetInstallProgress, SetService } from '../../../core/services/set.service';
import { ScryfallSet } from '../../../core/services/api/scryfall/models/set.scryfall';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MtgSet } from '../../../shared/models/set/set';

@Component({
  selector: 'app-set-install',
  standalone: true,
  templateUrl: './set-install.html',
  styleUrls: ['./set-install.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class SetInstallComponent implements OnInit, OnDestroy {
  private readonly scryfall = inject(ScryfallService);
  private readonly setService = inject(SetService);

  readonly dismiss = output<void>();
  readonly completed = output<MtgSet>();

  form = new FormGroup({
    search: new FormControl<string | ScryfallSet | null>(null, Validators.required)
  });

  allSets: ScryfallSet[] = [];
  filteredSets$: Observable<ScryfallSet[]> = of([]);
  isLoadingCatalog = false;
  isInstalling = false;
  isCancelling = false;
  errorMessage: string | null = null;
  readonly installProgress$ = this.setService.installProgress$;

  private installSub?: Subscription;

  ngOnInit(): void {
    this.isLoadingCatalog = true;

    this.scryfall.getAvailableSets().subscribe({
      next: (responseSets: ScryfallSet[]) => {
        this.allSets = responseSets;
        this.isLoadingCatalog = false;

        this.filteredSets$ = this.form.controls.search.valueChanges.pipe(
          startWith(''),
          map(value => {
            const input = typeof value === 'string' ? value.toLowerCase() : '';
            return this.allSets.filter(set =>
              set.name.toLowerCase().includes(input) ||
              set.code.toLowerCase().includes(input)
            );
          })
        );
      },
      error: (err) => {
        console.error('Failed to load Scryfall set directory:', err);
        this.isLoadingCatalog = false;
        this.errorMessage = 'Could not load the set directory from Scryfall.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.isInstalling) {
      this.setService.cancelInstall().subscribe();
    }
    this.installSub?.unsubscribe();
  }

  displaySet = (set: ScryfallSet | null): string => {
    return set ? `${set.name} (${set.code.toUpperCase()})` : '';
  };

  progressPercent(progress: SetInstallProgress): number {
    if (progress.total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.done / progress.total) * 100));
  }

  statusLabel(progress: SetInstallProgress): string {
    switch (progress.phase) {
      case 'catalog':
        return `Fetching catalog for ${progress.setName}…`;
      case 'downloading':
        return `Installing ${progress.setName}…`;
      case 'saving':
        return `Saving ${progress.setName}…`;
      case 'done':
        return `Installed ${progress.setName}`;
      default:
        return `Installing ${progress.setName}…`;
    }
  }

  onDismiss(): void {
    if (this.isInstalling || this.isCancelling) {
      return;
    }
    this.dismiss.emit();
  }

  onCancelInstall(): void {
    if (!this.isInstalling || this.isCancelling) {
      return;
    }
    this.isCancelling = true;
    this.setService.cancelInstall().subscribe({
      next: () => {
        this.isInstalling = false;
        this.isCancelling = false;
        this.form.enable();
        this.errorMessage = null;
      },
      error: (err) => {
        console.error('[SetInstall] Cancel cleanup failed:', err);
        this.isInstalling = false;
        this.isCancelling = false;
        this.form.enable();
        this.errorMessage = 'Install cancelled, but cleanup may be incomplete.';
      }
    });
  }

  submit(): void {
    const selected = this.form.value.search;
    if (!selected || typeof selected !== 'object' || !('code' in selected) || this.isInstalling) {
      return;
    }

    this.errorMessage = null;
    this.isInstalling = true;
    this.form.disable();

    this.installSub?.unsubscribe();
    this.installSub = this.setService.install(selected).pipe(
      switchMap((installed) =>
        this.setService.activeContext$.pipe(
          filter((workspace) => workspace?.setInfo.id === installed.id),
          take(1),
          timeout({ first: 30_000 }),
          map(() => installed),
          catchError(() => of(installed))
        )
      )
    ).subscribe({
      next: (installed) => {
        this.isInstalling = false;
        this.completed.emit(installed);
      },
      error: (err) => {
        console.error('[SetInstall] Install failed:', err);
        this.isInstalling = false;
        this.form.enable();
        this.errorMessage = 'Install failed. Check the network connection and try again.';
      },
      complete: () => {
        // takeUntil abort completes without next when Cancel is pressed.
        if (this.isInstalling && !this.isCancelling) {
          this.isInstalling = false;
          this.form.enable();
        }
      }
    });
  }
}
