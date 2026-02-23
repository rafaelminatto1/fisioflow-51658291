"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMigrationTemplate = exports.getMigration = exports.getAllMigrations = exports.registerMigration = exports.getMigrationStatus = exports.rollbackMigration = exports.runMigrations = exports.DatabaseType = exports.MigrationStatus = void 0;
// Export types
var types_1 = require("./types");
Object.defineProperty(exports, "MigrationStatus", { enumerable: true, get: function () { return types_1.MigrationStatus; } });
Object.defineProperty(exports, "DatabaseType", { enumerable: true, get: function () { return types_1.DatabaseType; } });
// Export runner functions
var runner_1 = require("./runner");
Object.defineProperty(exports, "runMigrations", { enumerable: true, get: function () { return runner_1.runMigrations; } });
Object.defineProperty(exports, "rollbackMigration", { enumerable: true, get: function () { return runner_1.rollbackMigration; } });
Object.defineProperty(exports, "getMigrationStatus", { enumerable: true, get: function () { return runner_1.getMigrationStatus; } });
Object.defineProperty(exports, "registerMigration", { enumerable: true, get: function () { return runner_1.registerMigration; } });
Object.defineProperty(exports, "getAllMigrations", { enumerable: true, get: function () { return runner_1.getAllMigrations; } });
Object.defineProperty(exports, "getMigration", { enumerable: true, get: function () { return runner_1.getMigration; } });
Object.defineProperty(exports, "createMigrationTemplate", { enumerable: true, get: function () { return runner_1.createMigrationTemplate; } });
// Re-export for convenience
__exportStar(require("./runner"), exports);
__exportStar(require("./types"), exports);
