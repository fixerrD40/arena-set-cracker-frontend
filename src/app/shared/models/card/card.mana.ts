/** CMC and mana-cost tokens from Scryfall `{…}` notation. */

export function parseManaPips(manaCost: string): string[] {
  return (manaCost.match(/\{([^}]+)\}/g) ?? []).map((token) => token.slice(1, -1));
}

export function compareByCmcThenName(
  a: { name: string; manaCost: string },
  b: { name: string; manaCost: string }
): number {
  const cmc = getCmc(a.manaCost) - getCmc(b.manaCost);
  return cmc !== 0 ? cmc : a.name.localeCompare(b.name);
}

export function getCmc(manaCost?: string): number {
  if (!manaCost) return 0;
  let cmc = 0;
  for (const pip of parseManaPips(manaCost)) {
    if (/^\d+$/.test(pip)) {
      cmc += parseInt(pip, 10);
    } else if (pip !== 'X') {
      cmc += 1;
    }
  }
  return cmc;
}

export const CMC_BUCKETS = ['1-', '2', '3', '4', '5', '6+'] as const;
export type CmcBucket = (typeof CMC_BUCKETS)[number];

const COLOR_PIP_ASSET: Record<string, string> = {
  W: 'assets/colors/white.png',
  U: 'assets/colors/blue.png',
  B: 'assets/colors/black.png',
  R: 'assets/colors/red.png',
  G: 'assets/colors/green.png'
};

/** WUBRG pips use the set's color assets; numbers and hybrids stay generic. */
export function manaPipAsset(pip: string): string | null {
  return COLOR_PIP_ASSET[pip.toUpperCase()] ?? null;
}

export function cmcBucket(cmc: number): CmcBucket {
  if (cmc <= 1) return '1-';
  if (cmc >= 6) return '6+';
  return String(cmc) as CmcBucket;
}
