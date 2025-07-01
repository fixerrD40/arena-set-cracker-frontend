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

@Component({
  selector: 'app-add-deck',
  templateUrl: './add-deck.html',
  styleUrls: ['./add-deck.css'],
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule]
})
export class AddDeck implements OnInit {
  set!: number;
  scryfallSet!: ScryfallSet;

  form = new FormGroup({
    name: new FormControl('', Validators.required),
    arenaDeck: new FormControl('', Validators.required),
  });

  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private deckStore: DeckStoreService
  ) {}

  ngOnInit() {
    const state = history.state as { entry?: { id: number; set: ScryfallSet } };

    if (!state.entry || !state.entry.set) {
      this.router.navigate(['/']);
      return;
    }

    this.set = state.entry.id;
    this.scryfallSet = state.entry.set;
  }

  submit() {
    this.errorMessage = null;

    if (!this.form.valid) return;

    try {
      const deck = new Deck(
        {
          name: this.form.value.name!,
          raw: this.form.value.arenaDeck!,
        },
        this.scryfallSet
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
