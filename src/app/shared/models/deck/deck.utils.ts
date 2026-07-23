// src/app/shared/models/deck/deck.utils.ts

/**
 * PURE UTILITY FUNCTION: parseArenaTextToDeckMap
 * Translates a raw copy-pasted MTG Arena text string buffer cleanly into
 * a structured, case-insensitive card assignment dictionary map.
 *
 * Example Arena Input Pattern:
 * "4 Island (LTR) 264" -> Maps cardId "264" or Name to quantity 4.
 */
export function parseArenaTextToDeckMap(textBlob: string): Map<string, number> {
  const cardMap = new Map<string, number>();
  if (!textBlob?.trim()) return cardMap;

  // Split lines, strip whitespace blocks, and discard empty strings
  const lines = textBlob.split('\n').map(line => line.trim()).filter(Boolean);

  // High-reliability regular expression tracking standard MTG Arena exports:
  // ^(\d+)\s+      -> Group 1: Capture digit strings (Quantity)
  // (.+?)\s+       -> Group 2: Capture everything up to the set block (Card Name)
  // \(([A-Z0-9]+)\)\s+ -> Group 3: Capture alpha-numeric expansion keys (Set Code, e.g., LTR)
  // (\d+)$         -> Group 4: Capture digit strings (Collector Number / Arena ID identifier)
  const arenaLineRegex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/;

  for (const line of lines) {
    const match = arenaLineRegex.exec(line);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    const cardIdentifier = match[4]; // Uses the native unique Arena ID token key

    if (isNaN(quantity) || !cardIdentifier) continue;

    // Accumulate values cleanly to prevent line duplicates overriding weights
    const existingQuantity = cardMap.get(cardIdentifier) || 0;
    cardMap.set(cardIdentifier, existingQuantity + quantity);
  }

  return cardMap;
}
