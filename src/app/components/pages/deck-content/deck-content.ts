import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, filter, switchMap, of, tap, map, combineLatest } from 'rxjs';

import { Deck } from '../../../models/deck';
import { DeckStoreService } from '../../../services/deck-store-service';
import { RecommendationService } from '../../../services/recommendation-service';
import { MatTooltip } from '@angular/material/tooltip';
import { CardStoreService } from '../../../services/card-store-service';
import { ScryfallCard } from '../../../models/scryfall-card.model';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { Color } from '../../../models/color';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatIcon } from '@angular/material/icon';
import { DeckFormComponent } from '../../shared/deck-form/deck-form';
import { FormsModule } from '@angular/forms';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { AuthService } from '../../../services/auth-service';
import { PublicService } from '../../../services/public-service';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [
    CommonModule,
    DeckFormComponent,
    FormsModule,
    NgxTippyModule,
    MatIcon,
    MatChipsModule
  ],
  templateUrl: './deck-content.html',
  styleUrls: ['./deck-content.css']
})
export class DeckContent implements OnInit, OnDestroy {
  private authService = inject(AuthService)
  private publicService = inject(PublicService)
  private deckStore = inject(DeckStoreService);
  private route = inject(ActivatedRoute);
  private recommendationService = inject(RecommendationService);
  private cardStore = inject(CardStoreService);

  deck: Deck | undefined;
  recommendedCards: string[] = [];
  recommendedCardDetails: ScryfallCard[] = [];
  loadingRecommendations = false;
  editing = false;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  private destroy$ = new Subject<void>();

  cardMap = new Map<string, ScryfallCard>();

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap.pipe(
        filter(paramMap => paramMap.has('id')),
        map(paramMap => Number(paramMap.get('id')))
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
                ? this.recommendationService.getRecommendations(deck.id!)
                : this.publicService.getRecommendations(deck.id!);

              return recommendation$.pipe(
                tap(names => {
                  this.recommendedCards = names;
                }),
                switchMap(() => this.cardStore.getCurrentSetCards()),
                map(cards => {
                  this.cardMap.clear();
                  cards.forEach(card => this.cardMap.set(card.name, card));

                  return this.recommendedCards
                    .map(name => this.cardMap.get(name))
                    .filter((card): card is ScryfallCard => !!card);
                }),
                tap(cards => {
                  this.recommendedCardDetails = cards;
                  this.loadingRecommendations = false;
                })
              );
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

    this.recommendationService.cancelRecommendations().subscribe({
      next: msg => console.log('Cancelled recommendation job:', msg),
      error: err => console.warn('Failed to cancel job:', err)
    });
  }

  toggleEdit() {
    this.editing = !this.editing;
  }

  saveDeck(updated: {
    name: string;
    arenaDeck: string | null;
    primaryColor: Color;
    colors: Color[];
  }) {
    if (!this.deck) return;

    const updatedDeck = new Deck({
      ...this.deck,
      name: updated.name,
      raw: updated.arenaDeck ?? '',
      identity: {
        primary: updated.primaryColor,
        colors: updated.colors,
      },
    });

    this.deckStore.updateDeck(updatedDeck).subscribe({
      next: deck => {
        this.deck = deck;
        this.editing = false;
      },
      error: err => {
        console.error('Failed to update deck', err);
      }
    });
  }

  cancelEdit() {
    this.editing = false;
  }

  saveNotes() {
    if (!this.deck) return;

    const updatedDeck = new Deck({
      ...this.deck,
      notes: this.deck.notes,
    });

    this.deckStore.updateDeck(updatedDeck).subscribe({
      next: deck => {
        this.deck = deck;
      },
      error: err => {
        console.error('Failed to update notes', err);
      }
    });
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value || !this.deck) return;

    const updatedTags = [...(this.deck.tags ?? []), value];
    const updatedDeck = new Deck({
      ...this.deck,
      tags: updatedTags,
    });

    this.deckStore.updateDeck(updatedDeck).subscribe({
      next: deck => {
        this.deck = new Deck(deck);
      },
      error: err => {
        console.error('Failed to add tag', err);
      }
    });

    event.chipInput?.clear();
  }

  removeTag(tag: string): void {
    if (!this.deck) return;

    const updatedTags = (this.deck.tags ?? []).filter(t => t !== tag);
    const updatedDeck = new Deck({
      ...this.deck,
      tags: updatedTags,
    });

    this.deckStore.updateDeck(updatedDeck).subscribe({
      next: deck => {
        this.deck = deck;
      },
      error: err => {
        console.error('Failed to remove tag', err);
      }
    });
  }

  getCardTooltip(cardName: string): string {
  const imageUrl = this.cardMap.get(cardName)?.image_uris?.small;
  if (!imageUrl) return cardName;

  return `
    <img 
      src="${imageUrl}" 
      alt="${cardName}" 
      style="width: 180px; height: auto; border-radius: 6px; display: block;" 
    />
  `;
}
}