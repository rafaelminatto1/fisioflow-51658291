/**
 * Migration Runner
 *
 * @description
 * Executes and tracks database migrations for both PostgreSQL and Firestore
 *
 * @module lib/migrations/runner
 */

import { getPool } from '../../init';
import { logger } from 'firebase-functions';

  Migration,
  MigrationRecord,
  MigrationResult,
  MigrationStatus,
  MigrationSummary,
  DatabaseType,
} from './types';

const MIGRATIONS_TABLE = 'schema_migrations';

// ============================================================================================
// MIGRATION REGISTRY
// ============================================================================================

/**
 * Registry of all available migrations
 * Add new migrations to this array
 */
const MIGRATIONS: Migration[] = [
  // Add migrations here in order
  // Example:
  // {
  //   id: '001_initial_schema',
  //   name: 'Initial database schema',
  //   database: DatabaseType.POSTGRESQL,
  //   up: `CREATE TABLE IF NOT EXISTS...`,
  //   down: `DROP TABLE IF EXISTS...`,
  // },
];

/**
 * Register a migration
 *
 * @param migration - Migration to register
 */
export function registerMigration(migration: Migration): void {
  MIGRATIONS.push(migration);
  logger.info(`[Migration] Registered: ${migration.id} - ${migration.name}`);
}

/**
 * Get all registered migrations
 *
 * @returns Array of all migrations
 */
export function getAllMigrations(): Migration[] {
  return [...MIGRATIONS].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get a specific migration by ID
 *
 * @param id - Migration ID
 * @returns Migration or undefined
 */
export function getMigration(id: string): Migration | undefined {
  return MIGRATIONS.find(m => m.id === id);
}

// ============================================================================================
// DATABASE OPERATIONS
// ============================================================================================

/**
 * Initialize the migrations tracking table
 */
async function initMigrationsTable(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      database VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error_message TEXT,
      checksum VARCHAR(64),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_${MIGRATIONS_TABLE}_status ON ${MIGRATIONS_TABLE}(status);
    CREATE INDEX IF NOT EXISTS idx_${MIGRATIONS_TABLE}_database ON ${MIGRATIONS_TABLE}(database);
  `);

  logger.info('[Migration] Migrations table initialized');
}

/**
 * Get migration record from database
 * Reserved for future use
 *
 * @param id - Migration ID
 * @returns Migration record or null
 */
export async function getMigrationRecord(id: string): Promise<MigrationRecord | null> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM ${MIGRATIONS_TABLE} WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    database: row.database,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    checksum: row.checksum,
  };
}

/**
 * Insert or update migration record
 *
 * @param record - Migration record to upsert
 */
async function upsertMigrationRecord(record: Partial<MigrationRecord>): Promise<void> {
  const pool = getPool();

  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, name, database, status, started_at, completed_at, error_message, checksum)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       started_at = EXCLUDED.started_at,
       completed_at = EXCLUDED.completed_at,
       error_message = EXCLUDED.error_message,
       updated_at = NOW()
    `,
    [
      record.id,
      record.name,
      record.database,
      record.status,
      record.started_at || null,
      record.completed_at || null,
      record.error_message || null,
      record.checksum || null,
    ]
  );
}

/**
 * Get all completed migrations from database
 *
 * @returns Array of completed migration IDs
 */
