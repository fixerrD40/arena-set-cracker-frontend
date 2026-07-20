import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subscription, throwError } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap, toArray } from 'rxjs/operators';
import { SqliteService } from '../sqlite/sqlite.service';
import { sets, SetEntity } from '../sqlite/sqlite.schema';
import { MtgSet } from '../../shared/models/set';
import { ScryfallSet } from './scryfall/models/set.scryfall';
import { ScryfallCard } from './scryfall/models/card.scryfall';
import { MtgCard } from '../../shared/models/card';
import { ScryfallService } from './scryfall/scryfall-service';
import { CardService } from './card.service';
import { DeckService } from './deck.service';

@Injectable({
  providedIn: 'root'
})
export class SetService extends SqliteService<SetEntity, MtgSet> implements OnDestroy {
  // 1. FIXED: Declare your dependencies as empty typed properties.
  // Do NOT assign them to inject() here on the class-level fields!
  private cardService!: CardService;
  private deckService!: DeckService;
  private scryfallService!: ScryfallService;

  private loadSubscription?: Subscription;

  // Track all installed card expansions
  private installedSetsSubject = new BehaviorSubject<MtgSet[]>([]);
  readonly installedSets$: Observable<MtgSet[]> = this.installedSetsSubject.asObservable();

  // Track the currently active selection focus in the UI workspace
  private loadedSetSubject = new BehaviorSubject<MtgSet | null>(null);
  readonly loadedSet$: Observable<MtgSet | null> = this.loadedSetSubject.asObservable();

  // 2. FIXED: Gather all required services safely inside the synchronous constructor signature!
  constructor() {
    super(sets, {
      toDomain: (entity) => MtgSet.fromSqlite(entity),
      fromDomain: (domain) => domain.toSqlite()
    });

    // 3. FIXED: Extract and assign your services securely inside the safe initialization frame!
    this.cardService = inject(CardService);
    this.deckService = inject(DeckService);
    this.scryfallService = inject(ScryfallService);
  }

  /** Clean up active streaming pipes to prevent potential memory leaks */
  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  // ==========================================
  // DISK PERSISTENCE OPERATIONS (SQLite Sync)
  // ==========================================

  /**
   * INITIALIZATION PULL: Fired by welcomeGuard or WelcomeComponent runners.
   * Pulls your local data directory into RAM post-boot.
   */
  public initStorageRosterPull(): void {
    this.loadSubscription?.unsubscribe();

    this.loadSubscription = this.findAll().pipe(
      tap((domainSets) => this.installedSetsSubject.next(domainSets)),
      catchError((err) => {
        console.error('SetService: Failed to hydrate local roster cache from disk:', err?.message || err);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * INTERLOCKED WORKSPACE LOAD:
   * Sets up the entire assignment environment by loading the targeted set's cards
   * AND fetching the finite list of decks paired with it in a single synchronous pass.
   */
  toggleSetInMemory(mtgSet: MtgSet): void {
    const currentActiveSet = this.loadedSetSubject.getValue();

    // Case 1: Clicked the set that is ALREADY loaded -> Flush cards and decks out of RAM entirely
    if (currentActiveSet?.id === mtgSet.id) {
      this.unloadSetFromMemory();
      return;
    }

    // Case 2: A different set workspace is currently open -> Evict cards AND decks out of heap space
    if (currentActiveSet != null) {
      this.cardService.unloadSetFromMemory(currentActiveSet.id);
      this.deckService.unloadAssignmentWorkspace(); // Evict old decks from memory subjects
    }

    // Case 3: Load the brand-new interlocked workspace context
    this.loadedSetSubject.next(mtgSet);

    // Fire off both background memory loaders concurrently
    // Our in-memory WASM architecture executes these side-by-side with zero file-locking friction
    this.cardService.loadSet(mtgSet.id);
    this.deckService.loadDecksForSet(mtgSet.id); // Triggers our optimized left-join compiler statement
  }

  /**
   * Clean pipeline to purge the active puzzle workspace from device RAM completely
   */
  unloadSetFromMemory(): void {
    const activeSet = this.loadedSetSubject.getValue();
    if (activeSet) {
      this.cardService.unloadSetFromMemory(activeSet.id);
      this.deckService.unloadAssignmentWorkspace(); // Clean up deck state references
    }
    this.loadedSetSubject.next(null);
  }

  // ==========================================
  // DISK PERSISTENCE OPERATIONS (SQLite Sync)
  // ==========================================

  install(scryfallSet: ScryfallSet): void {
    const cleanCode = scryfallSet.code.toLowerCase();

    // 1. Instantiate the domain model directly using your factory
    const domainSet = MtgSet.fromScryfall(scryfallSet);

    this.create(domainSet).pipe(
      switchMap((savedDomainSet: MtgSet) => {
        const generatedSetId = savedDomainSet.id;

        return this.scryfallService.getCardsBySet(cleanCode).pipe(
          switchMap((scryfallCards: ScryfallCard[]) => {
            // Keep only MTG Arena digital cards
            const arenaOnlyCards = scryfallCards.filter(card => card.arena_id != null);

            return from(arenaOnlyCards).pipe(
              concatMap((apiCard) => {
                // Extract the image URL using the exact logic bundled in your domain class
                const imageUrl = apiCard.image_uris?.normal || apiCard.card_faces?.[0]?.image_uris?.normal;

                if (!imageUrl) {
                  const domainCard = MtgCard.fromScryfall(apiCard, generatedSetId);
                  domainCard.localArtUri = '';
                  return of(domainCard);
                }

                // Download image assets to persistent disk local layout storage
                return this.fileService.downloadFile(imageUrl, cleanCode, apiCard.arena_id!).pipe(
                  map((localUri: string) => {
                    const domainCard = MtgCard.fromScryfall(apiCard, generatedSetId);
                    domainCard.localArtUri = localUri;
                    return domainCard;
                  }),
                  catchError(() => {
                    const domainCard = MtgCard.fromScryfall(apiCard, generatedSetId);
                    domainCard.localArtUri = '';
                    return of(domainCard);
                  })
                );
              }),
              toArray() // Accumulate all fully initialized domain cards into an array
            );
          }),
          switchMap((domainCards: MtgCard[]) => {
            // 2. Pass the strongly-typed array of domain objects directly to the batch handler.
            // The updated CardService will handle data serialization internally.
            return this.cardService.insertAll(domainCards);
          }),
          map(() => savedDomainSet)
        );
      }),
      tap((savedDomainSet: MtgSet) => {
        const currentList = this.installedSetsSubject.getValue();
        this.installedSetsSubject.next([...currentList, savedDomainSet]);
      }),
      catchError(err => {
        console.error(`Atomic install pipeline dropped for set ${scryfallSet.code}:`, err?.message || err);
        return throwError(() => err);
      })
    ).subscribe();
  }

  uninstall(id: string): void {
    this.delete(id).pipe(
      tap(() => {
        // 1. Strip out of SQLite available roster registry listing
        const updatedList = this.installedSetsSubject.getValue().filter(s => s.id !== id);
        this.installedSetsSubject.next(updatedList);

        // 2. Safety Check: If the deleted set happens to be the one loaded in RAM, unload it instantly
        const activeLoadedSet = this.loadedSetSubject.getValue();
        if (activeLoadedSet?.id === id) {
          this.unloadSetFromMemory();
        }
      }),
      catchError(err => {
        console.error(`Local SQLite delete routine failed for set ID ${id}:`, err?.message || err);
        return throwError(() => err);
      })
    ).subscribe();
  }
}
