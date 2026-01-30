/**
 * Migration System - Type Definitions
 *
 * @module lib/migrations/types
 */

/**
 * Migration status in the tracking table
 */
export enum MigrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Database type for migrations
 */
export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  FIRESTORE = 'firestore',
}

/**
 * Migration interface
 *
 * @description
 * All migrations must implement this interface
 */
export interface Migration {
  /** Unique migration ID (e.g., '001_initial_schema', '002_add_indexes') */
  id: string;

  /** Migration name/description */
  name: string;

  /** Database type this migration applies to */
  database: DatabaseType;

  /** SQL to run for UP migration (PostgreSQL only) */
  up?: string;

  /** SQL to run for DOWN migration (PostgreSQL only) */
  down?: string;

  /** Function to run for UP migration (Firestore/complex migrations) */
  upFn?: () => Promise<void>;

  /** Function to run for DOWN migration (Firestore/complex migrations) */
  downFn?: () => Promise<void>;
}

/**
 * Migration record from the tracking table
 */
export interface MigrationRecord {
  id: string;
  name: string;
  database: DatabaseType;
  status: MigrationStatus;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  checksum?: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  migration: string;
  status: MigrationStatus;
  duration: number;
  error?: string;
}

/**
 * Summary of a migration run
 */
export interface MigrationSummary {
  total: number;
  executed: number;
  skipped: number;
  failed: number;
  results: MigrationResult[];
  duration: number;
}
