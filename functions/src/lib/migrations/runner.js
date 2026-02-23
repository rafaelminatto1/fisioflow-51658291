"use strict";
/**
 * Migration Runner
 *
 * @description
 * Executes and tracks database migrations for both PostgreSQL and Firestore
 *
 * @module lib/migrations/runner
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMigration = registerMigration;
exports.getAllMigrations = getAllMigrations;
exports.getMigration = getMigration;
exports.getMigrationRecord = getMigrationRecord;
exports.runMigrations = runMigrations;
exports.rollbackMigration = rollbackMigration;
exports.getMigrationStatus = getMigrationStatus;
exports.createMigrationTemplate = createMigrationTemplate;
var init_1 = require("../../init");
var firebase_functions_1 = require("firebase-functions");
var types_1 = require("./types");
var create_doctors_table_1 = require("../../migrations/create-doctors-table");
var MIGRATIONS_TABLE = 'schema_migrations';
// ============================================================================================
// MIGRATION REGISTRY
// ============================================================================================
/**
 * Registry of all available migrations
 * Add new migrations to this array
 */
var MIGRATIONS = [
    // Add migrations here in order
    create_doctors_table_1.migration,
];
/**
 * Register a migration
 *
 * @param migration - Migration to register
 */
function registerMigration(migration) {
    MIGRATIONS.push(migration);
    firebase_functions_1.logger.info("[Migration] Registered: ".concat(migration.id, " - ").concat(migration.name));
}
/**
 * Get all registered migrations
 *
 * @returns Array of all migrations
 */
function getAllMigrations() {
    return __spreadArray([], MIGRATIONS, true).sort(function (a, b) { return a.id.localeCompare(b.id); });
}
/**
 * Get a specific migration by ID
 *
 * @param id - Migration ID
 * @returns Migration or undefined
 */
function getMigration(id) {
    return MIGRATIONS.find(function (m) { return m.id === id; });
}
// ============================================================================================
// DATABASE OPERATIONS
// ============================================================================================
/**
 * Initialize the migrations tracking table
 */
function initMigrationsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS ".concat(MIGRATIONS_TABLE, " (\n      id VARCHAR(255) PRIMARY KEY,\n      name VARCHAR(500) NOT NULL,\n      database VARCHAR(50) NOT NULL,\n      status VARCHAR(50) NOT NULL DEFAULT 'pending',\n      started_at TIMESTAMP,\n      completed_at TIMESTAMP,\n      error_message TEXT,\n      checksum VARCHAR(64),\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      updated_at TIMESTAMP NOT NULL DEFAULT NOW()\n    );\n\n    CREATE INDEX IF NOT EXISTS idx_").concat(MIGRATIONS_TABLE, "_status ON ").concat(MIGRATIONS_TABLE, "(status);\n    CREATE INDEX IF NOT EXISTS idx_").concat(MIGRATIONS_TABLE, "_database ON ").concat(MIGRATIONS_TABLE, "(database);\n  "))];
                case 1:
                    _a.sent();
                    firebase_functions_1.logger.info('[Migration] Migrations table initialized');
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get migration record from database
 * Reserved for future use
 *
 * @param id - Migration ID
 * @returns Migration record or null
 */
function getMigrationRecord(id) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT * FROM ".concat(MIGRATIONS_TABLE, " WHERE id = $1"), [id])];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0) {
                        return [2 /*return*/, null];
                    }
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            name: row.name,
                            database: row.database,
                            status: row.status,
                            started_at: row.started_at,
                            completed_at: row.completed_at,
                            error_message: row.error_message,
                            checksum: row.checksum,
                        }];
            }
        });
    });
}
/**
 * Insert or update migration record
 *
 * @param record - Migration record to upsert
 */
