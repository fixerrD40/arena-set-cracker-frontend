import { MtgSet, CloudSetPayload } from './set';
import { SetRow, SetInsert } from '../../../core/sqlite/sqlite.schema';
import { ScryfallSet } from '../../../core/services/api/scryfall/models/set.scryfall';

/**
 * DATABASE INPUT WIRE:
 * Translates a raw SQLite row from disk into your pure application domain structure.
 * 🌟 FIX: Maps iconSvgUri from the database row, and leaves localArtUri empty to be calculated by SetService!
 */
export function mapRowToSet(row: SetRow): MtgSet {
  return {
    id: row.id,
    code: row.code.toUpperCase(), // Enforce clean uppercase layout throughout the client views
    name: row.name,
    iconSvgUri: row.iconSvgUri,    // 🚀 Restored to satisfy compilation
    localArtUri: ''               // 🚀 Initialized empty; dynamic path added via SetService triggers
  };
}

/**
 * NETWORK INPUT WIRE (STANDARD CLOUD API):
 * Translates a raw over-the-wire database JSON payload back into your domain model structure.
 * 🌟 FIX: Captures iconSvgUri from your custom cloud sync payload.
 */
export function mapJsonToSet(payload: CloudSetPayload): MtgSet {
  return {
    id: payload.id,
    code: (payload.code || '').toUpperCase(),
    name: payload.name || 'Unknown Expansion',
    iconSvgUri: payload.iconSvgUri || '', // 🚀 Restored from cloud sync tracking columns
    localArtUri: ''
  };
}

/**
 * NETWORK INPUT WIRE (SCRYFALL REST API):
 * Translates a raw Scryfall REST API payload into your client app's regular MtgSet domain model.
 * 🌟 FIX: Extracts the icon_svg_uri directly out of Scryfall's raw payload context.
 */
export function mapScryfallToDomainSet(apiSet: ScryfallSet): MtgSet {
  return {
    id: apiSet.id,
    code: (apiSet.code || '').toUpperCase().trim(), // Matches your UI uppercase layout rule!
    name: apiSet.name || 'Unknown Expansion',
    iconSvgUri: apiSet.icon_svg_uri || '', // 🚀 Captured right out of Scryfall's meta properties
    localArtUri: ''
  };
}

/**
 * DATABASE OUTPUT WIRE:
 * Serializes your UI model into the exact flat shape your database insertion layer requires.
 * 🌟 FIX: Appends iconSvgUri to satisfy your Drizzle table columns constraint mappings.
 */
export function serializeSetToSqlite(set: MtgSet): SetInsert {
  return {
    id: set.id,
    code: set.code.toLowerCase(), // Normalizes uppercase client tokens to lowercase schemas
    name: set.name,
    iconSvgUri: set.iconSvgUri     // 🚀 Maps down to your SQLite table column record
  };
}

/**
 * NETWORK OUTPUT WIRE:
 * Serializes your UI model into a clean JSON literal dictionary for standard REST API endpoints.
 * 🌟 FIX: Ships iconSvgUri to your cloud database so other synced hardware devices can render the vector icon.
 */
export function serializeSetToJSON(set: MtgSet): CloudSetPayload {
  return {
    id: set.id,
    code: set.code.toUpperCase(), // Keeps casing uniform across servers
    name: set.name,
    iconSvgUri: set.iconSvgUri     // 🚀 Shipped safely over HTTP data lines
  };
}
