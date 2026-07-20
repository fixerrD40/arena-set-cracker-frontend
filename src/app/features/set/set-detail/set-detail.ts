import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

import { SetDetailChartComponent } from './set-detail-chart.component';
import { CardService } from '../../../core/services/card.service';
import { DeckService } from '../../../core/services/deck.service';
import { MtgCard } from '../../../shared/models/card';
import { Color, ColorDisplayNames } from '../../../shared/models/color';
import { MtgDeck } from '../../../shared/models/deck';

enum TriState {
  Unselected = 0,
  Include = 1,
  Exclude = 2,
}

interface AggregatedCard {
  name: string;
  quantity: number;
  typeLine: string;
  colors: string[];
  rarity: string;
  mana_cost?: string;
  image?: string;
}

interface FilterCategory {
  options: string[];
  states: Map<string, TriState>;
}

@Component({
  selector: 'app-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SetDetailChartComponent],
  templateUrl: './set-detail.html',
  styleUrls: ['./set-detail.css'],
})
export class SetDetail implements OnInit {
  readonly TriState = TriState;

  public Math = Math;
  private deckService = inject(DeckService);
  private cardService = inject(CardService);

  // Core Data Cache Matrix Arrays
  allAggregatedCards: AggregatedCard[] = [];
  filteredCards: AggregatedCard[] = [];
  underutilizedCards: AggregatedCard[] = [];
  overutilizedCards: AggregatedCard[] = [];

  pageSize = 20;
  currentPage = 0;

  // 1. Reactive Input Controls Streams
  private searchTermSubject = new BehaviorSubject<string>('');
  private filterTriggerSubject = new BehaviorSubject<void>(undefined);

  set searchTerm(value: string) {
    this.searchTermSubject.next(value);
  }
  get searchTerm(): string {
    return this.searchTermSubject.getValue();
  }

  // 2. Comprehensive Tri-State Filters Matrix Layout
  filters: {
    colors: FilterCategory;
    types: FilterCategory;
    rarities: FilterCategory;
    costs: FilterCategory;
  } = {
    colors: { options: Object.values(Color), states: new Map() },
    types: {
      options: ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'],
      states: new Map(),
    },
    rarities: { options: ['common', 'uncommon', 'rare', 'mythic'], states: new Map() },
    costs: { options: ['1', '2', '3', '4', '5', '6+'], states: new Map() },
  };

  public barChartData = {
    labels: [] as string[],
    datasets: [
      {
        data: [] as number[],
        label: 'Card Utilization',
        backgroundColor: 'rgba(75,192,192,0.6)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
      },
    ],
  };

