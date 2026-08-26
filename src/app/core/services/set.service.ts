// src/app/core/services/set.service.ts
import { inject, Injectable, Injector, OnDestroy } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subscription, throwError, forkJoin } from 'rxjs';
import { catchError, concatMap, map, switchMap, tap, toArray } from 'rxjs/operators';
import { DATA_WIRE_TOKEN } from './data-wire/data-wire.contract';

// Pure Functional Domain Layout Contracts
import { MtgSet } from '../../shared/models/set/set';
import { MtgCard } from '../../shared/models/card/card';
import { MtgDeck } from '../../shared/models/deck/deck';
import { ScryfallSet } from './api/scryfall/models/set.scryfall';
import { ScryfallCard } from './api/scryfall/models/card.scryfall';

// Standalone Scryfall Extraction Mappers
import { mapScryfallToCard } from '../../shared/models/card/card.mappers';

// Headless Database Schema Tokens and Behavioral Command Services
import { sets, cards, decks, deckCards, DeckCardRow, DeckRow } from '../sqlite/sqlite.schema';
import { ScryfallService } from './api/scryfall/scryfall.service';
import { FileSystemService } from './file-system.service';
import { mapScryfallToDomainSet } from '../../shared/models/set/set.mappers';
import { mapRowToDeck } from '../../shared/models/deck/deck.mappers';

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
    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    // 🌟 FIX: Remove the 'typeof sets' generic. Only pass the single expected <TOutput> contract.
    this.loadSubscription = this.dataWire.fetchCollection<MtgSet>(sets, 'all').pipe(
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
    if (this.loadSubscription) {
      this.loadSubscription.unsubscribe();
    }

    this.loadSubscription = forkJoin({
      setModels: this.dataWire.fetchCollection<MtgSet>(sets, 'all'),
      deckModels: this.dataWire.fetchCollection<any>(decks, setId),
      cardModels: this.dataWire.fetchCollection<MtgCard>(cards, setId),
      deckCardRows: this.dataWire.fetchCollection<DeckCardRow>(deckCards, 'all')
    }).pipe(
      switchMap(({ setModels, deckModels, cardModels, deckCardRows }) => {
        const setInfo = setModels.find((s) => s.id === setId);
        if (!setInfo) throw new Error(`[SetService] Set configuration missing on ID: ${setId}`);

        const linesByDeckId = new Map<string, DeckCardRow[]>();
        for (const row of deckCardRows || []) {
          const key = String(row.deckId);
          const bucket = linesByDeckId.get(key) || [];
          bucket.push(row);
          linesByDeckId.set(key, bucket);
        }

        const userDecks: MtgDeck[] = (deckModels || []).map((deckLike: any) => {
          const id = String(deckLike.id);
          const lines = linesByDeckId.get(id) || [];
          const asRow = {
            id: deckLike.id,
            setId: deckLike.setId,
            name: deckLike.name,
            notes: deckLike.notes || '',
            tags: Array.isArray(deckLike.tags) ? deckLike.tags : [],
            createdAt: deckLike.createdAt || new Date().toISOString()
          } as DeckRow;
          return mapRowToDeck(asRow, lines);
        });

        const cardSource$ =
          cardModels.length > 0
            ? of(cardModels)
            : this.scryfallService.getCardsBySet(setCode.toLowerCase()).pipe(
                map((apiCards) => apiCards.map((apiCard) => mapScryfallToCard(apiCard, setId, '')))
              );

        return cardSource$.pipe(
          map((finalCards) => ({ setInfo, userDecks, finalCards }))
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

    // 🌟 PRIVACY REFACTORED: Decoupled domain mapper completely clear of server backend parameters!
    const domainSet: MtgSet = mapScryfallToDomainSet(scryfallSet);

    // STEP 1: Write the primary set parent record utilizing your two-argument contract signature
    this.dataWire.insert<MtgSet, MtgSet>(sets, domainSet).pipe(

      // STEP 2: Pull down full card dataset from Scryfall REST API
      switchMap(() => this.scryfallService.getCardsBySet(cleanCode)),

      // STEP 3: Enqueue normal art crop binary file streaming down sequentially via concatMap
      switchMap((scryfallCards: ScryfallCard[]) => {
        const arenaOnlyCards = scryfallCards.filter(card => card.arena_id != null);

        return from(arenaOnlyCards).pipe(
          concatMap((apiCard: ScryfallCard) => {
            const imageUrl = apiCard.image_uris?.normal || apiCard.card_faces?.[0]?.image_uris?.normal;

            if (!imageUrl) {
              return of(mapScryfallToCard(apiCard, domainSet.id, ''));
            }

            // 🚀 IDIOMATIC PATH REFACTOR: Business layer dictates the target path destination string
            const destinationFilePath = this.getCardArtPath(cleanCode, apiCard.arena_id!);

            // Hand the explicit target string to your dumb, domain-blind file service utility
            return this.fileService.downloadRemoteUrlToDisk(imageUrl, destinationFilePath).pipe(
              map((localUri: string) => mapScryfallToCard(apiCard, domainSet.id, localUri)),
              catchError(() => of(mapScryfallToCard(apiCard, domainSet.id, '')))
            );
          }),
          toArray()
        );
      }),

      // STEP 4: DIRECT BULK INSERT: Trust the data wire to serialize your domain array safely!
      switchMap((domainCards: MtgCard[]) => {
        return this.dataWire.insertBulk<MtgCard, MtgCard>(cards, domainCards);
      }),

      // STEP 5: Optimistically append our roster map and activate workspace
      tap(() => {
        const currentList = this.installedSetsSubject.getValue();
        if (!currentList.some(s => s.id === domainSet.id)) {
          this.installedSetsSubject.next([...currentList, domainSet]);
        }
        this.loadSetWorkspace(domainSet.id, domainSet.code.toLowerCase());
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
    // 1. Kick off the primary database row purge via your contract token port
    return this.dataWire.delete(sets, set.id).pipe(

      // 2. 🚀 CHOSEN DIRECTION: Business tier dictates path formatting & purges disk binaries
      concatMap(() => {
        const targetArtFolder = this.getSetDirectoryPath(set.code);
        return this.fileService.deleteDirectory(targetArtFolder);
      }),

      tap(() => {
        // Optimistically slice the dropped set out of the available UI roster cache stream
        const currentList = this.installedSetsSubject.getValue();
        this.installedSetsSubject.next(currentList.filter(s => s.id !== set.id));

        // Tear down active layout view states instantly if the user purged the set they were actively browsing
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

  // ==========================================================
  // 🌟 INTERNAL MTG BUSINESS PATH CALCULATORS
  // ==========================================================

  /**
   * Business Domain Rule: Defines the structural disk directory layout for a card set.
   * Isolates local assets safely inside an explicit folder block clear of generic mixing.
   */
  public getSetDirectoryPath(setCode: string): string {
    return `cached_art/${setCode.toLowerCase()}`;
  }

  /**
   * Business Domain Rule: Defines the structural filename for a set's cover graphic banner.
   */
  public getSetCoverArtPath(setCode: string): string {
    return `${this.getSetDirectoryPath(setCode)}/cover.jpg`;
  }

  /**
   * Business Domain Rule: Defines the filename scheme for individual in-game card crops.
   */
  public getCardArtPath(setCode: string, arenaId: number): string {
    return `${this.getSetDirectoryPath(setCode)}/${arenaId}.png`;
  }

  /**
   * Assembles a cross-platform authorized WebView URI token for rendering the set cover background.
   * Defers cleanly to the dumb file system service to process native path resolutions.
   */
  public getSetCoverWebViewUri(setCode: string): Observable<string> {
    const targetPath = this.getSetCoverArtPath(setCode);

    // Hand the explicit target path string downstream to the blind file utility service
    return this.fileService.resolvePlatformWebViewUri(targetPath).pipe(
      catchError(() => {
        // Fall back quietly to your standard global package assets if the cover isn't downloaded yet
        return of('assets/covers/default-mtg.jpg');
      })
    );
  }

  // ==========================================================
  // 🌟 DUMB FILE STREAM DOWNLOAD DISPATCHERS
  // ==========================================================

  /**
   * Explicit downloader proxy that handles passing constructed MTG file tracks down to your I/O layer.
   */
  public triggerCardAssetDownload(url: string, setCode: string, arenaId: number): Observable<string> {
    const destinationPath = this.getCardArtPath(setCode, arenaId);
    return this.fileService.downloadRemoteUrlToDisk(url, destinationPath);
  }

  /**
   * Explicit downloader proxy that handles fetching and mapping custom premium cover banners.
   */
  public triggerCoverAssetDownload(remoteServerUrl: string, setCode: string): Observable<string> {
    const destinationPath = this.getSetCoverArtPath(setCode);
    const fullRemoteUrl = `${remoteServerUrl}/api/assets/covers/${setCode.toLowerCase()}.jpg`;

    return this.fileService.downloadRemoteUrlToDisk(fullRemoteUrl, destinationPath).pipe(
      catchError(() => of('assets/covers/default-mtg.jpg')) // Absorb network miss flags gracefully
    );
  }

  /**
   * Inserts or replaces a deck in the live workspace cache (used after create).
   */
  public upsertDeckInWorkspaceMemory(deck: MtgDeck): void {
    const current = this.currentWorkspaceSnapshot;
    if (!current) return;

    const exists = current.decks.some((d) => String(d.id) === String(deck.id));
    const updatedDecks = exists
      ? current.decks.map((d) =>
          String(d.id) === String(deck.id)
            ? { ...deck, tags: [...deck.tags], cards: new Map(deck.cards) }
            : d
        )
      : [...current.decks, { ...deck, tags: [...deck.tags], cards: new Map(deck.cards) }];

    this.activeContextSubject.next({
      ...current,
      decks: updatedDecks
    });
  }

  /**
   * 🌟 WORKSPACE MEMORY MODIFIER
   * Allows sub-feature domains (like DeckService) to update a specific deck element
   * inside the live in-memory workspace cache array without forcing a slow disk reload.
   */
  public updateDeckInWorkspaceMemory(updatedDeck: MtgDeck): void {
    this.upsertDeckInWorkspaceMemory(updatedDeck);
    console.log(`[SetService] Workspace memory cache updated locally for deck: ${updatedDeck.name}`);
  }

  /**
   * AUTHORITATIVE CATALOG FLUSH
   * Synchronizes active parent set metadata records cleanly down to SQLite.
   * Completely decoupled from downward deck child service dependencies!
   */
  public flush(): Observable<void> {
    const current = this.currentWorkspaceSnapshot;
    if (!current) return of(void 0);

    // Write core set metadata mutations safely using your standard two-parameter contract
    return this.dataWire.update<MtgSet, MtgSet>(sets, current.setInfo).pipe(
      tap(() => {
        console.log(`[SetService] Database catalog sync complete for expansion: ${current.setInfo.name}`);
      }),
      map(() => void 0),
      catchError((err) => {
        console.error(`[SetService] Catalog database flush aborted:`, err);
        return throwError(() => err);
      })
    );
  }

  public unloadWorkspace(): void {
    this.loadSubscription?.unsubscribe();
    this.activeContextSubject.next(null);
  }

  public ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }
}
