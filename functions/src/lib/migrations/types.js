"use strict";
/**
 * Migration System - Type Definitions
 *
 * @module lib/migrations/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseType = exports.MigrationStatus = void 0;
/**
 * Migration status in the tracking table
 */
var MigrationStatus;
(function (MigrationStatus) {
    MigrationStatus["PENDING"] = "pending";
    MigrationStatus["RUNNING"] = "running";
    MigrationStatus["COMPLETED"] = "completed";
    MigrationStatus["FAILED"] = "failed";
    MigrationStatus["ROLLED_BACK"] = "rolled_back";
})(MigrationStatus || (exports.MigrationStatus = MigrationStatus = {}));
/**
 * Database type for migrations
 */
var DatabaseType;
(function (DatabaseType) {
    DatabaseType["POSTGRESQL"] = "postgresql";
    DatabaseType["FIRESTORE"] = "firestore";
})(DatabaseType || (exports.DatabaseType = DatabaseType = {}));
