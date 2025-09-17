import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, filter, switchMap, of, tap, map, combineLatest } from 'rxjs';

import { Deck, parseRaw } from '../../../models/deck';
import { DeckStoreService } from '../../../services/deck-store-service';
import { RecommendationsService } from '../../../services/recommendations-service';
import { MatTooltip } from '@angular/material/tooltip';
import { CardStoreService } from '../../../services/card-store-service';
import { ScryfallCard } from '../../../models/scryfall-card.model';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { Color } from '../../../models/color';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { DeckFormComponent } from '../../shared/deck-form/deck-form';
import { FormsModule } from '@angular/forms';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { AuthService } from '../../../services/auth-service';
import { PublicService } from '../../../services/public-service';
import { Recommendations } from '../../../models/recommendations';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [
    CommonModule,
    DeckFormComponent,
    FormsModule,
    NgxTippyModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './deck-content.html',
  styleUrls: ['./deck-content.css']
})
export class DeckContent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private publicService = inject(PublicService);
  private deckStore = inject(DeckStoreService);
  private route = inject(ActivatedRoute);
  private recommendationsService = inject(RecommendationsService);
  private cardStore = inject(CardStoreService);

  deck: Deck | undefined;
  recommendations: Recommendations | null = null;
  cardMap = new Map<string, ScryfallCard>();

  recommendDualKeys: string[] = [];
  recommendPrimaryKeys: string[] = [];

  currentRecommendationType: 'dual_emergent' | 'primary_emergent' | null = null;
  currentElementKey: string | null = null;
  displayedRecommendedCards: ScryfallCard[] = [];

  loadingRecommendations = false;
  editing = false;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap.pipe(
        filter(params => params.has('id')),
        map(params => Number(params.get('id')))
      ),
      this.authService.isAuthenticated$
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([deckId, isAuthenticated]) =>
          this.deckStore.decks$.pipe(
            map(decks => decks.find(d => d.id === deckId)),
            filter((deck): deck is Deck => !!deck),
            tap(deck => {
              this.deck = deck;
              this.loadingRecommendations = true;
            }),
            switchMap(deck => {
              const recommendation$ = isAuthenticated
                ? this.recommendationsService.getRecommendations(deck.id!)
                : this.publicService.getRecommendations(deck.id!);
              return combineLatest([
                recommendation$,
                this.cardStore.getCurrentSetCards()
              ]);
            }),
            tap(([rawRecommendations, cards]) => {
              const recs = typeof rawRecommendations === 'string'
                ? JSON.parse(rawRecommendations)
                : rawRecommendations;

              this.recommendations = recs;
              this.recommendDualKeys = Object.keys(recs?.dual_emergent || {});
              this.recommendPrimaryKeys = Object.keys(recs?.primary_emergent || {});

              this.cardMap.clear();
              cards.forEach(card => this.cardMap.set(card.name.trim(), card));

              this.displayedRecommendedCards = [];
              this.currentElementKey = null;
              this.currentRecommendationType = null;

              this.loadingRecommendations = false;
            })
          )
        )
      )
      .subscribe({
        error: err => {
          this.loadingRecommendations = false;
          console.error('Failed to fetch recommendations:', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.recommendationsService.cancelRecommendations().subscribe({
      next: msg => console.log('Cancelled recommendation job:', msg),
      error: err => console.warn('Failed to cancel job:', err)
    });
  }

  // Toggle the active recommendation pill or collapse it
  setActiveRecommendation(type: 'dual_emergent' | 'primary_emergent', key: string) {
    if (this.currentRecommendationType === type && this.currentElementKey === key) {
      this.currentRecommendationType = null;
      this.currentElementKey = null;
      this.displayedRecommendedCards = [];
      return;
    }

    const names = this.recommendations?.[type]?.[key] || [];

    this.displayedRecommendedCards = names
      .map(name => this.cardMap.get(name.trim()))
      .filter((card): card is ScryfallCard => !!card);

    this.currentRecommendationType = type;
    this.currentElementKey = key;
  }

  addTag(event: MatChipInputEvent): void {
    if (!this.deck) return;

    if (!this.deck.tags) {
      this.deck.tags = [];
    }

    const input = event.input;
    const value = event.value?.trim();

    if (value && !this.deck.tags.includes(value)) {
      this.deck.tags.push(value);
    }

    if (input) {
      input.value = '';
    }
  }

  removeTag(tag: string): void {
    if (!this.deck || !this.deck.tags) return;

    const index = this.deck.tags.indexOf(tag);
    if (index >= 0) {
      this.deck.tags.splice(index, 1);
    }
  }

  // Called when notes input changes in the UI
  saveNotes(newNotes: string): void {
    if (!this.deck) return;

    if (this.deck.notes !== newNotes) {
      this.deck.notes = newNotes;
    }
  }

saveDeckFromForm(values: {
    name: string;
    arenaDeck: string | null;
    primaryColor: Color;
    colors: Color[];
  }) {
    if (!this.deck) {
      return;
    }

    this.deck.name = values.name;
    this.deck.raw = values.arenaDeck ?? '';
    this.deck.identity = {
      primary: values.primaryColor,
      colors: values.colors,
    };
    this.deck.cards = parseRaw(this.deck.raw);

    this.saveDeck(this.deck);
  }

  toggleEdit(): void {
    this.editing = !this.editing;
  }

  // Save the entire deck to backend
  saveDeck(deckToSave: Deck = this.deck!): void {
    if (!deckToSave.id) {
      console.error('Cannot save deck: missing deck ID');
      return;
    }
    this.deckStore.updateDeck(deckToSave).subscribe({
      next: (deck) => {
        this.deck = deck;
        this.editing = false;
        console.log('Deck saved successfully');
      },
      error: err => {
        console.error('Failed to save deck', err);
      }
    });
  }

  cancelEdit(): void {
    this.editing = false;
  }

  getCardTooltip(cardKey: string): string {
    const card = this.cardMap.get(cardKey);
    if (!card || !card.image_uris?.small) return '';

    return `<img src="${card.image_uris.small}" alt="${card.name}" style="width: 120px; height: auto; border-radius: 6px;" />`;
  }
}