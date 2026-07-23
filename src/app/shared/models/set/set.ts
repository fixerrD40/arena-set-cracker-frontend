// src/app/shared/models/set/set.ts

/**
 * Idiomatic Domain Interface
 * Reflects your rich application UI state, clean of database audit columns.
 */
export interface MtgSet {
  id: string;
  code: string; // Unified uppercase formatting throughout the client views
  name: string;
}

/**
 * Cloud Payload Interface
 * Reflects an incoming over-the-wire raw JSON REST/Scryfall endpoint response.
 */
export interface CloudSetPayload {
  id: string;
  code: string;
  name: string;
  uri?: string;
  search_uri?: string;
}
