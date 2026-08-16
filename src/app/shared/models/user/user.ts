// src/app/shared/models/user/user.ts

/**
 * Pure, decoupled application UI domain model.
 * Reflects your rich application machine configurations, clean of backend tracking keys.
 */
export interface UserProfile {
  displayName: string;
  sessionToken: string | null; // Nullable to natively support local-only offline Electron profiles
  isCloudSynced: boolean;
  lastSyncTimestamp: string | null;
}
