// src/app/shared/models/set/set.mappers.ts
import { MtgSet, CloudSetPayload } from './set';
import { SetRow, SetInsert } from '../../../core/sqlite/sqlite.schema';
import { ScryfallSet } from '../../../core/services/api/scryfall/models/set.scryfall';

/**
 * DATABASE INPUT WIRE:
 * Translates a raw SQLite row from disk into your pure application domain structure.
 */
export function mapRowToSet(row: SetRow): MtgSet {
  return {
    id: row.id,
    code: row.code.toUpperCase(), // Enforce clean uppercase layout throughout the client views
    name: row.name
  };
}

/**
 * NETWORK INPUT WIRE (STANDARD CLOUD API):
 * Translates a raw over-the-wire database JSON payload back into your domain model structure.
 */
export function mapJsonToSet(payload: CloudSetPayload): MtgSet {
  return {
    id: payload.id,
    code: (payload.code || '').toUpperCase(),
    name: payload.name || 'Unknown Expansion'
  };
}

/**
 * 🌟 ADD THIS NEW HELPER FUNCTION:
 * Translates a raw Scryfall REST API payload into your client app's regular MtgSet domain model.
 */
export function mapScryfallToDomainSet(apiSet: ScryfallSet): MtgSet {
  return {
    id: apiSet.id,
    code: (apiSet.code || '').toUpperCase().trim(), // Matches your UI uppercase layout rule!
    name: apiSet.name || 'Unknown Expansion'
  };
}

/**
 * DATABASE OUTPUT WIRE:
 * Serializes your UI model into the exact flat shape your database insertion layer requires.
 */
export function serializeSetToSqlite(set: MtgSet): SetInsert {
  return {
    id: set.id,
    code: set.code.toLowerCase(), // Normalizes uppercase client tokens to lowercase schemas
    name: set.name
  };
}

/**
 * NETWORK OUTPUT WIRE:
 * Serializes your UI model into a clean JSON literal dictionary for standard REST API endpoints.
 */
export function serializeSetToJSON(set: MtgSet): CloudSetPayload {
  return {
    id: set.id,
    code: set.code.toLowerCase(),
    name: set.name
  };
}
