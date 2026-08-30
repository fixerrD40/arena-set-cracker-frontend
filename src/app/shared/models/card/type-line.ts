/** Subtype words after the em dash in a type line (e.g. Elf, Druid). */
export function subtypesOnTypeLine(typeLine: string): string[] {
  const dash = typeLine.split(/\s[—–-]\s/);
  if (dash.length < 2) {
    return [];
  }
  return dash[1]
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Title-case type words from the full line — Python cards_transform.types parity. */
export function typesOnTypeLine(typeLine: string): string[] {
  return typeLine
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && isTitleCaseTypeWord(part));
}

function isTitleCaseTypeWord(word: string): boolean {
  return /^[A-Z][a-z]+(?:[''][A-Z][a-z]+)*$/.test(word);
}
