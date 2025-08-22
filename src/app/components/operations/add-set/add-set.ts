import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { map, Observable, of, startWith } from 'rxjs';

import { ScryfallService } from '../../../services/scryfall-service';
import { SetStoreService } from '../../../services/set-store-service';
import { ScryfallSet } from '../../../models/scryfall-set';

@Component({
  selector: 'app-add-set',
  standalone: true,
  templateUrl: './add-set.html',
  styleUrls: ['./add-set.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCard
  ]
})
export class AddSet implements OnInit {
  form = new FormGroup({
    search: new FormControl<any>(null, Validators.required)
  });

  allSets: any[] = [];
  filteredSets$: Observable<any[]> = of([]);
  isLoading = false;

  constructor(private scryfall: ScryfallService, private setStore: SetStoreService, private router: Router) {}

  ngOnInit() {
    this.isLoading = true;
    this.scryfall.getAllSets().subscribe({
      next: (response: { data: ScryfallSet[] }) => {
        this.allSets = response.data;
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
      error: () => {
        this.isLoading = false;
      }
    });
  }

  displaySet = (set: any) => set ? `${set.name} (${set.code})` : '';

  submit() {
    const selected = this.form.value.search;
    if (selected?.code) {
      this.setStore.addSet({ code: selected.code });
      this.setStore.loadSets;
      // this.router.navigate(['/']);
    }
  }
}
