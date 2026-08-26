import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { SetService } from './set.service';
import { MtgCard } from '../../shared/models/card/card';
import { MtgDeck } from '../../shared/models/deck/deck';
import { decks, deckCards } from '../sqlite/sqlite.schema';
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

  private readonly activeDeckSource = new BehaviorSubject<MtgDeck | null>(null);
  public readonly activeDeck$ = this.activeDeckSource.asObservable();

  private readonly scratchpadSource = new BehaviorSubject<MtgDeck | null>(null);
  public readonly scratchpadDeck$ = this.scratchpadSource.asObservable();

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

  public get scratchpadValue(): MtgDeck | null {
    return this.scratchpadSource.value;
  }
  public get activeDeckSnapshot(): MtgDeck | null {
    return this.activeDeckSource.value;
  }

  public loadDeckByIdFromWorkspace(deckId: string): void {
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (!currentWorkspace || !currentWorkspace.decks) {
      console.warn('[DeckService] Unable to resolve deck selection. No active workspace loaded.');
      return;
    }

    const foundDeck = currentWorkspace.decks.find((d) => String(d.id) === String(deckId));

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

  /**
   * Creates a new deck row + card lines, then activates it in memory.
   */
  public createDeck(setId: string, setCode: string, name: string): Observable<MtgDeck> {
    const freshDeck: MtgDeck = {
      id: crypto.randomUUID(),
      setId,
      name: name.trim(),
      tags: [],
      notes: '',
      cards: new Map()
    };

    return this.persistDeck(freshDeck, { isNew: true }).pipe(
      tap(() => {
        this.setService.loadSetWorkspace(setId, setCode);
        this.setActiveDeck(freshDeck);
      }),
      map(() => freshDeck)
    );
  }

  /**
   * Inserts a fully formed deck (including optional Arena-resolved card map).
   */
  public insertNewDeckPayload(deck: MtgDeck): Observable<MtgDeck> {
    return this.persistDeck(deck, { isNew: true }).pipe(
      tap(() => {
        this.setService.upsertDeckInWorkspaceMemory(deck);
        this.setActiveDeck(deck);
      }),
      map(() => deck)
    );
  }

  /**
   * Commits scratchpad modifications (parent + card lines) to SQLite.
   */
  public flush(): Observable<void> {
    const deckToSave = this.scratchpadSource.value;
    if (!deckToSave) return of(void 0);

    return this.persistDeck(deckToSave, { isNew: false }).pipe(
      tap(() => {
        this.setActiveDeck(deckToSave);
        this.setService.updateDeckInWorkspaceMemory(deckToSave);
      }),
      map(() => void 0),
      catchError((err) => {
        console.error(`[DeckService] Atomic database workspace commit failure on "${deckToSave.name}":`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Writes decks row + replaces deck_cards for that deck id.
   */
  private persistDeck(deck: MtgDeck, options: { isNew: boolean }): Observable<MtgDeck> {
    const parentDeckPayload = {
      id: deck.id,
      setId: deck.setId,
      name: deck.name,
      notes: deck.notes,
      tags: [...deck.tags]
    };

    const writeParent$ = options.isNew
      ? this.dataWire.insert(decks, parentDeckPayload)
      : this.dataWire.update(decks, parentDeckPayload);

    return writeParent$.pipe(
      switchMap(() => this.dataWire.deleteWhere(deckCards, 'deckId', deck.id)),
      switchMap(() => {
        const relationsPayloads = Array.from(deck.cards.entries()).map(([cardId, qty]) => ({
          deckId: deck.id,
          cardId,
          quantity: qty
        }));

        if (relationsPayloads.length === 0) return of([]);
        return this.dataWire.insertBulk(deckCards, relationsPayloads);
      }),
      tap(() => {
        console.log(`[DeckService] Persisted deck "${deck.name}" with ${deck.cards.size} unique card lines.`);
      }),
      map(() => deck)
    );
  }
}
