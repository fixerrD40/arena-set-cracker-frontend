// src/app/core/services/set.service.ts
import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subscription, throwError, forkJoin } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap, toArray } from 'rxjs/operators';
import { DATA_WIRE_TOKEN } from '../../app.config';

// Pure Functional Domain Layout Contracts
import { MtgSet } from '../../shared/models/set/set';
import { MtgCard } from '../../shared/models/card/card';
import { MtgDeck } from '../../shared/models/deck/deck';
import { ScryfallSet } from './api/scryfall/models/set.scryfall';
import { ScryfallCard } from './api/scryfall/models/card.scryfall';

// Standalone Scryfall Extraction Mappers
import { mapScryfallToSet } from '../../shared/models/set/set.mappers';
import { mapScryfallToCard } from '../../shared/models/card/card.mappers';

// Headless Database Schema Tokens and Behavioral Command Services
import { sets, cards, decks } from '../storage/sqlite/sqlite.schema';
import { ScryfallService } from './api/scryfall/scryfall.service';
import { FileSystemService } from './file-system.service';

/**
 * Service-Owned Aggregate Workspace Snapshot.
 * Coordinates active set metadata directly with its live card catalog
 * and user-created decks into an atomic in-memory view container.
 */
export interface WorkspaceState {
  setInfo: MtgSet;
  cards: MtgCard[];
  decks: MtgDeck[];
  loadedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SetService implements OnDestroy {
  // Pure, platform-blind data conduit token injection
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly scryfallService = inject(ScryfallService);
  private readonly fileService = inject(FileSystemService);

  private loadSubscription?: Subscription;

  // 1. Available expansion cache roster
  private readonly installedSetsSubject = new BehaviorSubject<MtgSet[]>([]);
  public readonly installedSets$: Observable<MtgSet[]> = this.installedSetsSubject.asObservable();

  // 2. Active aggregate context snapshot stream container
  private readonly activeContextSubject = new BehaviorSubject<WorkspaceState | null>(null);
  public readonly activeContext$: Observable<WorkspaceState | null> = this.activeContextSubject.asObservable();

  public get currentWorkspaceSnapshot(): WorkspaceState | null {
    return this.activeContextSubject.getValue();
  }

  /**
   * CACHE SYNCHRONIZATION PULL
   * Rehydrates available extensions post-boot.
   */
  public syncInstalledCache(): void {
    this.loadSubscription?.unsubscribe();

    // 🌟 PERFECT DEFERRAL: The active wire automatically returns mapped domain sets!
    this.loadSubscription = this.dataWire.fetchCollection<typeof sets, MtgSet>(sets, 'all').pipe(
      tap((domainSets: MtgSet[]) => this.installedSetsSubject.next(domainSets)),
      catchError((err) => {
        console.error('[SetService] Failed to sync local roster cache:', err?.message || err);
        this.installedSetsSubject.next([]);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * ATOMIC WORKSPACE HYDRATION ENGINE
   * Assembles your current layout view using an online API fallback for card catalog lists.
   */
  public loadSetWorkspace(setId: string, setCode: string): void {
    this.loadSubscription?.unsubscribe();

    // 🌟 ZERO BRANCH CHECKS: Wires emit fully hydrated domain collections automatically
    this.loadSubscription = forkJoin({
      setModels: this.dataWire.fetchCollection<typeof sets, MtgSet>(sets, 'all'),
      deckModels: this.dataWire.fetchCollection<typeof decks, MtgDeck>(decks, setId),
      cardModels: this.dataWire.fetchCollection<typeof cards, MtgCard>(cards, setId) // Safely emits [] in web clients
    }).pipe(
      switchMap(({ setModels, deckModels, cardModels }) => {
        const setInfo = setModels.find(s => s.id === setId);
        if (!setInfo) throw new Error(`[SetService] Set configuration missing on ID: ${setId}`);

        // RESILIENT FALLBACK: If strategy returned an empty card array, pull fresh from Scryfall API on the fly!
        const cardSource$ = cardModels.length > 0
          ? of(cardModels)
          : this.scryfallService.getCardsBySet(setCode.toLowerCase()).pipe(
              map(apiCards => apiCards.map(apiCard => mapScryfallToCard(apiCard, setId)))
            );

        return cardSource$.pipe(
          map((finalCards) => ({ setInfo, userDecks: deckModels, finalCards }))
        );
      }),
      tap(({ setInfo, userDecks, finalCards }) => {
        this.activeContextSubject.next({
          setInfo,
          cards: finalCards,
          decks: userDecks,
          loadedAt: new Date().toISOString()
        });
      }),
      catchError((err) => {
        console.error(`[SetService] Coordinated workspace assembly failure for set ${setId}:`, err);
        this.unloadWorkspace();
        return of(null);
      })
    ).subscribe();
  }

  /**
   * ATOMIC ASYNCHRONOUS INSTALL PIPELINE
   * Resolves, maps, downloads, and persists a complete card set + art blocks sequentially.
   */
  public install(scryfallSet: ScryfallSet): void {
    const cleanCode = scryfallSet.code.toLowerCase();
    const domainSet = mapScryfallToSet(scryfallSet);

    // STEP 1: Write the primary set parent record blindly.
    this.dataWire.insert<typeof sets, MtgSet, MtgSet>(sets, domainSet).pipe(
      // STEP 2: Pull down full card dataset from Scryfall REST API
      switchMap(() => this.scryfallService.getCardsBySet(cleanCode)),
      // STEP 3: Enqueue normal art crop binary file streaming down sequentially via concatMap
      switchMap((scryfallCards: ScryfallCard[]) => {
        const arenaOnlyCards = scryfallCards.filter(card => card.arena_id != null);

        return from(arenaOnlyCards).pipe(
          concatMap((apiCard: ScryfallCard) => {
            // 🌟 FIX: Clean optional chain tracking directly through the array index element [0]
            const imageUrl = apiCard.image_uris?.normal || apiCard.card_faces?.[0]?.image_uris?.normal;

            if (!imageUrl) {
              return of(mapScryfallToCard(apiCard, domainSet.id, ''));
            }

            return this.fileService.downloadFile(imageUrl, cleanCode, apiCard.arena_id!).pipe(
              map((localUri: string) => mapScryfallToCard(apiCard, domainSet.id, localUri)),
              catchError(() => of(mapScryfallToCard(apiCard, domainSet.id, '')))
            );
          }),
          toArray() // Collect individual items cleanly into a strict MtgCard[] array
        );
      }),
      // STEP 4: DIRECT INSERT: Trust the dumb data wire directly with the domain array!
      switchMap((domainCards: MtgCard[]) => {
        return this.dataWire.insertBulk<typeof cards, MtgCard, MtgCard>(cards, domainCards);
      }),
      // STEP 5: Optimistically append our roster map and activate the loaded workspace context
      tap(() => {
        const currentList = this.installedSetsSubject.getValue();
        if (!currentList.some(s => s.id === domainSet.id)) {
          this.installedSetsSubject.next([...currentList, domainSet]);
        }
        this.loadSetWorkspace(domainSet.id, domainSet.code);
      }),
      catchError((err) => {
        console.error(`[SetService] Atomic install pipeline aborted for set ${scryfallSet.code}:`, err?.message || err);
        return throwError(() => err);
      })
    ).subscribe();
  }

  /**
   * ATOMIC UNINSTALL PIPELINE
   * Removes a complete card set and its relational user data structures blind to platform.
   */
  public uninstall(set: MtgSet): Observable<void> {
    // PERFECT DEFERRAL: The data wire safely cascades file cleans, outbox enqueuing, or REST drops
    return this.dataWire.delete(sets, set.id).pipe(
      tap(() => {
        const currentList = this.installedSetsSubject.getValue();
        this.installedSetsSubject.next(currentList.filter(s => s.id !== set.id));

        const currentWorkspace = this.activeContextSubject.getValue();
        if (currentWorkspace?.setInfo.id === set.id) {
          this.unloadWorkspace();
        }
      }),
      map(() => void 0),
      catchError((err) => {
        console.error(`[SetService] Failed executing atomic uninstall for set ${set.code}:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Clears out current client memory allocations during view routing sequences.
   */
  public unloadWorkspace(): void {
    this.loadSubscription?.unsubscribe();
    this.activeContextSubject.next(null);
  }

  public ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }
}
