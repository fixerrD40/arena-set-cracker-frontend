import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subscription, throwError, forkJoin } from 'rxjs';
import { catchError, concatMap, map, shareReplay, switchMap, tap, toArray } from 'rxjs/operators';
import { DATA_WIRE_TOKEN } from './data-wire/data-wire.contract';

import { MtgSet } from '../../shared/models/set/set';
import { MtgCard } from '../../shared/models/card/card';
import { MtgDeck } from '../../shared/models/deck/deck';
import { ScryfallSet } from './api/scryfall/models/set.scryfall';
import { ScryfallCard } from './api/scryfall/models/card.scryfall';

import { mapScryfallToCard } from '../../shared/models/card/card.mappers';

import { sets, cards, decks, deckCards, DeckCardRow, DeckRow } from '../sqlite/sqlite.schema';
import { ScryfallService } from './api/scryfall/scryfall.service';
import { FileSystemService } from './file-system.service';
import { mapScryfallToDomainSet } from '../../shared/models/set/set.mappers';
import { mapRowToDeck } from '../../shared/models/deck/deck.mappers';

/** Active set metadata plus its cards and decks for the current view. */
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
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly scryfallService = inject(ScryfallService);
  private readonly fileService = inject(FileSystemService);

  private rosterSubscription?: Subscription;
  private workspaceSubscription?: Subscription;
  private inFlightSetId: string | null = null;
  private inFlightLoad$: Observable<WorkspaceState | null> | null = null;

  private readonly installedSetsSubject = new BehaviorSubject<MtgSet[]>([]);
  public readonly installedSets$: Observable<MtgSet[]> = this.installedSetsSubject.asObservable();

  private readonly activeContextSubject = new BehaviorSubject<WorkspaceState | null>(null);
  public readonly activeContext$: Observable<WorkspaceState | null> = this.activeContextSubject.asObservable();

  public get currentWorkspaceSnapshot(): WorkspaceState | null {
    return this.activeContextSubject.getValue();
  }

  /** Rehydrates the installed-sets list from SQLite after boot. */
  public syncInstalledCache(): void {
    this.rosterSubscription?.unsubscribe();

    this.rosterSubscription = this.dataWire.fetchCollection<MtgSet>(sets, 'all').pipe(
      tap((domainSets: MtgSet[]) => this.installedSetsSubject.next(domainSets)),
      catchError((err) => {
        console.error('[SetService] Failed to sync local roster cache:', err?.message || err);
        this.installedSetsSubject.next([]);
        return of([]);
      })
    ).subscribe();
  }

  /** Returns the current workspace if it already matches `setId`; otherwise loads it. */
  public ensureSetWorkspace(setId: string): Observable<WorkspaceState | null> {
    const current = this.currentWorkspaceSnapshot;
    if (current?.setInfo.id === setId) {
      return of(current);
    }
    return this.loadSetWorkspace(setId);
  }

  /** Loads set + cards + decks into the active workspace; falls back to Scryfall if cards are missing. */
  public loadSetWorkspace(setId: string): Observable<WorkspaceState | null> {
    if (this.inFlightSetId === setId && this.inFlightLoad$) {
      return this.inFlightLoad$;
    }

    this.workspaceSubscription?.unsubscribe();

    const load$ = this.assembleWorkspace(setId).pipe(
      tap((workspace) => {
        if (this.inFlightSetId === setId) {
          this.activeContextSubject.next(workspace);
        }
      }),
      catchError((err) => {
        console.error(`[SetService] Coordinated workspace assembly failure for set ${setId}:`, err);
        if (this.inFlightSetId === setId) {
          this.activeContextSubject.next(null);
        }
        return of(null);
      }),
      tap({
        complete: () => this.clearInFlight(setId)
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.inFlightSetId = setId;
    this.inFlightLoad$ = load$;
    this.workspaceSubscription = load$.subscribe();
    return load$;
  }

  private assembleWorkspace(setId: string): Observable<WorkspaceState> {
    return forkJoin({
      setInfo: this.dataWire.fetchRecord<MtgSet>(sets, setId),
      deckModels: this.dataWire.fetchCollection<DeckRow>(decks, setId),
      cardModels: this.dataWire.fetchCollection<MtgCard>(cards, setId),
      deckCardRows: this.dataWire.fetchCollection<DeckCardRow>(deckCards, 'all')
    }).pipe(
      switchMap(({ setInfo, deckModels, cardModels, deckCardRows }) => {
        if (!setInfo) {
          throw new Error(`[SetService] Set configuration missing on ID: ${setId}`);
        }

        const linesByDeckId = new Map<string, DeckCardRow[]>();
        for (const row of deckCardRows || []) {
          const key = String(row.deckId);
          const bucket = linesByDeckId.get(key) || [];
          bucket.push(row);
          linesByDeckId.set(key, bucket);
        }

        const userDecks: MtgDeck[] = (deckModels || []).map((deckLike) => {
          const id = String(deckLike.id);
          const lines = linesByDeckId.get(id) || [];
          const asRow = {
            id: deckLike.id,
            setId: deckLike.setId,
            name: deckLike.name,
            notes: deckLike.notes || '',
            coverCardId: deckLike.coverCardId || '',
            tags: Array.isArray(deckLike.tags) ? deckLike.tags : [],
            createdAt: deckLike.createdAt || new Date().toISOString()
          } as DeckRow;
          return mapRowToDeck(asRow, lines);
        });

        const cardSource$ =
          cardModels.length > 0
            ? of(cardModels)
            : this.scryfallService.getCardsBySet(setInfo.code.toLowerCase()).pipe(
                map((apiCards) => apiCards.map((apiCard) => mapScryfallToCard(apiCard, setId, '')))
              );

        return cardSource$.pipe(
          map((finalCards) => ({
            setInfo,
            cards: finalCards,
            decks: userDecks,
            loadedAt: new Date().toISOString()
          }))
        );
      })
    );
  }

  private clearInFlight(setId: string): void {
    if (this.inFlightSetId === setId) {
      this.inFlightSetId = null;
      this.inFlightLoad$ = null;
    }
  }

  /** Installs a set: persist metadata, download Arena-only card art, bulk-insert cards. */
  public install(scryfallSet: ScryfallSet): Observable<MtgSet> {
    const cleanCode = scryfallSet.code.toLowerCase();

    const domainSet: MtgSet = mapScryfallToDomainSet(scryfallSet);

    return this.dataWire.insert<MtgSet, MtgSet>(sets, domainSet).pipe(
      switchMap(() => this.scryfallService.getCardsBySet(cleanCode)),

      switchMap((scryfallCards: ScryfallCard[]) => {
        // Arena-only strip: skip cards without arena_id
        const arenaOnlyCards = scryfallCards.filter(card => card.arena_id != null);

        return from(arenaOnlyCards).pipe(
          concatMap((apiCard: ScryfallCard) => {
            const frameUrl = apiCard.normalArtworkUrl;
            const cropUrl = apiCard.illustrationArtworkUrl;
            const arenaId = apiCard.arena_id!;

            if (!frameUrl && !cropUrl) {
              return of(mapScryfallToCard(apiCard, domainSet.id, '', ''));
            }

            return forkJoin({
              frame: this.downloadCardAsset(frameUrl, this.getCardArtPath(cleanCode, arenaId)),
              crop: this.downloadCardAsset(cropUrl, this.getCardIllustrationPath(cleanCode, arenaId))
            }).pipe(
              map(({ frame, crop }) => mapScryfallToCard(apiCard, domainSet.id, frame, crop))
            );
          }),
          toArray()
        );
      }),

      switchMap((domainCards: MtgCard[]) => {
        return this.dataWire.insertBulk<MtgCard, MtgCard>(cards, domainCards);
      }),

      tap(() => {
        const currentList = this.installedSetsSubject.getValue();
        if (!currentList.some(s => s.id === domainSet.id)) {
          this.installedSetsSubject.next([...currentList, domainSet]);
        }
        this.loadSetWorkspace(domainSet.id);
      }),
      map(() => domainSet),
      catchError((err) => {
        console.error(`[SetService] Atomic install pipeline aborted for set ${scryfallSet.code}:`, err?.message || err);
        return throwError(() => err);
      })
    );
  }

  /** Removes a set row and its on-disk art folder; clears workspace if that set was active. */
  public uninstall(set: MtgSet): Observable<void> {
    return this.dataWire.delete(sets, set.id).pipe(
      concatMap(() => {
        const targetArtFolder = this.getSetDirectoryPath(set.code);
        return this.fileService.deleteDirectory(targetArtFolder);
      }),

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

  /** Disk folder for a set's cached card art. */
  public getSetDirectoryPath(setCode: string): string {
    return `cached_art/${setCode.toLowerCase()}`;
  }

  public getSetCoverArtPath(setCode: string): string {
    return `${this.getSetDirectoryPath(setCode)}/cover.jpg`;
  }

  public getCardArtPath(setCode: string, arenaId: number): string {
    return `${this.getSetDirectoryPath(setCode)}/${arenaId}.png`;
  }

  public getCardIllustrationPath(setCode: string, arenaId: number): string {
    return `${this.getSetDirectoryPath(setCode)}/${arenaId}-art.jpg`;
  }

  /** Resolves a WebView-safe URI for the set cover, with a packaged fallback. */
  public getSetCoverWebViewUri(setCode: string): Observable<string> {
    const targetPath = this.getSetCoverArtPath(setCode);

    return this.fileService.resolvePlatformWebViewUri(targetPath).pipe(
      catchError(() => {
        return of('');
      })
    );
  }

  public triggerCardAssetDownload(url: string, setCode: string, arenaId: number): Observable<string> {
    return this.downloadCardAsset(url, this.getCardArtPath(setCode, arenaId));
  }

  public triggerIllustrationAssetDownload(url: string, setCode: string, arenaId: number): Observable<string> {
    return this.downloadCardAsset(url, this.getCardIllustrationPath(setCode, arenaId));
  }

  private downloadCardAsset(url: string, destinationPath: string): Observable<string> {
    if (!url) {
      return of('');
    }

    return this.fileService.downloadRemoteUrlToDisk(url, destinationPath).pipe(
      catchError(() => of(url))
    );
  }

  public triggerCoverAssetDownload(remoteServerUrl: string, setCode: string): Observable<string> {
    const destinationPath = this.getSetCoverArtPath(setCode);
    const fullRemoteUrl = `${remoteServerUrl}/api/assets/covers/${setCode.toLowerCase()}.jpg`;

    return this.fileService.downloadRemoteUrlToDisk(fullRemoteUrl, destinationPath).pipe(
      catchError(() => of(''))
    );
  }

  /** Inserts or replaces a deck in the live workspace cache (used after create). */
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

  /** Updates one deck in the in-memory workspace without a disk reload. */
  public updateDeckInWorkspaceMemory(updatedDeck: MtgDeck): void {
    this.upsertDeckInWorkspaceMemory(updatedDeck);
    console.log(`[SetService] Workspace memory cache updated locally for deck: ${updatedDeck.name}`);
  }

  /** Persists active set metadata to SQLite. */
  public flush(): Observable<void> {
    const current = this.currentWorkspaceSnapshot;
    if (!current) return of(void 0);

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
    this.workspaceSubscription?.unsubscribe();
    this.inFlightSetId = null;
    this.inFlightLoad$ = null;
    this.activeContextSubject.next(null);
  }

  public ngOnDestroy(): void {
    this.rosterSubscription?.unsubscribe();
    this.workspaceSubscription?.unsubscribe();
  }
}
