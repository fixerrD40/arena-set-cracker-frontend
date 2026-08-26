import { SystemConfigRow, SystemConfigInsert } from '../../../core/sqlite/sqlite.schema';
import { UserProfile } from './user';

export function mapRowToProfile(row: SystemConfigRow): UserProfile {
  return {
    displayName: row.displayName,
    sessionToken: row.sessionToken,
    isCloudSynced: row.isCloudSynced,
    lastSyncTimestamp: row.lastSyncTimestamp
  };
}

/** Always writes the singleton config row id. */
export function mapProfileToInsert(profile: UserProfile): SystemConfigInsert {
  return {
    id: 'active_user',
    displayName: profile.displayName,
    sessionToken: profile.sessionToken,
    isCloudSynced: profile.isCloudSynced,
    lastSyncTimestamp: profile.lastSyncTimestamp
  };
}
