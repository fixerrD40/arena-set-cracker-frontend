import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; // FIXED: Clear MatCardModule import reference
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { map, Observable, of, startWith } from 'rxjs';
import { ScryfallService } from '../../../core/services/api/scryfall/scryfall.service';
import { SetService } from '../../../core/services/set.service';
import { ScryfallSet } from '../../../core/services/api/scryfall/models/set.scryfall';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-add-set-component',
  standalone: true,
  templateUrl: './add.set.component.html',
  styleUrls: ['./add.set.component.css'],
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
export class AddSetComponent implements OnInit {
  // 1. Utilize modern functional injection helpers programmatically
  private readonly scryfall = inject(ScryfallService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  // Strongly type your reactive form controls instead of leaving them loose
  form = new FormGroup({
    search: new FormControl<string | ScryfallSet | null>(null, Validators.required)
  });

  allSets: ScryfallSet[] = [];
  filteredSets$: Observable<ScryfallSet[]> = of([]);
  isLoading = false;

  ngOnInit(): void {
    this.isLoading = true;

    // 2. Fetch the collection utilizing our refined Scryfall filter mapping contract
    this.scryfall.getAvailableSets().subscribe({
      next: (responseSets: ScryfallSet[]) => {
        this.allSets = responseSets;
        this.isLoading = false;

        // Establish the autocomplete streaming filter loop
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

  /**
   * Presentation mapping formatter for the material autocomplete dropdown layer
   */
  displaySet = (set: ScryfallSet | null): string => {
    return set ? `${set.name} (${set.code.toUpperCase()})` : '';
  };

  /**
   * Safely captures choice metadata and passes a rich object signature
   * straight down to your atomic database installer pipeline.
   */
  submit(): void {
    const selected = this.form.value.search;

    // Verify the selection is a genuine, rich ScryfallSet entity object configuration
    if (selected && typeof selected === 'object' && 'code' in selected) {
      // Pass the entire rich entity. The SetService extracts the code, creates columns,
      // downloads assets to FileSystemService, and batches card inserts in one pass.
      this.setService.install(selected);

      // Navigate back to core matrix dashboard upon successful allocation stream trigger
      this.router.navigate(['/']);
    }
  }
}
