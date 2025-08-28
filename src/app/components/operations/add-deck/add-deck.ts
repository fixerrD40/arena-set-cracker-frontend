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
import { Color } from '../../../models/color';
import { MatOption } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { DeckFormComponent } from '../../shared/deck-form/deck-form';

@Component({
  selector: 'app-add-deck',
  templateUrl: './add-deck.html',
  styleUrls: ['./add-deck.css'],
  standalone: true,
  imports: [
    CommonModule,
    DeckFormComponent,
    MatCardModule
  ]
})
export class AddDeck implements OnInit {
  set!: { id: number; scryfallSet: ScryfallSet };
  errorMessage: string | null = null;

  defaultValues = {
    name: '',
    arenaDeck: '',
    primaryColor: null,
    colors: [] as Color[],
  };

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

  handleSubmit(values: {
    name: string;
    arenaDeck: string | null;
    primaryColor: Color;
    colors: Color[];
  }) {
    this.errorMessage = null;

    const identity = {
      primary: values.primaryColor,
      colors: values.colors
    };

    const deck = new Deck({
      name: values.name,
      raw: values.arenaDeck ?? '',
      identity
    });

    this.deckStore.addDeck(this.set, deck).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        console.error('Failed to add deck', err);
        this.errorMessage = 'An error occurred while saving the deck.';
      },
    });
  }
}