  public barChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { autoSkip: false, font: { size: 11 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => `Used ${tooltipItem.raw} times`,
        },
      },
    },
  };

  constructor() {
    // Initialize all filter states to Unselected
    for (const categoryKey of Object.keys(this.filters) as (keyof typeof this.filters)[]) {
      const category = this.filters[categoryKey];
      for (const option of category.options) {
        category.states.set(option, TriState.Unselected);
      }
    }
  }

  ngOnInit() {
    combineLatest([
      this.deckService.activeDecks$,
      this.cardService.activeCards$, // Powered by your store-backed service
      this.searchTermSubject,        // Emits on text entry
      this.filterTriggerSubject      // Emits on click events
    ])
    .pipe(
      map(([decks, cards, currentSearch]) => {
        // Step A: Aggregate raw counts when cards or decks alter
        const aggregated = this.aggregateCards(decks, cards);
        this.allAggregatedCards = aggregated.sort((a, b) => b.quantity - a.quantity);

        // Step B: Apply your custom multi-layered filtering loops
        return this.executeFiltering(this.allAggregatedCards, currentSearch);
      })
    )
    .subscribe((processedCards) => {
      this.filteredCards = processedCards;

      // Step C: Inline Page Index Guard Rails (Ported directly from your logic)
      const maxPage = Math.max(0, Math.ceil(this.filteredCards.length / this.pageSize) - 1);
      if (this.currentPage > maxPage) {
        this.currentPage = maxPage;
      }

      // Step D: Trigger downstream metrics calculations automatically
      this.classifyUtilization();
      this.updateChart();
    });
  }

  getColorName(code: string): string {
    return ColorDisplayNames[code as Color];
  }

  // --- Pure Multi-Layered Functional Processing Engines ---

  private aggregateCards(decks: MtgDeck[], cards: MtgCard[]): AggregatedCard[] {
    const cardUsageMap = new Map<string, AggregatedCard>();

    for (const card of cards) {
      cardUsageMap.set(card.name, {
        name: card.name,
        quantity: 0,
        typeLine: card.typeLine,
        colors: card.colors,
        rarity: card.rarity,
        mana_cost: card.manaCost,
        image: card.localArtUri,
      });
    }

    for (const deck of decks) {
      for (const [cardName, quantity] of deck.cards.entries()) {
        const existing = cardUsageMap.get(cardName);
        if (existing) {
          existing.quantity += quantity;
        }
      }
    }

    return Array.from(cardUsageMap.values());
  }

  /**
   * Extracted Filtering Pipeline utilizing your native matching patterns
   */
  private executeFiltering(cards: AggregatedCard[], activeSearch: string): AggregatedCard[] {
    return cards.filter((card) => {
      // Functional local search match pass
      if (activeSearch && !card.name.toLowerCase().includes(activeSearch.toLowerCase())) {
        return false;
      }

      // Your exact predicate matching methods running safely inside the array loop
      if (!this.passesTriStateFilter('colors', card.colors, (o) => card.colors.includes(o))) {
        return false;
      }
      if (!this.passesTriStateFilter('types', this.filters.types.options, (o) => card.typeLine.includes(o))) {
        return false;
      }
      if (!this.passesTriStateFilter('rarities', [card.rarity], (o) => card.rarity === o)) {
        return false;
      }
      if (!this.passesTriStateFilter('costs', this.filters.costs.options, (o) => o === this.bucketCMC(this.getCMC(card.mana_cost)))) {
        return false;
      }

      return true;
    });
  }

  /**
   * UI Click Handler: Updates the Tri-State map and forces the stream pipeline to re-run
   */
  toggleFilter(categoryKey: keyof typeof this.filters, option: string): void {
    const category = this.filters[categoryKey];
    const current = category.states.get(option) ?? TriState.Unselected;

    const nextState = (current + 1) % 3 as TriState;
    category.states.set(option, nextState);

    // Kick-start the stream calculation chain instantly!
    this.filterTriggerSubject.next();
  }

  // === New helper: compute quantiles (q1, median, q3) robustly ===
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

  // === New: compute thresholds per rarity and classify cards ===
  private classifyUtilization(): void {
    // Group filteredCards by rarity
    const cardsByRarity = new Map<string, AggregatedCard[]>();
    for (const card of this.filteredCards) {
      if (!cardsByRarity.has(card.rarity)) cardsByRarity.set(card.rarity, []);
      cardsByRarity.get(card.rarity)!.push(card);
    }

    // Clear previous arrays
    this.underutilizedCards = [];
    this.overutilizedCards = [];

    // For each rarity group, compute thresholds and classify
    cardsByRarity.forEach((cards, rarity) => {
      const quantities = cards.map((c) => c.quantity);
      const { q1, median, q3 } = this.getQuantiles(quantities);

      // TODO: haha this is garbage fix it

      // We handle this with an override for these two rarities, else generic quartiles

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
          // Use quartile-based thresholds for other rarities
          if (card.quantity < median) utilization = 'underutilized';
          else if (card.quantity > median) utilization = 'overutilized';
          else utilization = 'standard'; // exactly median
        }

        if (utilization === 'underutilized') this.underutilizedCards.push(card);
        else if (utilization === 'overutilized') this.overutilizedCards.push(card);
        // standard cards we do not store separately here
      });
    });
  }

  private passesTriStateFilter(
    category: keyof typeof this.filters,
    optionsToTest: string[],
    matchesOption: (option: string) => boolean
  ): boolean {
    const states = this.filters[category].states;

    const included = new Set<string>();
    const excluded = new Set<string>();

    for (const [option, state] of states.entries()) {
      if (state === TriState.Include) included.add(option);
      else if (state === TriState.Exclude) excluded.add(option);
    }

    if (included.size === 0 && excluded.size === 0) return true;

    for (const option of optionsToTest) {
      if (excluded.has(option) && matchesOption(option)) return false;
    }

    if (included.size > 0) {
      for (const option of optionsToTest) {
        if (included.has(option) && matchesOption(option)) return true;
      }
      return false;
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
    // 1. Grab base dataset reference to preserve styling attributes
    const baseDataset = this.barChartData?.datasets?.[0] ?? {
      label: 'Card Utilization',
      backgroundColor: 'rgba(75,192,192,0.6)',
      borderColor: 'rgba(75,192,192,1)',
      borderWidth: 1,
    };

    // 2. Guard Clause: Safely handle empty data states without erasing configuration properties
    if (!this.filteredCards || this.filteredCards.length === 0) {
      this.barChartData = {
        labels: [],
        datasets: [{ ...baseDataset, data: [] }]
      };
      return;
    }

    // 3. Process current page view slices
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    const pageCards = this.filteredCards.slice(start, end);

    // 4. Update the chart configuration package
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
      this.updateChart(); // Correctly synchronizes the view segment manually on action clicks
    }
  }

  prevPage(): void {
    if (this.hasPrevPage) {
      this.currentPage--;
      this.updateChart(); // Correctly synchronizes the view segment manually on action clicks
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
}
