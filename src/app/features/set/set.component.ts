import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, map, tap } from 'rxjs';

import { SetChartComponent } from './set-chart.component';
import { MtgCard } from '../../shared/models/card/card';
import { Color, ColorDisplayNames } from '../../shared/models/color';
import { MtgDeck } from '../../shared/models/deck/deck';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { SetService } from '../../core/services/set.service';

export enum TriState {
  Unselected = 0,
  Include = 1,
  Exclude = 2,
}

export interface AggregatedCard extends MtgCard {
  quantity: number;
}

interface FilterCategory {
  options: string[];
  states: Map<string, TriState>;
}

@Component({
  selector: 'app-set-component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatChipsModule, MatIconModule, MatButtonModule, NgxTippyModule, SetChartComponent],
  templateUrl: './set.html',
  styleUrls: ['./set.css']
})
export class SetComponent implements OnInit {
  readonly TriState = TriState;
  public Math = Math;

  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  public readonly workspace$ = this.setService.activeContext$;

  public allAggregatedCards: AggregatedCard[] = [];
  public filteredCards: AggregatedCard[] = [];
  public underutilizedCards: AggregatedCard[] = [];
  public overutilizedCards: AggregatedCard[] = [];

  public pageSize = 20;
  public currentPage = 0;

  private readonly searchTermSubject = new BehaviorSubject<string>('');
  private readonly filterTriggerSubject = new BehaviorSubject<void>(undefined);

  public set searchTerm(value: string) { this.searchTermSubject.next(value); }
  public get searchTerm(): string { return this.searchTermSubject.getValue(); }

  public filters: Record<string, FilterCategory> = {
    colors: { options: Object.values(Color), states: new Map() },
    types: {
      options: ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'],
      states: new Map(),
    },
    rarities: { options: ['common', 'uncommon', 'rare', 'mythic'], states: new Map() },
    costs: { options: ['1', '2', '3', '4', '5', '6+'], states: new Map() },
  };

  public barChartData = { labels: [] as string[], datasets: [{ data: [] as number[] }] };

  constructor() {
    for (const categoryKey of Object.keys(this.filters)) {
      const category = this.filters[categoryKey];
      for (const option of category.options) {
        category.states.set(option, TriState.Unselected);
      }
    }
  }

  public ngOnInit(): void {
    combineLatest({
      workspace: this.setService.activeContext$,
      searchTerm: this.searchTermSubject.asObservable(),
      filterEvent: this.filterTriggerSubject.asObservable()
    }).pipe(
      map(({ workspace, searchTerm }) => {
        if (!workspace) return { sortedAggregated: [], searchTerm };

        const aggregated = this.aggregateCards(workspace.decks, workspace.cards);
        const sortedAggregated = aggregated.sort((a, b) => b.quantity - a.quantity);

        return { sortedAggregated, searchTerm };
      }),
      tap(({ sortedAggregated, searchTerm }) => {
        this.allAggregatedCards = sortedAggregated;
        this.filteredCards = this.executeFiltering(this.allAggregatedCards, searchTerm);

        const maxPage = Math.max(0, Math.ceil(this.filteredCards.length / this.pageSize) - 1);
        if (this.currentPage > maxPage) {
          this.currentPage = maxPage;
        }

        this.classifyUtilization();
        this.updateChart();
      })
    ).subscribe();
  }

  getColorName(code: string): string {
    return ColorDisplayNames[code as Color];
  }

  /** Sums deck quantities onto each catalog card (keyed by name, with id fallback). */
  private aggregateCards(decks: MtgDeck[], cards: MtgCard[]): AggregatedCard[] {
    const cardUsageMap = new Map<string, AggregatedCard>();

    for (const card of cards) {
      cardUsageMap.set(card.name, {
        ...card,
        quantity: 0
      });
    }

    for (const deck of decks) {
      deck.cards.forEach((quantity, cardIdentifier) => {
        const match = cardUsageMap.get(cardIdentifier) ||
                      Array.from(cardUsageMap.values()).find(entry => entry.id === cardIdentifier);

        if (match) {
          match.quantity += quantity;
        }
      });
    }

    return Array.from(cardUsageMap.values());
  }

  private executeFiltering(aggregatedCards: AggregatedCard[], activeSearch: string): AggregatedCard[] {
    const cleanSearch = activeSearch.trim().toLowerCase();

    return aggregatedCards.filter((card) => {
      if (cleanSearch && !card.name.toLowerCase().includes(cleanSearch)) {
        return false;
      }

      if (!this.passesTriStateFilter('colors', (option) => card.colors.includes(option))) {
        return false;
      }
      if (!this.passesTriStateFilter('types', (option) => card.typeLine.includes(option))) {
        return false;
      }
      if (!this.passesTriStateFilter('rarities', (option) => card.rarity === option)) {
        return false;
      }
      if (!this.passesTriStateFilter('costs', (option) => {
        const computedCmc = this.getCMC(card.manaCost);
        return option === this.bucketCMC(computedCmc);
      })) {
        return false;
      }

      return true;
    });
  }

