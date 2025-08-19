import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, filter, switchMap, of } from 'rxjs';

import { Deck } from '../../../models/deck';
import { DeckStoreService } from '../../../services/deck-store-service';
import { RecommendationService } from '../../../services/recommendation-service';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, MatTooltip],
  templateUrl: './deck-content.html',
  styleUrl: './deck-content.css'
})
export class DeckContent implements OnDestroy {
  private deckStore = inject(DeckStoreService);
  private route = inject(ActivatedRoute);
  private recommendationService = inject(RecommendationService);

  deck: Deck | undefined;
  recommendedCards: string[] = [];
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
            return of([]); // no deck, no recommendations
          }

          this.loadingRecommendations = true;
          return this.recommendationService.getRecommendations(id);
        })
      )
      .subscribe({
        next: (cards: string[]) => {
          this.loadingRecommendations = false;
          this.recommendedCards = cards;
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

    // Cancel backend recommendation job if active
    this.recommendationService.cancelRecommendations().subscribe({
      next: msg => console.log('Cancelled recommendation job:', msg),
      error: err => console.warn('Failed to cancel job:', err)
    });
  }
}