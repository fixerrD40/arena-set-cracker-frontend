// src/app/shared/models/set/set.ts

/**
 * Pure, decoupled application UI domain model.
 * Reflects your rich application expansion states natively with twin asset tracking paths.
 */
export interface MtgSet {
  id: string;
  code: string;       // Unified uppercase formatting throughout client views (e.g., "LTR")
  name: string;
  iconSvgUri: string; // Keeps the official Scryfall vector symbol paths
  localArtUri: string; // Tracks the localized sandboxed cover background binary disk link
}

/**
 * Over-the-wire JSON REST endpoint contract.
 * Cleaned of device-specific filesystem paths and third-party Scryfall URL noise.
 * Mirrors the exact properties your cloud database table actually needs to persist.
 */
export interface CloudSetPayload {
  id: string;
  code: string;       // Unified formatting (e.g., "LTR")
  name: string;
  iconSvgUri: string;
}
