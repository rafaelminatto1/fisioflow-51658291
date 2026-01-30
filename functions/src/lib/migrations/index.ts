/**
 * Migration System - Main Entry Point
 *
 * @description
 * Provides a complete migration system for managing database schema changes
 * across both PostgreSQL and Firestore databases.
 *
 * @module lib/migrations
 *
 * @example
 * ```typescript
 * import { runMigrations, rollbackMigration, registerMigration, DatabaseType } from './lib/migrations';
 *
 * // Run all pending migrations
 * const summary = await runMigrations();
 * console.log(\`Executed \${summary.executed} migrations\`);
 *
 * // Rollback last migration
 * await rollbackMigration();
 *
 * // Register a custom migration
 * registerMigration({
 *   id: '001_add_users_table',
 *   name: 'Add users table',
 *   database: DatabaseType.POSTGRESQL,
 *   up: \`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);\`,
 *   down: \`DROP TABLE users;\`,
 * });
 * ```
 */

// Export types
export {
  Migration,
  MigrationRecord,
  MigrationResult,
  MigrationSummary,
  MigrationStatus,
  DatabaseType,
} from './types';

// Export runner functions
export {
  runMigrations,
  rollbackMigration,
  getMigrationStatus,
  registerMigration,
  getAllMigrations,
  getMigration,
  createMigrationTemplate,
} from './runner';

// Re-export for convenience
export * from './runner';
export * from './types';
