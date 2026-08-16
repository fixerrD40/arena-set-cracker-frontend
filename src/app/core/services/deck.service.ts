import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { SetService } from './set.service';
import { MtgCard } from '../../shared/models/card/card';
import { MtgDeck } from '../../shared/models/deck/deck';
import { decks } from '../sqlite/sqlite.schema';
import { DATA_WIRE_TOKEN } from './data-wire/data-wire.contract';

export interface DisplayedCardLine {
  card: MtgCard;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly setService = inject(SetService);

  // ─── 🌟 GLOBAL SOURCE OF TRUTH WORKSPACE MATRICES ──────────────────
  private readonly activeDeckSource = new BehaviorSubject<MtgDeck | null>(null);
  public readonly activeDeck$ = this.activeDeckSource.asObservable();

  private readonly scratchpadSource = new BehaviorSubject<MtgDeck | null>(null);
  public readonly scratchpadDeck$ = this.scratchpadSource.asObservable();

  // 🌟 AUTOMATIC STRUCTURAL DIRTY STREAM
  public readonly isDirty$ = combineLatest([
    this.activeDeck$,
    this.scratchpadDeck$
  ]).pipe(
    map(([active, scratch]) => {
      if (!active || !scratch) return false;

      const originalString = JSON.stringify({
        n: active.name,
        nt: active.notes,
        t: active.tags,
        c: Object.fromEntries(active.cards)
      });

      const currentString = JSON.stringify({
        n: scratch.name,
        nt: scratch.notes,
        t: scratch.tags,
        c: Object.fromEntries(scratch.cards)
      });

      return originalString !== currentString;
    })
  );

  // 🌟 CONNECT CATALOG DATA DIRECTLY TO ACTIVE QUANTITIES
  public readonly displayedCards$: Observable<DisplayedCardLine[]> = combineLatest({
    workspace: this.setService.activeContext$,
    currentScratchpad: this.scratchpadDeck$
  }).pipe(
    map(({ workspace, currentScratchpad }) => {
      if (!workspace || !currentScratchpad) return [];

      const list: DisplayedCardLine[] = [];

      for (const card of workspace.cards) {
        const quantityInDeck = currentScratchpad.cards.get(String(card.id));
        if (quantityInDeck && quantityInDeck > 0) {
          list.push({ card, quantity: quantityInDeck });
        }
      }
      return list;
    })
  );

  // ─── UTILITY READ SYNCHRONIZERS ────────────────────────────────────
  public get scratchpadValue(): MtgDeck | null { return this.scratchpadSource.value; }
  public get activeDeckSnapshot(): MtgDeck | null { return this.activeDeckSource.value; }

  // ─── STATE HYDRATION & LIFECYCLES ──────────────────────────────────

  /**
   * 🌟 ROUTE RESOLVER TARGET
   * Triggered directly by the routed component's parameter map subscription loop.
   * Pulls the clean record out of SetService snapshot data independently.
   */
  public loadDeckByIdFromWorkspace(deckId: string): void {
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (!currentWorkspace || !currentWorkspace.decks) {
      console.warn('[DeckService] Unable to resolve deck selection. No active workspace loaded.');
      return;
    }

    const foundDeck = currentWorkspace.decks.find(d => String(d.id) === String(deckId));

    if (foundDeck) {
      this.setActiveDeck(foundDeck);
    } else {
      console.error(`[DeckService] Route target identifier "${deckId}" matches no active workspace records.`);
    }
  }

  public setActiveDeck(deck: MtgDeck): void {
    this.activeDeckSource.next({ ...deck, tags: [...deck.tags], cards: new Map(deck.cards) });
    this.scratchpadSource.next({ ...deck, tags: [...deck.tags], cards: new Map(deck.cards) });
  }

  public clearActiveDeck(): void {
    this.activeDeckSource.next(null);
    this.scratchpadSource.next(null);
  }

  public updateScratchpad(modifiedDeck: MtgDeck): void {
    this.scratchpadSource.next(modifiedDeck);
  }

  // ─── PURE IN-MEMORY MAP OPERATIONS ─────────────────────────────────
  public incrementInMap(cardsMap: Map<string, number>, cardId: string): Map<string, number> {
    const updated = new Map(cardsMap);
    updated.set(cardId, (updated.get(cardId) || 0) + 1);
    return updated;
  }

  public decrementInMap(cardsMap: Map<string, number>, cardId: string): Map<string, number> {
    const updated = new Map(cardsMap);
    const qty = updated.get(cardId) || 0;
    qty <= 1 ? updated.delete(cardId) : updated.set(cardId, qty - 1);
    return updated;
  }

  // ─── DATABASE WRITE PERSISTENCE CHANNELERS ─────────────────────────
  public createDeck(setId: string, setCode: string, name: string): Observable<MtgDeck> {
    const freshDeck: MtgDeck = { id: crypto.randomUUID(), setId, name: name.trim(), tags: [], notes: '', cards: new Map() };
    const payload = { ...freshDeck, cards: Object.fromEntries(freshDeck.cards) };

    return this.dataWire.insert<any, MtgDeck>(decks, payload).pipe(
      tap(() => {
        this.setService.loadSetWorkspace(setId, setCode);
        this.setActiveDeck(freshDeck);
      }),
      map(() => freshDeck)
    );
  }

  public insertNewDeckPayload(deck: MtgDeck): Observable<MtgDeck> {
    const payload = { ...deck, cards: Object.fromEntries(deck.cards) };
    return this.dataWire.insert<any, MtgDeck>(decks, payload).pipe(
      tap(() => this.setActiveDeck(deck)),
      map(() => deck)
    );
  }

  // ─── 🌟 AUTHORITATIVE UNIFIED FLUSH ENGINE ─────────────────────────
  /**
   * Commits current scratchpad modifications down to your storage layer wire.
   * Can be executed by workspace save buttons or invoked dynamically by SetService.
   */
  public flush(): Observable<void> {
    const deckToSave = this.scratchpadSource.value;
    if (!deckToSave) return of(void 0);

    const cardsPayload = Object.fromEntries(deckToSave.cards);

    return this.dataWire.update(decks, deckToSave.id, {
      name: deckToSave.name,
      notes: deckToSave.notes,
      tags: deckToSave.tags,
      cards: cardsPayload
    }).pipe(
      tap(() => {
        console.log(`[DeckService] Local database map serialization update complete for "${deckToSave.name}".`);

        // 1. Establish the newly saved data as the pristine baseline (resets isDirty$)
        this.setActiveDeck(deckToSave);

        // 2. Synchronize the change into SetService's memory layout stream instantly
        this.setService.updateDeckInWorkspaceMemory(deckToSave);
      }),
      map(() => void 0)
    );
  }
}
