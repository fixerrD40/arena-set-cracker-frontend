import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { map, Observable, of, startWith } from 'rxjs';
import { ScryfallService } from '../../../core/services/api/scryfall/scryfall.service';
import { SetService } from '../../../core/services/set.service';
import { ScryfallSet } from '../../../core/services/api/scryfall/models/set.scryfall';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-set-add',
  standalone: true,
  templateUrl: './set-add.html',
  styleUrls: ['./set-add.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    AsyncPipe,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ]
})
export class SetAddComponent implements OnInit {
  private readonly scryfall = inject(ScryfallService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  form = new FormGroup({
    search: new FormControl<string | ScryfallSet | null>(null, Validators.required)
  });

  allSets: ScryfallSet[] = [];
  filteredSets$: Observable<ScryfallSet[]> = of([]);
  isLoading = false;

  ngOnInit(): void {
    this.isLoading = true;

    this.scryfall.getAvailableSets().subscribe({
      next: (responseSets: ScryfallSet[]) => {
        this.allSets = responseSets;
        this.isLoading = false;

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
        console.error('Failed to load online expansion directory from Scryfall API:', err);
        this.isLoading = false;
      }
    });
  }

  displaySet = (set: ScryfallSet | null): string => {
    return set ? `${set.name} (${set.code.toUpperCase()})` : '';
  };

  submit(): void {
    const selected = this.form.value.search;

    if (selected && typeof selected === 'object' && 'code' in selected) {
      this.setService.install(selected);
      this.router.navigate(['/']);
    }
  }
}