async function getCompletedMigrations(): Promise<string[]> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT id FROM ${MIGRATIONS_TABLE} WHERE status = $1 ORDER BY id`,
    [MigrationStatus.COMPLETED]
  );

  return result.rows.map(row => row.id);
}

// ============================================================================================
// MIGRATION EXECUTION
// ============================================================================================

/**
 * Execute a single migration (UP direction)
 *
 * @param migration - Migration to execute
 * @returns Migration result
 */
async function executeMigrationUp(migration: Migration): Promise<MigrationResult> {
  const startTime = Date.now();

  try {
    logger.info(`[Migration] executing UP: ${migration.id} - ${migration.name}`);

    // Update status to running
    await upsertMigrationRecord({
      id: migration.id,
      name: migration.name,
      database: migration.database,
      status: MigrationStatus.RUNNING,
      started_at: new Date(),
    });

    // Execute the migration
    if (migration.database === DatabaseType.POSTGRESQL) {
      if (migration.up) {
        const pool = getPool();
        await pool.query(migration.up);
      } else if (migration.upFn) {
        await migration.upFn();
      } else {
        throw new Error('Migration must have either "up" or "upFn"');
      }
    } else if (migration.database === DatabaseType.FIRESTORE) {
      if (migration.upFn) {
        await migration.upFn();
      } else {
        throw new Error('Firestore migrations must have "upFn"');
      }
    }

    const duration = Date.now() - startTime;

    // Update status to completed
    await upsertMigrationRecord({
      id: migration.id,
      name: migration.name,
      database: migration.database,
      status: MigrationStatus.COMPLETED,
      started_at: new Date(startTime),
      completed_at: new Date(),
    });

    logger.info(`[Migration] completed: ${migration.id} (${duration}ms)`);

    return {
      migration: migration.id,
      status: MigrationStatus.COMPLETED,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[Migration] failed: ${migration.id}`, error);

    // Update status to failed
    await upsertMigrationRecord({
      id: migration.id,
      name: migration.name,
      database: migration.database,
      status: MigrationStatus.FAILED,
      started_at: new Date(startTime),
      error_message: errorMessage,
    });

    return {
      migration: migration.id,
      status: MigrationStatus.FAILED,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Execute a single migration (DOWN direction)
 *
 * @param migrationId - Migration ID to rollback
 * @returns Migration result
 */
async function executeMigrationDown(migrationId: string): Promise<MigrationResult> {
  const startTime = Date.now();

  try {
    const migration = getMigration(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    logger.info(`[Migration] executing DOWN: ${migrationId} - ${migration.name}`);

    // Update status to running
    await upsertMigrationRecord({
      id: migration.id,
      name: migration.name,
      database: migration.database,
      status: MigrationStatus.RUNNING,
      started_at: new Date(),
    });

    // Execute the rollback
    if (migration.database === DatabaseType.POSTGRESQL) {
      if (migration.down) {
        const pool = getPool();
        await pool.query(migration.down);
      } else if (migration.downFn) {
        await migration.downFn();
      } else {
        throw new Error('Migration must have either "down" or "downFn"');
      }
    } else if (migration.database === DatabaseType.FIRESTORE) {
      if (migration.downFn) {
        await migration.downFn();
      } else {
        throw new Error('Firestore migrations must have "downFn"');
      }
    }

    const duration = Date.now() - startTime;

    // Update status to rolled back
    await upsertMigrationRecord({
      id: migration.id,
      name: migration.name,
      database: migration.database,
      status: MigrationStatus.ROLLED_BACK,
      started_at: new Date(startTime),
      completed_at: new Date(),
    });

    logger.info(`[Migration] rolled back: ${migration.id} (${duration}ms)`);

    return {
      migration: migration.id,
      status: MigrationStatus.ROLLED_BACK,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[Migration] rollback failed: ${migrationId}`, error);

    // Update status to failed
    await upsertMigrationRecord({
      id: migrationId,
      name: migrationId,
      database: DatabaseType.POSTGRESQL, // Default
      status: MigrationStatus.FAILED,
      started_at: new Date(startTime),
      error_message: errorMessage,
    });

    return {
      migration: migrationId,
      status: MigrationStatus.FAILED,
      duration,
      error: errorMessage,
    };
  }
}

// ============================================================================================
// PUBLIC API
// ============================================================================================

/**
 * Run all pending migrations
 *
 * @param options - Options for the migration run
 * @returns Migration summary
 */
export async function runMigrations(options: {
  dryRun?: boolean;
  database?: DatabaseType;
} = {}): Promise<MigrationSummary> {
  const startTime = Date.now();

  // Initialize migrations table
  await initMigrationsTable();

  // Get completed migrations
  const completed = await getCompletedMigrations();
  const allMigrations = getAllMigrations();

  // Filter migrations based on options
  let pendingMigrations = allMigrations.filter(
    m => !completed.includes(m.id)
  );

  if (options.database) {
    pendingMigrations = pendingMigrations.filter(
      m => m.database === options.database
    );
  }

  logger.info(`[Migration] Found ${pendingMigrations.length} pending migrations`);

  const results: MigrationResult[] = [];
  let executed = 0;
  let failed = 0;

  for (const migration of pendingMigrations) {
    if (options.dryRun) {
      logger.info(`[Migration] [DRY RUN] Would execute: ${migration.id}`);
      results.push({
        migration: migration.id,
        status: MigrationStatus.PENDING,
        duration: 0,
      });
      continue;
    }

    const result = await executeMigrationUp(migration);
    results.push(result);

    if (result.status === MigrationStatus.COMPLETED) {
      executed++;
    } else if (result.status === MigrationStatus.FAILED) {
      failed++;
      // Stop on first failure
      break;
    }
  }

  const duration = Date.now() - startTime;

  const summary: MigrationSummary = {
    total: pendingMigrations.length,
    executed,
    skipped: pendingMigrations.length - executed - failed,
    failed,
    results,
    duration,
  };

  logger.info(`[Migration] Summary: ${executed}/${pendingMigrations.length} executed (${failed} failed)`);

  return summary;
}

/**
 * Rollback the last migration
 *
 * @param migrationId - Specific migration ID to rollback (optional, defaults to last)
 * @returns Migration result
 */
export async function rollbackMigration(migrationId?: string): Promise<MigrationResult> {
  await initMigrationsTable();

  const completed = await getCompletedMigrations();

  if (completed.length === 0) {
    throw new Error('No migrations to rollback');
  }

  const targetId = migrationId || completed[completed.length - 1];

  if (!migrationId && !completed.includes(targetId)) {
    throw new Error(`Migration ${targetId} not found in completed migrations`);
  }

  return executeMigrationDown(targetId);
}

/**
 * Get migration status
 *
 * @returns All migration records
 */
export async function getMigrationStatus(): Promise<MigrationRecord[]> {
  await initMigrationsTable();

  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    database: row.database,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    checksum: row.checksum,
  }));
}

/**
 * Create a new migration file (helper for development)
 *
 * @param id - Migration ID
 * @param name - Migration name
 * @param database - Database type
 * @returns Migration template
 */
export function createMigrationTemplate(
  id: string,
  name: string,
  database: DatabaseType = DatabaseType.POSTGRESQL
): string {
  const timestamp = new Date().toISOString();

  if (database === DatabaseType.POSTGRESQL) {
    return `/**
 * Migration: ${name}
 * Created: ${timestamp}
 */

import { Migration, DatabaseType } from './types';

export const migration: Migration = {
  id: '${id}',
  name: '${name}',
  database: DatabaseType.POSTGRESQL,

  // UP: Apply the migration
  up: \`
    -- Your SQL here
  \`,

  // DOWN: Rollback the migration
  down: \`
    -- Your rollback SQL here
  \`,
};
`;
  } else {
    return `/**
 * Migration: ${name}
 * Created: ${timestamp}
 */

import { Migration, DatabaseType } from './types';
import { firestore } from 'firebase-admin';

export const migration: Migration = {
  id: '${id}',
  name: '${name}',
  database: DatabaseType.FIRESTORE,

  // UP: Apply the migration
  async upFn() {
    // Your migration logic here
    const db = firestore();
    // Example: await db.collection('new_collection').doc('init').set({ created: true });
  },

  // DOWN: Rollback the migration
  async downFn() {
    // Your rollback logic here
    const db = firestore();
    // Example: await db.collection('new_collection').doc('init').delete();
  },
};
`;
  }
}