function upsertMigrationRecord(record) {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("INSERT INTO ".concat(MIGRATIONS_TABLE, " (id, name, database, status, started_at, completed_at, error_message, checksum)\n     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n     ON CONFLICT (id) DO UPDATE SET\n       status = EXCLUDED.status,\n       started_at = EXCLUDED.started_at,\n       completed_at = EXCLUDED.completed_at,\n       error_message = EXCLUDED.error_message,\n       updated_at = NOW()\n    "), [
                            record.id,
                            record.name,
                            record.database,
                            record.status,
                            record.started_at || null,
                            record.completed_at || null,
                            record.error_message || null,
                            record.checksum || null,
                        ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get all completed migrations from database
 *
 * @returns Array of completed migration IDs
 */
function getCompletedMigrations() {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT id FROM ".concat(MIGRATIONS_TABLE, " WHERE status = $1 ORDER BY id"), [types_1.MigrationStatus.COMPLETED])];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return row.id; })];
            }
        });
    });
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
function executeMigrationUp(migration) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, pool, duration, error_1, duration, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, , 15]);
                    firebase_functions_1.logger.info("[Migration] executing UP: ".concat(migration.id, " - ").concat(migration.name));
                    // Update status to running
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migration.id,
                            name: migration.name,
                            database: migration.database,
                            status: types_1.MigrationStatus.RUNNING,
                            started_at: new Date(),
                        })];
                case 2:
                    // Update status to running
                    _a.sent();
                    if (!(migration.database === types_1.DatabaseType.POSTGRESQL)) return [3 /*break*/, 8];
                    if (!migration.up) return [3 /*break*/, 4];
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query(migration.up)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    if (!migration.upFn) return [3 /*break*/, 6];
                    return [4 /*yield*/, migration.upFn()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6: throw new Error('Migration must have either "up" or "upFn"');
                case 7: return [3 /*break*/, 11];
                case 8:
                    if (!(migration.database === types_1.DatabaseType.FIRESTORE)) return [3 /*break*/, 11];
                    if (!migration.upFn) return [3 /*break*/, 10];
                    return [4 /*yield*/, migration.upFn()];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 10: throw new Error('Firestore migrations must have "upFn"');
                case 11:
                    duration = Date.now() - startTime;
                    // Update status to completed
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migration.id,
                            name: migration.name,
                            database: migration.database,
                            status: types_1.MigrationStatus.COMPLETED,
                            started_at: new Date(startTime),
                            completed_at: new Date(),
                        })];
                case 12:
                    // Update status to completed
                    _a.sent();
                    firebase_functions_1.logger.info("[Migration] completed: ".concat(migration.id, " (").concat(duration, "ms)"));
                    return [2 /*return*/, {
                            migration: migration.id,
                            status: types_1.MigrationStatus.COMPLETED,
                            duration: duration,
                        }];
                case 13:
                    error_1 = _a.sent();
                    duration = Date.now() - startTime;
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    firebase_functions_1.logger.error("[Migration] failed: ".concat(migration.id), error_1);
                    // Update status to failed
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migration.id,
                            name: migration.name,
                            database: migration.database,
                            status: types_1.MigrationStatus.FAILED,
                            started_at: new Date(startTime),
                            error_message: errorMessage,
                        })];
                case 14:
                    // Update status to failed
                    _a.sent();
                    return [2 /*return*/, {
                            migration: migration.id,
                            status: types_1.MigrationStatus.FAILED,
                            duration: duration,
                            error: errorMessage,
                        }];
                case 15: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a single migration (DOWN direction)
 *
 * @param migrationId - Migration ID to rollback
 * @returns Migration result
 */
