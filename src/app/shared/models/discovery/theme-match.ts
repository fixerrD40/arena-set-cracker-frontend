import { MtgCard } from '../card/card';
import { cardHasDiscoveryTypeToken, patternHaystackTokens } from './discovery-corpus';
import { NUM_TOKEN, phrasePatternTokens, tokenizeOracle } from './oracle-diction';

/** Minimum share of the scoped pool a theme must cover to surface in discovery. */
export const MIN_THEME_POOL_FRACTION = 0.02;

export function minSignificantThemeCards(poolSize: number): number {
  if (poolSize <= 0) {
    return 1;
  }
  return Math.max(3, Math.ceil(poolSize * MIN_THEME_POOL_FRACTION));
}

export function isSignificantThemeMatch(cardCount: number, poolSize: number): boolean {
  return cardCount >= minSignificantThemeCards(poolSize);
}

/** Deck library / attached themes: name, full type line, raw oracle. */
export function discoveryHaystackTokens(card: MtgCard): string[] {
  return tokenizeOracle(`${card.name} ${card.typeLine} ${card.oracleText}`);
}

function patternMatchHaystack(card: MtgCard): string[] {
  return patternHaystackTokens(card);
}

function tokenMatchesPattern(token: string, pattern: string): boolean {
  if (pattern === NUM_TOKEN) {
    return token === NUM_TOKEN || /^\d+$/.test(token);
  }
  if (pattern === '*') {
    return true;
  }
  return token === pattern;
}

export function tokensMatchPattern(haystack: readonly string[], pattern: readonly string[]): boolean {
  if (pattern.length === 0) {
    return true;
  }
  if (haystack.length < pattern.length) {
    return false;
  }

  for (let start = 0; start <= haystack.length - pattern.length; start++) {
    let matched = true;
    for (let i = 0; i < pattern.length; i++) {
      if (!tokenMatchesPattern(haystack[start + i], pattern[i])) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

export function cardMatchesTheme(card: MtgCard, phrase: string): boolean {
  const pattern = phrasePatternTokens(phrase);
  if (pattern.length === 0) {
    return true;
  }
  return tokensMatchPattern(discoveryHaystackTokens(card), pattern);
}

/** Parsed oracle plus card subtypes — concentration and set-board preview. */
export function cardMatchesOracleTheme(card: MtgCard, phrase: string): boolean {
  const pattern = phrasePatternTokens(phrase);
  if (pattern.length === 0) {
    return true;
  }
  if (pattern.length === 1 && cardHasDiscoveryTypeToken(card, pattern[0])) {
    return true;
  }
  return tokensMatchPattern(patternMatchHaystack(card), pattern);
}

export function cardsMatchingTheme(cards: readonly MtgCard[], phrase: string): MtgCard[] {
  const trimmed = phrase.trim();
  if (!trimmed) {
    return [];
  }
  return cards.filter((card) => cardMatchesTheme(card, trimmed));
}

export function cardsMatchingOracleTheme(cards: readonly MtgCard[], phrase: string): MtgCard[] {
  const trimmed = phrase.trim();
  if (!trimmed) {
    return [];
  }
  return cards.filter((card) => cardMatchesOracleTheme(card, trimmed));
}
