import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { combineLatest, map } from 'rxjs';
import { DeckStoreService } from '../../../services/deck-store-service';
import { CardStoreService } from '../../../services/card-store-service';
import { Color, ColorDisplayNames } from '../../../models/color';
import { ScryfallCard } from '../../../models/scryfall-card.model';
import { Deck } from '../../../models/deck';

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
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './set-detail.html',
  styleUrls: ['./set-detail.css'],
})
export class SetDetail implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public Math = Math;
  private deckStore = inject(DeckStoreService);
  private cardStore = inject(CardStoreService);

  allAggregatedCards: AggregatedCard[] = [];
  filteredCards: AggregatedCard[] = [];

  pageSize = 20;
  currentPage = 0;
  searchTerm = '';

  // New arrays to hold cards by utilization
  underutilizedCards: AggregatedCard[] = [];
  overutilizedCards: AggregatedCard[] = [];

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
    combineLatest([this.deckStore.decks$, this.cardStore.getCurrentSetCards()])
      .pipe(map(([decks, cards]) => this.aggregateCards(decks, cards)))
      .subscribe((aggregated) => {
        this.allAggregatedCards = aggregated.sort((a, b) => b.quantity - a.quantity);
        this.applyFilterAndPage();
      });
  }

  getColorName(code: string): string {
    return ColorDisplayNames[code as Color];
  }

  private aggregateCards(decks: Deck[], cards: ScryfallCard[]): AggregatedCard[] {
    const cardUsageMap = new Map<string, AggregatedCard>();

    for (const card of cards) {
      cardUsageMap.set(card.name, {
        name: card.name,
        quantity: 0,
        typeLine: card.type_line,
        colors: card.colors ?? [],
        rarity: card.rarity ?? 'common',
        mana_cost: card.mana_cost,
        image: card.image_uris?.small,
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

  toggleFilter(category: keyof typeof this.filters, option: string): void {
    const states = this.filters[category].states;
    const currentState = states.get(option) ?? TriState.Unselected;
    const nextState = (currentState + 1) % 3;
    states.set(option, nextState);
    this.applyFilterAndPage();
  }

  applyFilterAndPage(): void {
    this.filteredCards = this.allAggregatedCards.filter((card) => {
      if (!this.passesSearch(card)) return false;

      if (
        !this.passesTriStateFilter('colors', card.colors, (o) => card.colors.includes(o))
      )
        return false;
      if (
        !this.passesTriStateFilter('types', this.filters.types.options, (o) => card.typeLine.includes(o))
      )
        return false;
      if (
        !this.passesTriStateFilter('rarities', [card.rarity], (o) => card.rarity === o)
      )
        return false;
      if (
        !this.passesTriStateFilter(
          'costs',
          this.filters.costs.options,
          (o) => o === this.bucketCMC(this.getCMC(card.mana_cost))
        )
      )
        return false;

      return true;
    });

    // Fix page if out of bounds
    const maxPage = Math.max(0, Math.ceil(this.filteredCards.length / this.pageSize) - 1);
    if (this.currentPage > maxPage) this.currentPage = maxPage;

    // NEW: compute under/overutilized cards based on filteredCards
    this.classifyUtilization();

    this.updateChart();
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

  private passesSearch(card: AggregatedCard): boolean {
    return card.name.toLowerCase().includes(this.searchTerm.toLowerCase());
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
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    const pageCards = this.filteredCards.slice(start, end);

    this.barChartData.labels = pageCards.map((c) => c.name);
    this.barChartData.datasets[0].data = pageCards.map((c) => c.quantity);

    this.chart?.update();
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

  onSearchChange(): void {
    this.currentPage = 0;
    this.applyFilterAndPage();
  }

  get hasNextPage(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.filteredCards.length;
  }

  get hasPrevPage(): boolean {
    return this.currentPage > 0;
  }
}