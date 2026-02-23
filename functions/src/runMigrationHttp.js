"use strict";
// Firebase Functions v2 CORS - explicitly list allowed origins
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var pg_1 = require("pg");
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
/**
 * HTTP endpoint to run migration (no auth required - temporary!)
 * DELETE THIS AFTER MIGRATION IS COMPLETE!
 *
 * Uses direct TCP connection instead of Cloud SQL socket for this one-time migration
 */
exports.runMigrationHttp = (0, https_1.onRequest)({
    secrets: ['DB_PASS'],
    memory: '512MiB',
    cors: CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, dbPass, pool, client, slugCheck, activeCheck, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                apiKey = req.query.key;
                if (apiKey !== 'temp-migration-key-2026') {
                    res.status(403).json({ error: 'Forbidden' });
                    return [2 /*return*/];
                }
                dbPass = process.env.DB_PASS || 'fisioflow2024';
                pool = new pg_1.Pool({
                    host: '35.192.122.198',
                    port: 5432,
                    user: process.env.DB_USER || 'fisioflow',
                    password: dbPass,
                    database: process.env.DB_NAME || 'fisioflow',
                    max: 1,
                    connectionTimeoutMillis: 30000,
                    ssl: {
                        rejectUnauthorized: false
                    }
                });
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 17, 19, 21]);
                console.log('🔄 Starting organizations table migration...');
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                _a.sent();
                return [4 /*yield*/, client.query("\n      SELECT column_name\n      FROM information_schema.columns\n      WHERE table_name = 'organizations' AND column_name = 'slug'\n    ")];
            case 4:
                slugCheck = _a.sent();
                if (!(slugCheck.rows.length === 0)) return [3 /*break*/, 8];
                console.log('➕ Adding slug column to organizations table...');
                return [4 /*yield*/, client.query("ALTER TABLE organizations ADD COLUMN slug TEXT")];
            case 5:
                _a.sent();
                return [4 /*yield*/, client.query("\n        UPDATE organizations\n        SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9\u00C0-\u00FF\\s]', '', 'g'))\n        WHERE slug IS NULL\n      ")];
            case 6:
                _a.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug)")];
            case 7:
                _a.sent();
                console.log('✅ slug column added successfully');
                return [3 /*break*/, 9];
            case 8:
                console.log('ℹ️ slug column already exists - skipping');
                _a.label = 9;
            case 9: return [4 /*yield*/, client.query("\n      SELECT column_name\n      FROM information_schema.columns\n      WHERE table_name = 'organizations' AND column_name = 'active'\n    ")];
            case 10:
                activeCheck = _a.sent();
                if (!(activeCheck.rows.length === 0)) return [3 /*break*/, 12];
                console.log('➕ Adding active column to organizations table...');
                return [4 /*yield*/, client.query("ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT true")];
            case 11:
                _a.sent();
                console.log('✅ active column added successfully');
                return [3 /*break*/, 13];
            case 12:
                console.log('ℹ️ active column already exists - skipping');
                _a.label = 13;
            case 13: return [4 /*yield*/, client.query("UPDATE organizations SET active = true WHERE active IS NULL")];
            case 14:
                _a.sent();
                return [4 /*yield*/, client.query('COMMIT')];
            case 15:
                _a.sent();
                return [4 /*yield*/, client.query("\n      SELECT column_name, data_type, is_nullable\n      FROM information_schema.columns\n      WHERE table_name = 'organizations'\n      AND column_name IN ('slug', 'active')\n      ORDER BY column_name\n    ")];
            case 16:
                result = _a.sent();
                console.log('✅ Migration completed successfully!');
                res.json({
                    success: true,
                    message: 'Migration completed successfully',
                    columns: result.rows
                });
                return [3 /*break*/, 21];
            case 17:
                error_1 = _a.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 18:
                _a.sent();
                console.error('❌ Migration failed:', error_1);
                res.status(500).json({
                    success: false,
                    error: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1)
                });
                return [3 /*break*/, 21];
            case 19:
                client.release();
                return [4 /*yield*/, pool.end()];
            case 20:
                _a.sent();
                return [7 /*endfinally*/];
            case 21: return [2 /*return*/];
        }
    });
}); });