  /** Cycles Unselected → Include → Exclude, then refilters. */
  public toggleFilter(categoryKey: keyof typeof this.filters, option: string): void {
    const category = this.filters[categoryKey];
    if (!category) return;

    const current = category.states.get(option) ?? TriState.Unselected;
    const nextState = (current + 1) % 3 as TriState;
    category.states.set(option, nextState);
    this.filterTriggerSubject.next();
  }

  private getQuantiles(numbers: number[]) {
    if (numbers.length === 0) return { q1: 0, median: 0, q3: 0 };
    const sorted = numbers.slice().sort((a, b) => a - b);
    const n = sorted.length;

    function percentile(p: number): number {
      const rank = p * (n - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      if (lower === upper) return sorted[lower];
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
    }

    return {
      q1: percentile(0.25),
      median: percentile(0.5),
      q3: percentile(0.75),
    };
  }

  /** Classifies cards by rarity: fixed thresholds for mythic/common, median for others. */
  private classifyUtilization(): void {
    const cardsByRarity = new Map<string, AggregatedCard[]>();
    for (const card of this.filteredCards) {
      if (!cardsByRarity.has(card.rarity)) cardsByRarity.set(card.rarity, []);
      cardsByRarity.get(card.rarity)!.push(card);
    }

    this.underutilizedCards = [];
    this.overutilizedCards = [];

    cardsByRarity.forEach((cards, rarity) => {
      const quantities = cards.map((c) => c.quantity);
      const { median } = this.getQuantiles(quantities);

      // TODO: haha this is garbage fix it

      cards.forEach((card) => {
        let utilization: 'underutilized' | 'standard' | 'overutilized' = 'standard';

        if (rarity === 'mythic') {
          if (card.quantity < 1) utilization = 'underutilized';
          else if (card.quantity === 1) utilization = 'standard';
          else utilization = 'overutilized';
        } else if (rarity === 'common') {
          if (card.quantity < 3) utilization = 'underutilized';
          else if (card.quantity === 3 || card.quantity === 4) utilization = 'standard';
          else utilization = 'overutilized';
        } else {
          if (card.quantity < median) utilization = 'underutilized';
          else if (card.quantity > median) utilization = 'overutilized';
          else utilization = 'standard';
        }

        if (utilization === 'underutilized') this.underutilizedCards.push(card);
        else if (utilization === 'overutilized') this.overutilizedCards.push(card);
      });
    });
  }

  /**
   * Tri-state filter: exclude wins; if any Include is set, card must match at least one.
   */
  private passesTriStateFilter(
    categoryKey: keyof typeof this.filters,
    matchesOption: (option: string) => boolean
  ): boolean {
    const states = this.filters[categoryKey].states;

    const included = new Set<string>();
    const excluded = new Set<string>();

    for (const [option, state] of states.entries()) {
      if (state === TriState.Include) included.add(option);
      else if (state === TriState.Exclude) excluded.add(option);
    }

    if (included.size === 0 && excluded.size === 0) return true;

    for (const option of excluded) {
      if (matchesOption(option)) return false;
    }

    if (included.size > 0) {
      const satisfiesAtLeastOne = Array.from(included).some(option => matchesOption(option));
      if (!satisfiesAtLeastOne) return false;
    }

    return true;
  }

  private getCMC(manaCost?: string): number {
    if (!manaCost) return 0;
    const manaSymbols = manaCost.match(/\{([^}]+)\}/g) ?? [];
    let cmc = 0;

    for (const symbol of manaSymbols) {
      const s = symbol.replace(/[{}]/g, '');
      if (/^\d+$/.test(s)) {
        cmc += parseInt(s, 10);
      } else if (s === 'X') {
        cmc += 0;
      } else {
        cmc += 1;
      }
    }
    return cmc;
  }

  private bucketCMC(cmc: number): string {
    return cmc >= 6 ? '6+' : cmc.toString();
  }

  updateChart(): void {
    const baseDataset = this.barChartData?.datasets?.[0] ?? {
      label: 'Card Utilization',
      backgroundColor: 'rgba(75,192,192,0.6)',
      borderColor: 'rgba(75,192,192,1)',
      borderWidth: 1,
    };

    if (!this.filteredCards || this.filteredCards.length === 0) {
      this.barChartData = {
        labels: [],
        datasets: [{ ...baseDataset, data: [] }]
      };
      return;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    const pageCards = this.filteredCards.slice(start, end);

    this.barChartData = {
      labels: pageCards.map((c) => c.name),
      datasets: [
        {
          ...baseDataset,
          data: pageCards.map((c) => c.quantity)
        }
      ]
    };
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.updateChart();
    }
  }

  prevPage(): void {
    if (this.hasPrevPage) {
      this.currentPage--;
      this.updateChart();
    }
  }

  resetPage(): void {
    this.currentPage = 0;
    this.updateChart();
  }

  get hasNextPage(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.filteredCards.length;
  }

  get hasPrevPage(): boolean {
    return this.currentPage > 0;
  }

  public deckCardCount(deck: MtgDeck): number {
    let total = 0;
    deck.cards.forEach((qty) => {
      total += qty;
    });
    return total;
  }

  public goToAddDeck(): void {
    this.router.navigate(['/add-deck']);
  }

  public openDeck(deckId: string): void {
    this.router.navigate(['/deck', deckId]);
  }
}