function executeMigrationDown(migrationId) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, migration, pool, duration, error_2, duration, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 13, , 15]);
                    migration = getMigration(migrationId);
                    if (!migration) {
                        throw new Error("Migration not found: ".concat(migrationId));
                    }
                    firebase_functions_1.logger.info("[Migration] executing DOWN: ".concat(migrationId, " - ").concat(migration.name));
                    // Update status to running
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migration.id,
                            name: migration.name,
                            database: migration.database,
                            status: types_1.MigrationStatus.RUNNING,
                            started_at: new Date(),
                        })];
                case 2:
                    // Update status to running
                    _a.sent();
                    if (!(migration.database === types_1.DatabaseType.POSTGRESQL)) return [3 /*break*/, 8];
                    if (!migration.down) return [3 /*break*/, 4];
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query(migration.down)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    if (!migration.downFn) return [3 /*break*/, 6];
                    return [4 /*yield*/, migration.downFn()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6: throw new Error('Migration must have either "down" or "downFn"');
                case 7: return [3 /*break*/, 11];
                case 8:
                    if (!(migration.database === types_1.DatabaseType.FIRESTORE)) return [3 /*break*/, 11];
                    if (!migration.downFn) return [3 /*break*/, 10];
                    return [4 /*yield*/, migration.downFn()];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 11];
                case 10: throw new Error('Firestore migrations must have "downFn"');
                case 11:
                    duration = Date.now() - startTime;
                    // Update status to rolled back
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migration.id,
                            name: migration.name,
                            database: migration.database,
                            status: types_1.MigrationStatus.ROLLED_BACK,
                            started_at: new Date(startTime),
                            completed_at: new Date(),
                        })];
                case 12:
                    // Update status to rolled back
                    _a.sent();
                    firebase_functions_1.logger.info("[Migration] rolled back: ".concat(migration.id, " (").concat(duration, "ms)"));
                    return [2 /*return*/, {
                            migration: migration.id,
                            status: types_1.MigrationStatus.ROLLED_BACK,
                            duration: duration,
                        }];
                case 13:
                    error_2 = _a.sent();
                    duration = Date.now() - startTime;
                    errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                    firebase_functions_1.logger.error("[Migration] rollback failed: ".concat(migrationId), error_2);
                    // Update status to failed
                    return [4 /*yield*/, upsertMigrationRecord({
                            id: migrationId,
                            name: migrationId,
                            database: types_1.DatabaseType.POSTGRESQL, // Default
                            status: types_1.MigrationStatus.FAILED,
                            started_at: new Date(startTime),
                            error_message: errorMessage,
                        })];
                case 14:
                    // Update status to failed
                    _a.sent();
                    return [2 /*return*/, {
                            migration: migrationId,
                            status: types_1.MigrationStatus.FAILED,
                            duration: duration,
                            error: errorMessage,
                        }];
                case 15: return [2 /*return*/];
            }
        });
    });
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
function runMigrations() {
    return __awaiter(this, arguments, void 0, function (options) {
        var startTime, completed, allMigrations, pendingMigrations, results, executed, failed, _i, pendingMigrations_1, migration, result, duration, summary;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    // Initialize migrations table
                    return [4 /*yield*/, initMigrationsTable()];
                case 1:
                    // Initialize migrations table
                    _a.sent();
                    return [4 /*yield*/, getCompletedMigrations()];
                case 2:
                    completed = _a.sent();
                    allMigrations = getAllMigrations();
                    pendingMigrations = allMigrations.filter(function (m) { return !completed.includes(m.id); });
                    if (options.database) {
                        pendingMigrations = pendingMigrations.filter(function (m) { return m.database === options.database; });
                    }
                    firebase_functions_1.logger.info("[Migration] Found ".concat(pendingMigrations.length, " pending migrations"));
                    results = [];
                    executed = 0;
                    failed = 0;
                    _i = 0, pendingMigrations_1 = pendingMigrations;
                    _a.label = 3;
                case 3:
                    if (!(_i < pendingMigrations_1.length)) return [3 /*break*/, 6];
                    migration = pendingMigrations_1[_i];
                    if (options.dryRun) {
                        firebase_functions_1.logger.info("[Migration] [DRY RUN] Would execute: ".concat(migration.id));
                        results.push({
                            migration: migration.id,
                            status: types_1.MigrationStatus.PENDING,
                            duration: 0,
                        });
                        return [3 /*break*/, 5];
                    }
                    return [4 /*yield*/, executeMigrationUp(migration)];
                case 4:
                    result = _a.sent();
                    results.push(result);
                    if (result.status === types_1.MigrationStatus.COMPLETED) {
                        executed++;
                    }
                    else if (result.status === types_1.MigrationStatus.FAILED) {
                        failed++;
                        // Stop on first failure
                        return [3 /*break*/, 6];
                    }
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    duration = Date.now() - startTime;
                    summary = {
                        total: pendingMigrations.length,
                        executed: executed,
                        skipped: pendingMigrations.length - executed - failed,
                        failed: failed,
                        results: results,
                        duration: duration,
                    };
                    firebase_functions_1.logger.info("[Migration] Summary: ".concat(executed, "/").concat(pendingMigrations.length, " executed (").concat(failed, " failed)"));
                    return [2 /*return*/, summary];
            }
        });
    });
}
/**
 * Rollback the last migration
 *
 * @param migrationId - Specific migration ID to rollback (optional, defaults to last)
 * @returns Migration result
 */
