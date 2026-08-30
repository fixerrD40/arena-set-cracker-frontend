export const NUM_TOKEN = '<NUM>';

const RE_NUM = /\b(\d+|x|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\b/gi;

/** Timing and targeting glue still present inside parsed subjects/effects. Longest match wins. */
const GLUE_PHRASES: readonly string[] = [
  'at the beginning of your upkeep',
  'at the beginning of combat',
  'at the beginning of your draw step',
  'at the beginning of',
  'beginning of combat',
  'beginning of upkeep',
  'beginning of draw',
  'beginning of end',
  'until end of turn',
  'end of combat',
  'end of turn',
  'enters the battlefield',
  'leaves the battlefield',
  'from among',
  'target creature or planeswalker',
  'target creature',
  'target permanent',
  'target opponent',
  'target player',
  'target spell',
  'any target',
  'another target',
  'you control'
];

const GLUE_FRAGMENT_PHRASES: readonly string[] = [
  'end of',
  'of turn',
  'at the',
  'the beginning'
];

const GLUE_STOP_SET = buildGlueStopSet();

export function cleanOracleText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s~/+-]/g, ' ');
}

export function normalizeToken(token: string): string {
  return token.replace(RE_NUM, NUM_TOKEN);
}

function glueToken(phrase: string): string {
  return phrase.trim().replace(/\s+/g, '_');
}

function applyGluePhrases(text: string): string {
  let result = ` ${text} `;
  for (const phrase of GLUE_PHRASES) {
    const token = glueToken(phrase);
    result = result.replaceAll(` ${phrase} `, ` ${token} `);
  }
  return result.trim();
}

export function tokenizeNormalizedText(text: string): string[] {
  const cleaned = applyGluePhrases(cleanOracleText(text));
  if (!cleaned.trim()) {
    return [];
  }
  return cleaned.split(/\s+/).filter(Boolean).map(normalizeToken);
}

export function foldPlurals(tokens: readonly string[]): string[] {
  const tokenSet = new Set(tokens);
  const pluralMap = new Map<string, string>();
  for (const token of tokenSet) {
    if (token.endsWith('s') && token.length > 1) {
      const singular = token.slice(0, -1);
      if (tokenSet.has(singular)) {
        pluralMap.set(token, singular);
      }
    }
  }
  return tokens.map((token) => pluralMap.get(token) ?? token);
}

export function tokenizeOracle(text: string): string[] {
  return foldPlurals(tokenizeNormalizedText(text));
}

export function phraseToDisplay(tokens: readonly string[]): string {
  return tokens.map((token) => token.replace(/_/g, ' ')).join(' ');
}

export function normalizePhraseKey(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isGlueStopPhrase(phrase: string): boolean {
  return GLUE_STOP_SET.has(normalizePhraseKey(phrase));
}

export function isStructuralPattern(phrase: string): boolean {
  return isGlueStopPhrase(phrase);
}

export function phrasePatternTokens(phrase: string): string[] {
  return phrase
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((part) => part.split('_').filter(Boolean));
}

function buildGlueStopSet(): Set<string> {
  const stops = new Set<string>();
  for (const phrase of [...GLUE_PHRASES, ...GLUE_FRAGMENT_PHRASES]) {
    stops.add(normalizePhraseKey(phrase));
    stops.add(normalizePhraseKey(glueToken(phrase)));
  }
  return stops;
}
