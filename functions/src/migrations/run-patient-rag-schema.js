"use strict";
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
exports.runPatientRagSchemaHandler = void 0;
var init_1 = require("../init");
var MIGRATION_API_KEY = process.env.MIGRATION_API_KEY || 'fisioflow-migration-2026';
function extractApiKey(req) {
    var _a, _b;
    var queryKey = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.key;
    if (Array.isArray(queryKey))
        return String(queryKey[0] || '');
    if (typeof queryKey === 'string')
        return queryKey;
    var headerKey = (_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b['x-migration-key'];
    if (Array.isArray(headerKey))
        return String(headerKey[0] || '');
    if (typeof headerKey === 'string')
        return headerKey;
    return '';
}
var runPatientRagSchemaHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, pool, client, steps, hnswError_1, verify, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed - use POST' });
                    return [2 /*return*/];
                }
                apiKey = extractApiKey(req);
                if (apiKey !== MIGRATION_API_KEY) {
                    res.status(403).json({ error: 'Forbidden - invalid migration key' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                steps = [];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 17, 19, 20]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                _a.sent();
                return [4 /*yield*/, client.query('CREATE EXTENSION IF NOT EXISTS vector')];
            case 4:
                _a.sent();
                steps.push({ step: 'enable_pgvector', success: true });
                return [4 /*yield*/, client.query("\n      CREATE TABLE IF NOT EXISTS patient_rag_chunks (\n        id BIGSERIAL PRIMARY KEY,\n        patient_id TEXT NOT NULL,\n        organization_id TEXT,\n        source_type TEXT NOT NULL,\n        source_id TEXT NOT NULL,\n        source_date TIMESTAMPTZ,\n        document_key TEXT NOT NULL,\n        chunk_index INTEGER NOT NULL DEFAULT 0,\n        chunk_text TEXT NOT NULL,\n        chunk_hash TEXT NOT NULL,\n        embedding vector(768),\n        metadata JSONB,\n        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n      )\n    ")];
            case 5:
                _a.sent();
                steps.push({ step: 'create_table_patient_rag_chunks', success: true });
                return [4 /*yield*/, client.query("\n      CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_rag_chunks_unique\n      ON patient_rag_chunks (patient_id, document_key, chunk_index, chunk_hash)\n    ")];
            case 6:
                _a.sent();
                return [4 /*yield*/, client.query("\n      CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_patient_org_date\n      ON patient_rag_chunks (patient_id, organization_id, source_date DESC)\n    ")];
            case 7:
                _a.sent();
                return [4 /*yield*/, client.query("\n      CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_source\n      ON patient_rag_chunks (source_type, source_date DESC)\n    ")];
            case 8:
                _a.sent();
                steps.push({ step: 'create_btree_indexes', success: true });
                _a.label = 9;
            case 9:
                _a.trys.push([9, 11, , 13]);
                return [4 /*yield*/, client.query("\n        CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_embedding_hnsw\n        ON patient_rag_chunks USING hnsw (embedding vector_cosine_ops)\n      ")];
            case 10:
                _a.sent();
                steps.push({ step: 'create_vector_index_hnsw', success: true, message: 'hnsw' });
                return [3 /*break*/, 13];
            case 11:
                hnswError_1 = _a.sent();
                return [4 /*yield*/, client.query("\n        CREATE INDEX IF NOT EXISTS idx_patient_rag_chunks_embedding_ivfflat\n        ON patient_rag_chunks USING ivfflat (embedding vector_cosine_ops)\n        WITH (lists = 100)\n      ")];
            case 12:
                _a.sent();
                steps.push({
                    step: 'create_vector_index_ivfflat',
                    success: true,
                    message: "fallback_ivfflat (".concat(hnswError_1.message, ")"),
                });
                return [3 /*break*/, 13];
            case 13: return [4 /*yield*/, client.query('ANALYZE patient_rag_chunks')];
            case 14:
                _a.sent();
                steps.push({ step: 'analyze_table', success: true });
                return [4 /*yield*/, client.query('COMMIT')];
            case 15:
                _a.sent();
                return [4 /*yield*/, client.query("\n      SELECT indexname\n      FROM pg_indexes\n      WHERE schemaname = 'public'\n        AND tablename = 'patient_rag_chunks'\n      ORDER BY indexname\n    ")];
            case 16:
                verify = _a.sent();
                res.json({
                    success: true,
                    message: 'Patient RAG schema migration completed',
                    steps: steps,
                    indexes: verify.rows.map(function (row) { return row.indexname; }),
                    timestamp: new Date().toISOString(),
                });
                return [3 /*break*/, 20];
            case 17:
                error_1 = _a.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 18:
                _a.sent();
                res.status(500).json({
                    success: false,
                    error: error_1.message,
                    steps: steps,
                });
                return [3 /*break*/, 20];
            case 19:
                client.release();
                return [7 /*endfinally*/];
            case 20: return [2 /*return*/];
        }
    });
}); };
exports.runPatientRagSchemaHandler = runPatientRagSchemaHandler;
