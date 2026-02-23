"use strict";
/**
 * Migration: Create Optimized Performance Indexes
 * Versão HTTP para execução direta via curl/gcloud
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOptimizedIndexes = exports.createOptimizedIndexesHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var logger_1 = require("../lib/logger");
/**
 * Handler HTTP para criar índices otimizados no PostgreSQL
 * Não requer autenticação (executado apenas por admin)
 */
var createOptimizedIndexesHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, pool, criticalIndexes, results, _i, criticalIndexes_1, indexSql, indexName, err_1, indexName, tables, _a, tables_1, table, err_2, indexCheck, error_1;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // CORS
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                apiKey = req.headers['x-api-key'] || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.apiKey);
                if (apiKey !== 'FISIOFLOW_MIGRATION_2026') {
                    res.status(403).json({ error: 'Forbidden: Invalid API key' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                _e.label = 1;
            case 1:
                _e.trys.push([1, 15, , 16]);
                logger_1.logger.info('[Migration] Starting optimized indexes creation...');
                criticalIndexes = [
                    // Pacientes - busca principal
                    'CREATE INDEX IF NOT EXISTS idx_patients_org_active ON patients(organization_id) WHERE is_active = true;',
                    'CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients(organization_id, LOWER(name));',
                    'CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf) WHERE cpf IS NOT NULL;',
                    // Agendamentos - listagem e conflitos
                    'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time);',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, date);',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_org_status ON appointments(organization_id, status) WHERE status != \'cancelado\';',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapist_id, date, start_time);',
                    // Financeiro - relatórios
                    'CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transacoes(organization_id, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_payments_org_date ON pagamentos(organization_id, payment_date DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id);',
                    // Perfis - autenticação
                    'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);',
                    'CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id) WHERE is_active = true;',
                ];
                results = [];
                _i = 0, criticalIndexes_1 = criticalIndexes;
                _e.label = 2;
            case 2:
                if (!(_i < criticalIndexes_1.length)) return [3 /*break*/, 7];
                indexSql = criticalIndexes_1[_i];
                _e.label = 3;
            case 3:
                _e.trys.push([3, 5, , 6]);
                return [4 /*yield*/, pool.query(indexSql)];
            case 4:
                _e.sent();
                indexName = ((_c = indexSql.match(/idx_\w+/)) === null || _c === void 0 ? void 0 : _c[0]) || 'unknown';
                logger_1.logger.info("[Migration] \u2713 Created index: ".concat(indexName));
                results.push({ index: indexName, status: 'created' });
                return [3 /*break*/, 6];
            case 5:
                err_1 = _e.sent();
                indexName = ((_d = indexSql.match(/idx_\w+/)) === null || _d === void 0 ? void 0 : _d[0]) || 'unknown';
                if (err_1.message.includes('already exists') || err_1.code === '42P07') {
                    logger_1.logger.info("[Migration] - Index already exists: ".concat(indexName));
                    results.push({ index: indexName, status: 'exists' });
                }
                else {
                    logger_1.logger.error("[Migration] \u2717 Error creating index ".concat(indexName, ":"), err_1.message);
                    results.push({ index: indexName, status: "error: ".concat(err_1.message) });
                }
                return [3 /*break*/, 6];
            case 6:
                _i++;
                return [3 /*break*/, 2];
            case 7:
                // Analisar tabelas para atualizar estatísticas do query planner
                logger_1.logger.info('[Migration] Analyzing tables...');
                tables = ['patients', 'appointments', 'transacoes', 'pagamentos', 'profiles'];
                _a = 0, tables_1 = tables;
                _e.label = 8;
            case 8:
                if (!(_a < tables_1.length)) return [3 /*break*/, 13];
                table = tables_1[_a];
                _e.label = 9;
            case 9:
                _e.trys.push([9, 11, , 12]);
                return [4 /*yield*/, pool.query("ANALYZE ".concat(table, ";"))];
            case 10:
                _e.sent();
                logger_1.logger.info("[Migration] \u2713 Analyzed table: ".concat(table));
                return [3 /*break*/, 12];
            case 11:
                err_2 = _e.sent();
                logger_1.logger.warn("[Migration] - Could not analyze ".concat(table, ":"), err_2.message);
                return [3 /*break*/, 12];
            case 12:
                _a++;
                return [3 /*break*/, 8];
            case 13: return [4 /*yield*/, pool.query("\n      SELECT\n        schemaname,\n        tablename,\n        indexname,\n        indexdef\n      FROM pg_indexes\n      WHERE indexname LIKE 'idx_%'\n      ORDER BY tablename, indexname;\n    ")];
            case 14:
                indexCheck = _e.sent();
                logger_1.logger.info("[Migration] \u2713 Total indexes: ".concat(results.length));
                logger_1.logger.info("[Migration] \u2713 Created: ".concat(results.filter(function (r) { return r.status === 'created'; }).length));
                logger_1.logger.info("[Migration] \u2713 Already existed: ".concat(results.filter(function (r) { return r.status === 'exists'; }).length));
                res.json({
                    success: true,
                    message: 'Indexes created/verified successfully',
                    results: results,
                    summary: {
                        total: results.length,
                        created: results.filter(function (r) { return r.status === 'created'; }).length,
                        existed: results.filter(function (r) { return r.status === 'exists'; }).length,
                        errors: results.filter(function (r) { return r.status.startsWith('error'); }).length,
                    },
                    allIndexes: indexCheck.rows,
                });
                return [3 /*break*/, 16];
            case 15:
                error_1 = _e.sent();
                logger_1.logger.error('[Migration] Error:', error_1);
                res.status(500).json({
                    success: false,
                    error: error_1.message,
                });
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); };
exports.createOptimizedIndexesHandler = createOptimizedIndexesHandler;
exports.createOptimizedIndexes = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
}, exports.createOptimizedIndexesHandler);
