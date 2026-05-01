import { DBSchema } from "idb";

export interface FisioFlowDB extends DBSchema {
  /** Stores cached patient analytics data */
  patient_analytics: {
    key: string;
    value: {
      patientId: string;
      data: unknown;
      timestamp: number;
      version: number;
    };
    indexes: { "by-timestamp": number };
  };
  /** Stores queued offline actions for sync */
  offline_actions: {
    key: string;
    value: {
      id: string;
      action: string;
      payload: unknown;
      timestamp: number;
      synced: boolean;
      retryCount: number;
    };
    indexes: { "by-synced": boolean; "by-timestamp": number };
  };
  /** Stores temporary session data with expiration */
  session_cache: {
    key: string;
    value: {
      sessionId: string;
      data: unknown;
      timestamp: number;
      expiresAt: number;
    };
    indexes: { "by-expires": number };
  };
  /** Stores cached patients for offline access */
  patients: {
    key: string;
    value: unknown;
    indexes: { "by-name": string };
  };
  /** Stores cached appointments for offline access */
  appointments: {
    key: string;
    value: unknown;
    indexes: { "by-startTime": string; "by-patientId": string };
  };
  /** Stores cached exercises for offline access */
  exercises: {
    key: string;
    value: unknown;
    indexes: { "by-category": string };
  };
}

export interface OfflineStorageOptions {
  /** Database name (default: 'FisioFlowOffline') */
  dbName?: string;
  /** Database version for migrations (default: 2) */
  dbVersion?: number;
  /** Cache expiration time in milliseconds (default: 24 hours) */
  cacheExpiryMs?: number;
  /** Maximum retry attempts for failed actions (default: 3) */
  maxRetryAttempts?: number;
}

export interface SyncResult {
  /** Number of successfully synced actions */
  successful: number;
  /** Number of failed sync actions */
  failed: number;
  /** Number of skipped actions */
  skipped: number;
}

export interface StorageQuota {
  /** Current usage in bytes */
  usage: number;
  /** Total quota in bytes */
  quota: number;
  /** Usage percentage (0-100) */
  usagePercentage: number;
}

export interface ConnectionStatus {
  /** Whether currently online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending actions */
  pendingActions: number;
}

export const OFFLINE_ACTION_TYPES = {
  CREATE_SESSION_METRICS: "CREATE_SESSION_METRICS",
  UPDATE_GOAL: "UPDATE_GOAL",
  CREATE_EVOLUTION: "CREATE_EVOLUTION",
  UPDATE_RISK_SCORE: "UPDATE_RISK_SCORE",
  UPDATE_PATIENT: "UPDATE_PATIENT",
  CREATE_APPOINTMENT: "CREATE_APPOINTMENT",
} as const;

export type OfflineActionType = keyof typeof OFFLINE_ACTION_TYPES;
