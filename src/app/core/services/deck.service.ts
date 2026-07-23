// src/app/core/services/deck.service.ts
import { inject, Injectable } from '@angular/core';
import { SetService } from './set.service';
import { DATA_WIRE_TOKEN } from '../../app.config';
import { Observable, tap } from 'rxjs';

import { decks } from '../storage/sqlite/sqlite.schema';
import { MtgDeck } from '../../shared/models/deck/deck';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly setService = inject(SetService);

  /**
   * PURE MATH UTILITY: Increments a card count on a copied scratchpad Map.
   */
  public incrementInMap(cardsMap: Map<string, number>, cardId: string): Map<string, number> {
    const updated = new Map(cardsMap);
    const currentQty = updated.get(cardId) || 0;
    updated.set(cardId, currentQty + 1);
    return updated;
  }

  /**
   * PURE MATH UTILITY: Decrements a card count on a copied scratchpad Map.
   */
  public decrementInMap(cardsMap: Map<string, number>, cardId: string): Map<string, number> {
    const updated = new Map(cardsMap);
    const currentQty = updated.get(cardId) || 0;

    if (currentQty <= 1) {
      updated.delete(cardId);
    } else {
      updated.set(cardId, currentQty - 1);
    }
    return updated;
  }

  /**
   * THE FLUSH OPERATION
   * Commits the component's finalized scratchpad memory directly down to the database wire.
   * Tells the aggregate root to sync its cache so the fresh save becomes the new global baseline.
   */
  public saveDeckChanges(finalizedDeck: MtgDeck): Observable<void> {
    // Convert the JavaScript Map back to a plain object dictionary literal for serialization
    const cardsPayload = Object.fromEntries(finalizedDeck.cards);

    // 🌟 PERFECT DEFERRAL: Hand the payload down to the platform-blind wire
    return this.dataWire.update(decks, finalizedDeck.id, {
      name: finalizedDeck.name,
      notes: finalizedDeck.notes,
      tags: finalizedDeck.tags,
      cards: cardsPayload
    }).pipe(
      tap(() => {
        // 1. Force the parent SetService cache to reload from disk natively
        this.setService.syncInstalledCache();

        // 2. Automatically refresh the open active workspace state snapshot
        const openContext = this.setService.currentWorkspaceSnapshot;
        if (openContext) {
          this.setService.loadSetWorkspace(finalizedDeck.setId, openContext.setInfo.code);
        }
      })
    );
  }
}
