// src/app/shared/models/user/user.mappers.ts
import { SystemConfigRow, SystemConfigInsert } from '../../../core/sqlite/sqlite.schema'; // Adjust to your schema file location
import { UserProfile } from './user';

/**
 * DATABASE INPUT WIRE:
 * Translates a raw SQLite config row read from disk into your pure application domain structure.
 */
export function mapRowToProfile(row: SystemConfigRow): UserProfile {
  return {
    displayName: row.displayName,
    sessionToken: row.sessionToken,
    isCloudSynced: row.isCloudSynced,
    lastSyncTimestamp: row.lastSyncTimestamp
  };
}

/**
 * DATABASE OUTPUT WIRE:
 * Serializes your core domain profile model into the flat schema layout your Drizzle database write layer requires.
 */
export function mapProfileToInsert(profile: UserProfile): SystemConfigInsert {
  return {
    id: 'active_user', // Enforces our singleton constraint directly at serialization time
    displayName: profile.displayName,
    sessionToken: profile.sessionToken,
    isCloudSynced: profile.isCloudSynced,
    lastSyncTimestamp: profile.lastSyncTimestamp
  };
}