function rollbackMigration(migrationId) {
    return __awaiter(this, void 0, void 0, function () {
        var completed, targetId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initMigrationsTable()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, getCompletedMigrations()];
                case 2:
                    completed = _a.sent();
                    if (completed.length === 0) {
                        throw new Error('No migrations to rollback');
                    }
                    targetId = migrationId || completed[completed.length - 1];
                    if (!migrationId && !completed.includes(targetId)) {
                        throw new Error("Migration ".concat(targetId, " not found in completed migrations"));
                    }
                    return [2 /*return*/, executeMigrationDown(targetId)];
            }
        });
    });
}
/**
 * Get migration status
 *
 * @returns All migration records
 */
function getMigrationStatus() {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initMigrationsTable()];
                case 1:
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("SELECT * FROM ".concat(MIGRATIONS_TABLE, " ORDER BY id"))];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            name: row.name,
                            database: row.database,
                            status: row.status,
                            started_at: row.started_at,
                            completed_at: row.completed_at,
                            error_message: row.error_message,
                            checksum: row.checksum,
                        }); })];
            }
        });
    });
}
/**
 * Create a new migration file (helper for development)
 *
 * @param id - Migration ID
 * @param name - Migration name
 * @param database - Database type
 * @returns Migration template
 */
function createMigrationTemplate(id, name, database) {
    if (database === void 0) { database = types_1.DatabaseType.POSTGRESQL; }
    var timestamp = new Date().toISOString();
    if (database === types_1.DatabaseType.POSTGRESQL) {
        return "/**\n * Migration: ".concat(name, "\n * Created: ").concat(timestamp, "\n */\n\nimport { Migration, DatabaseType } from './types';\n\nexport const migration: Migration = {\n  id: '").concat(id, "',\n  name: '").concat(name, "',\n  database: DatabaseType.POSTGRESQL,\n\n  // UP: Apply the migration\n  up: `\n    -- Your SQL here\n  `,\n\n  // DOWN: Rollback the migration\n  down: `\n    -- Your rollback SQL here\n  `,\n};\n");
    }
    else {
        return "/**\n * Migration: ".concat(name, "\n * Created: ").concat(timestamp, "\n */\n\nimport { Migration, DatabaseType } from './types';\nimport { firestore } from 'firebase-admin';\n\nexport const migration: Migration = {\n  id: '").concat(id, "',\n  name: '").concat(name, "',\n  database: DatabaseType.FIRESTORE,\n\n  // UP: Apply the migration\n  async upFn() {\n    // Your migration logic here\n    const db = firestore();\n    // Example: await db.collection('new_collection').doc('init').set({ created: true });\n  },\n\n  // DOWN: Rollback the migration\n  async downFn() {\n    // Your rollback logic here\n    const db = firestore();\n    // Example: await db.collection('new_collection').doc('init').delete();\n  },\n};\n");
    }
}
