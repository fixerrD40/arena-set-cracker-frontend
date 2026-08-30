import { MtgCard } from '../card/card';
import { subtypesOnTypeLine } from '../card/type-line';
import { foldPlurals, tokenizeNormalizedText } from './oracle-diction';
import { flattenOracleCard } from './oracle-parser';

export function discoveryTypeTokens(typeLine: string): string[] {
  const subtypeText = subtypesOnTypeLine(typeLine).join(' ');
  if (!subtypeText.trim()) {
    return [];
  }
  return foldPlurals(tokenizeNormalizedText(subtypeText));
}

/** Parsed oracle only — trigger subjects, condition subjects, leaf effects. */
export function discoveryOracleChunks(card: MtgCard): string[][] {
  const { triggers, conditions, effects } = flattenOracleCard(card);
  const chunks: string[][] = [];

  for (const rawText of [...triggers, ...conditions, ...effects]) {
    const normalized = foldPlurals(tokenizeNormalizedText(rawText));
    if (normalized.length > 0) {
      chunks.push(normalized);
    }
  }

  return chunks;
}

/** Subtype tokens as their own chunk — disjoint from oracle ngrams. */
export function discoveryTypeChunk(card: MtgCard): string[] {
  return discoveryTypeTokens(card.typeLine);
}

/** Separate oracle and type chunks; never prefix types onto oracle text. */
export function discoveryTextChunks(card: MtgCard): string[][] {
  const chunks = discoveryOracleChunks(card);
  const typeChunk = discoveryTypeChunk(card);
  if (typeChunk.length > 0) {
    chunks.push(typeChunk);
  }
  return chunks;
}

/** Oracle tokens for multi-word pattern matching. */
export function patternHaystackTokens(card: MtgCard): string[] {
  return discoveryOracleChunks(card).flat();
}

export function cardHasDiscoveryTypeToken(card: MtgCard, token: string): boolean {
  const needle = token.toLowerCase();
  return discoveryTypeTokens(card.typeLine).includes(needle);
}
