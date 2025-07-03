import { Component, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';

import { Deck } from '../../../models/deck';
import { DeckStoreService } from '../../../services/deck-store-service';
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

  deck: Deck | undefined;
  private sub: Subscription;

  constructor() {
    this.sub = this.route.paramMap.subscribe(paramMap => {
      const id = Number(paramMap.get('id'));

      if (!isNaN(id)) {
        this.deck = this.deckStore.getDeckById(id);
      }

      if (!this.deck) {
        console.warn(`Deck with ID ${id} not found.`);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}