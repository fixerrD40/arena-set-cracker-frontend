import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DeckStoreService } from '../../../services/deck-store-service';
import { Deck } from '../../../models/deck';
import { ActivatedRoute, Router } from '@angular/router';
import { ScryfallSet } from '../../../models/scryfall-set';
import { Color, ColorUtils } from '../../../models/color';
import { MatOption } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-add-deck',
  templateUrl: './add-deck.html',
  styleUrls: ['./add-deck.css'],
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatSelectModule ,MatOption]
})
export class AddDeck implements OnInit {
  set!: { id: number; scryfallSet: ScryfallSet };

  form = new FormGroup({
    name: new FormControl('', Validators.required),
    arenaDeck: new FormControl('', Validators.required),
    primaryColor: new FormControl<Color | null>(null, Validators.required),
    colors: new FormControl<Color[]>([], Validators.required),
  });

  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private deckStore: DeckStoreService
  ) {}

  ngOnInit() {
    const state = history.state as { set?: { id: number; scryfallSet: ScryfallSet } };

    if (!state.set || !state.set.scryfallSet) {
      this.router.navigate(['/']);
      return;
    }

    this.set = state.set;
  }

  readonly allColors: (keyof typeof Color)[] = Object.keys(Color) as (keyof typeof Color)[];

  getColorName(code: keyof typeof Color): string {
    return Color[code];
  }

  submit() {
    this.errorMessage = null;

    if (!this.form.valid) return;

    try {
      const identity = {
        primary: this.form.value.primaryColor!,
        colors: this.form.value.colors!,
      };

      const deck = new Deck(
        {
          name: this.form.value.name!,
          raw: this.form.value.arenaDeck!,
          identity
        },
        this.set.scryfallSet
      );

      this.deckStore.addDeck(this.set, deck).subscribe({
        next: () => this.router.navigate(['/']),
        error: err => {
          console.error('Failed to add deck', err);
          this.errorMessage = 'An error occurred while saving the deck.';
        },
      });
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Deck validation failed.';
    }
  }
}
