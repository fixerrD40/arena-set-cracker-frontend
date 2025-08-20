import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, filter, switchMap, of, tap, map } from 'rxjs';

import { Deck } from '../../../models/deck';
import { DeckStoreService } from '../../../services/deck-store-service';
import { RecommendationService } from '../../../services/recommendation-service';
import { MatTooltip } from '@angular/material/tooltip';
import { CardStoreService } from '../../../services/card-store-service';
import { ScryfallCard } from '../../../models/scryfall-card.model';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, MatTooltip],
  templateUrl: './deck-content.html',
  styleUrls: ['./deck-content.css']
})
export class DeckContent implements OnDestroy {
  private deckStore = inject(DeckStoreService);
  private route = inject(ActivatedRoute);
  private recommendationService = inject(RecommendationService);
  private cardStore = inject(CardStoreService);

  deck: Deck | undefined;
  recommendedCards: string[] = [];
  recommendedCardDetails: ScryfallCard[] = [];
  loadingRecommendations = false;

  private destroy$ = new Subject<void>();

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        filter(paramMap => paramMap.has('id')),
        switchMap(paramMap => {
          const id = Number(paramMap.get('id'));
          this.deck = this.deckStore.getDeckById(id);

          if (!this.deck) {
            console.warn(`Deck with ID ${id} not found.`);
            return of([]);
          }

          this.loadingRecommendations = true;

          // Get recommended card names from recommendation service
          return this.recommendationService.getRecommendations(id).pipe(
            tap((names: string[]) => {
              this.recommendedCards = names;
            }),
            // Now get the current cached cards observable (no loadSet call here)
            switchMap(() => this.cardStore.getCurrentSetCards()),
            map((cards: ScryfallCard[]) => {
              const cardMap = new Map(cards.map(card => [card.name, card]));
              return this.recommendedCards
                .map(name => cardMap.get(name))
                .filter((card): card is ScryfallCard => !!card);
            })
          );
        })
      )
      .subscribe({
        next: (cards: ScryfallCard[]) => {
          this.recommendedCardDetails = cards;
          this.loadingRecommendations = false;
        },
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
}