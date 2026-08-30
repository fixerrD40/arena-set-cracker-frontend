import { NgZone } from '@angular/core';
import { Observable, of } from 'rxjs';

import { WorkspaceState } from '../../core/services/set.service';
import { MtgCard } from '../../shared/models/card/card';
import { compareArenaCollection, ManaColor } from '../../shared/models/card/arena-collection.filter';
import { ConcentratedPattern, scheduleConcentrate } from '../../shared/models/discovery/concentration';
import {
  remainingPoolCards,
  remainingPoolCounts
} from '../../shared/models/discovery/remaining-pool';
import {
  computeSetAssignmentMetrics,
  SetAssignmentMetrics
} from '../../shared/models/discovery/set-assignment-metrics';
import {
  cardsMatchingOracleTheme,
  minSignificantThemeCards
} from '../../shared/models/discovery/theme-match';
import { DECK_STATUSES, DeckStatus, MtgDeck } from '../../shared/models/deck/deck';

export interface SetBoardShell {
  remaining: number;
  total: number;
  scoped: number;
  pool: MtgCard[];
  decksByStatus: Record<DeckStatus, MtgDeck[]>;
  metrics: SetAssignmentMetrics;
}

export interface PatternState {
  patterns: ConcentratedPattern[];
  loading: boolean;
}

export interface ThemePreviewLayout {
  columns: number;
  rows: number;
  pageSize: number;
  rowHeightPx: number;
  rowGapPx: number;
  colGapPx: number;
}

export type ThemePreviewEmptyReason = 'none' | 'no-match' | 'below-threshold';

export interface ThemePreviewState {
  theme: string | null;
  cards: MtgCard[];
  emptyReason: ThemePreviewEmptyReason;
  matchCount: number;
  minRequired: number;
}

export interface ThemePreviewPageView {
  theme: string;
  cards: MtgCard[];
  page: number;
  pageCount: number;
  total: number;
  columns: number;
  rows: number;
  rowHeightPx: number;
  rowGapPx: number;
  colGapPx: number;
  emptyReason: ThemePreviewEmptyReason;
  matchCount: number;
  minRequired: number;
}

export interface DeckThemeDragPayload {
  deckId: string;
  phrase: string;
}

export const DEFAULT_THEME_PREVIEW_LAYOUT: ThemePreviewLayout = {
  columns: 4,
  rows: 2,
  pageSize: 8,
  rowHeightPx: 180,
  rowGapPx: 10.4,
  colGapPx: 13.6
};

export function buildBoardShell(
  workspace: WorkspaceState | null,
  colors: readonly ManaColor[],
  drainNeedsWork: boolean
): SetBoardShell {
  if (!workspace) {
    return emptyBoardShell();
  }

  const pool = remainingPoolCards(workspace.cards, workspace.decks, {
    drainNeedsWork,
    colors
  });
  const counts = remainingPoolCounts(workspace.cards, workspace.decks, {
    drainNeedsWork,
    colors
  });

  return {
    remaining: counts.remaining,
    total: counts.total,
    scoped: counts.scoped,
    pool,
    decksByStatus: groupDecksByStatus(workspace.decks),
    metrics: computeSetAssignmentMetrics(workspace.cards, workspace.decks)
  };
}

export function emptyBoardShell(): SetBoardShell {
  return {
    remaining: 0,
    total: 0,
    scoped: 0,
    pool: [],
    decksByStatus: {
      concept: [],
      'needs-work': [],
      final: []
    },
    metrics: computeSetAssignmentMetrics([], [])
  };
}

export function groupDecksByStatus(decks: readonly MtgDeck[]): Record<DeckStatus, MtgDeck[]> {
  const grouped: Record<DeckStatus, MtgDeck[]> = {
    concept: [],
    'needs-work': [],
    final: []
  };
  for (const deck of decks) {
    grouped[deck.status].push(deck);
  }
  for (const status of DECK_STATUSES) {
    grouped[status].sort((a, b) => a.name.localeCompare(b.name));
  }
  return grouped;
}

export function isDeckDragData(data: unknown): data is MtgDeck {
  return !!data && typeof data === 'object' && 'id' in data && 'status' in data;
}

export function buildThemePreviewState(pool: readonly MtgCard[], theme: string | null): ThemePreviewState {
  if (!theme) {
    return { theme: null, cards: [], emptyReason: 'none', matchCount: 0, minRequired: 0 };
  }

  const matches = cardsMatchingOracleTheme(pool, theme).sort(compareArenaCollection);
  const minRequired = minSignificantThemeCards(pool.length);
  if (matches.length >= minRequired) {
    return { theme, cards: matches, emptyReason: 'none', matchCount: matches.length, minRequired };
  }
  if (matches.length === 0) {
    return { theme, cards: [], emptyReason: 'no-match', matchCount: 0, minRequired };
  }
  return {
    theme,
    cards: [],
    emptyReason: 'below-threshold',
    matchCount: matches.length,
    minRequired
  };
}

export function buildThemePreviewPageView(
  preview: ThemePreviewState,
  page: number,
  layout: ThemePreviewLayout
): ThemePreviewPageView | null {
  if (!preview.theme) {
    return null;
  }

  const pageCount = Math.max(1, Math.ceil(preview.cards.length / layout.pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * layout.pageSize;

  return {
    theme: preview.theme,
    cards: preview.cards.slice(start, start + layout.pageSize),
    page: safePage,
    pageCount,
    total: preview.cards.length,
    columns: layout.columns,
    rows: layout.rows,
    rowHeightPx: layout.rowHeightPx,
    rowGapPx: layout.rowGapPx,
    colGapPx: layout.colGapPx,
    emptyReason: preview.emptyReason,
    matchCount: preview.matchCount,
    minRequired: preview.minRequired
  };
}

export function computeThemePreviewLayout(stage: HTMLElement): ThemePreviewLayout {
  const navWidth = 64;
  const gridWidth = Math.max(0, stage.clientWidth - navWidth);
  const gridHeight = Math.max(0, stage.clientHeight);

  let columns = 4;
  if (gridWidth < 480) {
    columns = 2;
  } else if (gridWidth < 720) {
    columns = 3;
  }

  const colGapPx = 13.6;
  const rowGapPx = 10.4;
  const cellWidth = (gridWidth - colGapPx * Math.max(0, columns - 1)) / Math.max(columns, 1);
  const widthBasedRowHeight = cellWidth * (680 / 488);
  const twoRowAtFullHeight = widthBasedRowHeight * 2 + rowGapPx;

  let rows = 1;
  if (gridHeight >= twoRowAtFullHeight * 0.92) {
    rows = 2;
  } else if (gridHeight >= widthBasedRowHeight * 1.45 + rowGapPx) {
    rows = 2;
  }

  const rowBudget = gridHeight - rowGapPx * Math.max(0, rows - 1);
  const maxRowHeight = Math.max(72, rowBudget / Math.max(rows, 1));
  const rowHeightPx = Math.min(widthBasedRowHeight, maxRowHeight);

  return {
    columns,
    rows,
    pageSize: columns * rows,
    rowHeightPx: Math.round(rowHeightPx),
    rowGapPx,
    colGapPx
  };
}

export function dragClientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches[0] || event.changedTouches[0];
  return { x: touch.clientX, y: touch.clientY };
}

export function discoverPatterns(pool: readonly MtgCard[], ngZone: NgZone): Observable<PatternState> {
  if (pool.length === 0) {
    return of({ patterns: [], loading: false });
  }

  return new Observable<PatternState>((subscriber) => {
    subscriber.next({ patterns: [], loading: true });

    ngZone.runOutsideAngular(() => {
      void scheduleConcentrate(pool).then((patterns) => {
        ngZone.run(() => {
          subscriber.next({ patterns, loading: false });
          subscriber.complete();
        });
      });
    });
  });
}
