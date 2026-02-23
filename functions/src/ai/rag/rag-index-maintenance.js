"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.rebuildPatientRagIndexHttpHandler = exports.rebuildPatientRagIndexHandler = void 0;
exports.isPatientRagIndexingEnabled = isPatientRagIndexingEnabled;
exports.triggerPatientRagReindex = triggerPatientRagReindex;
exports.clearPatientRagIndex = clearPatientRagIndex;
var crypto_1 = require("crypto");
var auth_1 = require("firebase-admin/auth");
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../../init");
var logger_1 = require("../../lib/logger");
var vertex_embeddings_1 = require("./vertex-embeddings");
var logger = (0, logger_1.getLogger)('ai-rag-index-maintenance');
var MIGRATION_API_KEY = process.env.MIGRATION_API_KEY || 'fisioflow-migration-2026';
var DEFAULT_LIMIT = 30;
var MAX_LIMIT = 200;
var DEFAULT_MAX_CHUNKS_PER_PATIENT = 220;
var CHUNK_SIZE = 520;
var CHUNK_OVERLAP = 100;
function toStringValue(value) {
    if (typeof value !== 'string')
        return undefined;
    var normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function toNumberValue(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        var parsed = Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return null;
}
function truncateText(text, maxLength) {
    if (maxLength === void 0) { maxLength = 1200; }
    if (text.length <= maxLength)
        return text;
    return "".concat(text.slice(0, maxLength - 3), "...");
}
function splitIntoChunks(text) {
    if (text.length <= CHUNK_SIZE)
        return [text];
    var chunks = [];
    var start = 0;
    while (start < text.length) {
        var end = Math.min(text.length, start + CHUNK_SIZE);
        chunks.push(text.slice(start, end));
        if (end >= text.length)
            break;
        start = Math.max(0, end - CHUNK_OVERLAP);
    }
    return chunks;
}
function vectorLiteral(values) {
    return "[".concat(values.map(function (value) { return Number(value).toFixed(8); }).join(','), "]");
}
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
function parseBody(req) {
    if (!(req === null || req === void 0 ? void 0 : req.body))
        return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        }
        catch (_a) {
            return {};
        }
    }
    if (typeof req.body === 'object')
        return req.body;
    return {};
}
function sanitizeLimit(value) {
    var parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}
function sanitizeBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return false;
}
function assertAdmin(uid) {
    return __awaiter(this, void 0, void 0, function () {
        var user, claims, role;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, auth_1.getAuth)().getUser(uid)];
                case 1:
                    user = _a.sent();
                    claims = (user.customClaims || {});
                    role = toStringValue(claims.role);
                    if (role !== 'admin' && role !== 'owner' && role !== 'superadmin') {
                        throw new https_1.HttpsError('permission-denied', 'Admin only');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function safeQuery(pool, label, sql, params) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, pool.query(sql, params)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    logger.warn("RAG indexing query failed (".concat(label, ")"), {
                        error: error_1.message,
                    });
                    return [2 /*return*/, {
                            command: 'SELECT',
                            rowCount: 0,
                            oid: 0,
                            fields: [],
                            rows: [],
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function fetchPatients(pool, input) {
    return __awaiter(this, void 0, void 0, function () {
        var params, where, whereClause, sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = [];
                    where = [];
                    if (input.patientId) {
                        params.push(input.patientId);
                        where.push("id = $".concat(params.length));
                    }
                    if (input.organizationId) {
                        params.push(input.organizationId);
                        where.push("organization_id = $".concat(params.length));
                    }
                    params.push(input.limit);
                    whereClause = where.length > 0 ? "WHERE ".concat(where.join(' AND ')) : '';
                    sql = "\n    SELECT id, organization_id, name, main_condition, medical_history\n    FROM patients\n    ".concat(whereClause, "\n    ORDER BY COALESCE(updated_at, created_at, NOW()) DESC\n    LIMIT $").concat(params.length, "\n  ");
                    return [4 /*yield*/, safeQuery(pool, 'patients', sql, params)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows];
            }
        });
    });
}
function fetchPatientSources(pool, patientId, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var orgFilter, sessionParams, defaultParams, goalParams, painParams, sessionsSql, medicalSql, goalsSql, painRecordsSql, _a, sessionsRes, medicalRes, goalsRes, painRes, mergedPainRows;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    orgFilter = organizationId ? 'AND organization_id = $2' : '';
                    sessionParams = organizationId ? [patientId, organizationId, 80] : [patientId, 80];
                    defaultParams = organizationId ? [patientId, organizationId, 60] : [patientId, 60];
                    goalParams = organizationId ? [patientId, organizationId, 30] : [patientId, 30];
                    painParams = organizationId ? [patientId, organizationId, 30] : [patientId, 30];
                    sessionsSql = organizationId
                        ? "\n      SELECT id, session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after\n      FROM treatment_sessions\n      WHERE patient_id = $1 ".concat(orgFilter, "\n      ORDER BY session_date DESC, created_at DESC\n      LIMIT $3\n    ")
                        : "\n      SELECT id, session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after\n      FROM treatment_sessions\n      WHERE patient_id = $1\n      ORDER BY session_date DESC, created_at DESC\n      LIMIT $2\n    ";
                    medicalSql = organizationId
                        ? "\n      SELECT id, record_date, type, title, content\n      FROM medical_records\n      WHERE patient_id = $1 ".concat(orgFilter, "\n      ORDER BY record_date DESC, created_at DESC\n      LIMIT $3\n    ")
                        : "\n      SELECT id, record_date, type, title, content\n      FROM medical_records\n      WHERE patient_id = $1\n      ORDER BY record_date DESC, created_at DESC\n      LIMIT $2\n    ";
                    goalsSql = organizationId
                        ? "\n      SELECT id, description, status, priority, target_date\n      FROM patient_goals\n      WHERE patient_id = $1 ".concat(orgFilter, "\n      ORDER BY target_date DESC NULLS LAST\n      LIMIT $3\n    ")
                        : "\n      SELECT id, description, status, priority, target_date\n      FROM patient_goals\n      WHERE patient_id = $1\n      ORDER BY target_date DESC NULLS LAST\n      LIMIT $2\n    ";
                    painRecordsSql = organizationId
                        ? "\n      SELECT id, created_at, record_date, pain_level, notes\n      FROM patient_pain_records\n      WHERE patient_id = $1 ".concat(orgFilter, "\n      ORDER BY created_at DESC\n      LIMIT $3\n    ")
                        : "\n      SELECT id, created_at, record_date, pain_level, notes\n      FROM patient_pain_records\n      WHERE patient_id = $1\n      ORDER BY created_at DESC\n      LIMIT $2\n    ";
                    return [4 /*yield*/, Promise.all([
                            safeQuery(pool, 'treatment_sessions', sessionsSql, sessionParams),
                            safeQuery(pool, 'medical_records', medicalSql, defaultParams),
                            safeQuery(pool, 'patient_goals', goalsSql, goalParams),
                            safeQuery(pool, 'pain_records', painRecordsSql, painParams),
                        ])];
                case 1:
                    _a = _b.sent(), sessionsRes = _a[0], medicalRes = _a[1], goalsRes = _a[2], painRes = _a[3];
                    mergedPainRows = __spreadArray([], painRes.rows.map(function (row) { return (__assign(__assign({}, row), { record_date: toStringValue(row.created_at) || toStringValue(row.record_date) })); }), true);
                    return [2 /*return*/, {
                            sessions: sessionsRes.rows,
                            medicalRecords: medicalRes.rows,
                            goals: goalsRes.rows,
                            painRecords: mergedPainRows,
                        }];
            }
        });
    });
}
function pushSourceDocument(target, doc) {
    if (!doc)
        return;
    if (!doc.text || doc.text.trim().length === 0)
        return;
    target.push(__assign(__assign({}, doc), { text: truncateText(doc.text, 6000) }));
}
function buildSourceDocuments(patient, sources) {
    var documents = [];
    var patientName = toStringValue(patient.name) || 'Paciente';
    var mainCondition = toStringValue(patient.main_condition) || 'Nao informada';
    var medicalHistory = toStringValue(patient.medical_history);
    pushSourceDocument(documents, {
        sourceType: 'medical_record',
        sourceId: 'patient_profile',
        sourceDate: undefined,
        text: "Perfil clinico: ".concat(patientName, ". Condicao principal: ").concat(mainCondition, ".").concat(medicalHistory ? " Historico: ".concat(medicalHistory) : ''),
        metadata: { kind: 'patient_profile' },
    });
    sources.sessions.forEach(function (row, index) {
        var sourceId = toStringValue(row.id) || "session_".concat(index + 1);
        var sourceDate = toStringValue(row.session_date);
        var evolution = toStringValue(row.evolution);
        var observations = toStringValue(row.observations);
        var nextGoals = toStringValue(row.next_session_goals);
        var painBefore = toNumberValue(row.pain_level_before);
        var painAfter = toNumberValue(row.pain_level_after);
        var summary = [
            painBefore !== null ? "Dor antes ".concat(painBefore, "/10.") : '',
            painAfter !== null ? "Dor apos ".concat(painAfter, "/10.") : '',
            evolution ? "Evolucao: ".concat(evolution) : '',
            observations ? "Observacoes: ".concat(observations) : '',
            nextGoals ? "Proximos objetivos: ".concat(nextGoals) : '',
        ]
            .filter(Boolean)
            .join(' ');
        pushSourceDocument(documents, {
            sourceType: 'treatment_session',
            sourceId: sourceId,
            sourceDate: sourceDate,
            text: summary,
            metadata: { kind: 'treatment_session' },
        });
    });
    sources.medicalRecords.forEach(function (row, index) {
        var sourceId = toStringValue(row.id) || "medical_".concat(index + 1);
        var sourceDate = toStringValue(row.record_date);
        var type = toStringValue(row.type) || 'registro';
        var title = toStringValue(row.title);
        var content = toStringValue(row.content);
        pushSourceDocument(documents, {
            sourceType: 'medical_record',
            sourceId: sourceId,
            sourceDate: sourceDate,
            text: "".concat(title ? "[".concat(title, "] ") : '').concat(type, ": ").concat(content || ''),
            metadata: { kind: 'medical_record', type: type, title: title },
        });
    });
    sources.goals.forEach(function (row, index) {
        var sourceId = toStringValue(row.id) || "goal_".concat(index + 1);
        var sourceDate = toStringValue(row.target_date);
        var description = toStringValue(row.description);
        var status = toStringValue(row.status) || 'sem_status';
        var priority = toStringValue(row.priority) || 'sem_prioridade';
        pushSourceDocument(documents, {
            sourceType: 'goal',
            sourceId: sourceId,
            sourceDate: sourceDate,
            text: "Meta (".concat(status, ", prioridade ").concat(priority, ")").concat(sourceDate ? ", prazo ".concat(sourceDate) : '', ": ").concat(description || ''),
            metadata: { kind: 'goal', status: status, priority: priority },
        });
    });
    sources.painRecords.forEach(function (row, index) {
        var sourceId = toStringValue(row.id) || "pain_".concat(index + 1);
        var sourceDate = toStringValue(row.record_date);
        var painLevel = toNumberValue(row.pain_level);
        var notes = toStringValue(row.notes);
        pushSourceDocument(documents, {
            sourceType: 'pain_record',
            sourceId: sourceId,
            sourceDate: sourceDate,
            text: "Registro de dor".concat(painLevel !== null ? " ".concat(painLevel, "/10") : '').concat(notes ? ": ".concat(notes) : ''),
            metadata: { kind: 'pain_record' },
        });
    });
    return documents;
}
function buildChunkDocuments(patientId, organizationId, sourceDocuments, maxChunks) {
    var chunks = [];
    var _loop_1 = function (sourceDocument) {
        var documentKey = "".concat(sourceDocument.sourceType, ":").concat(sourceDocument.sourceId);
        var splitChunks = splitIntoChunks(sourceDocument.text);
        splitChunks.forEach(function (chunkText, chunkIndex) {
            var normalizedChunk = chunkText.trim();
            if (normalizedChunk.length === 0)
                return;
            var chunkHash = (0, crypto_1.createHash)('sha256')
                .update("".concat(patientId, ":").concat(documentKey, ":").concat(chunkIndex, ":").concat(normalizedChunk))
                .digest('hex')
                .slice(0, 32);
            chunks.push({
                patientId: patientId,
                organizationId: organizationId,
                sourceType: sourceDocument.sourceType,
                sourceId: sourceDocument.sourceId,
                sourceDate: sourceDocument.sourceDate,
                documentKey: documentKey,
                chunkIndex: chunkIndex,
                chunkText: normalizedChunk,
                chunkHash: chunkHash,
                metadata: sourceDocument.metadata,
            });
        });
    };
    for (var _i = 0, sourceDocuments_1 = sourceDocuments; _i < sourceDocuments_1.length; _i++) {
        var sourceDocument = sourceDocuments_1[_i];
        _loop_1(sourceDocument);
    }
    return chunks.slice(0, Math.max(1, maxChunks));
}
function writePatientChunks(pool, patientId, chunks, embeddings) {
    return __awaiter(this, void 0, void 0, function () {
        var client, inserted, i, chunk, embedding, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    inserted = 0;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 10, 12, 13]);
                    return [4 /*yield*/, client.query('BEGIN')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, client.query('DELETE FROM patient_rag_chunks WHERE patient_id = $1', [patientId])];
                case 4:
                    _a.sent();
                    i = 0;
                    _a.label = 5;
                case 5:
                    if (!(i < chunks.length)) return [3 /*break*/, 8];
                    chunk = chunks[i];
                    embedding = embeddings[i];
                    if (!embedding || embedding.length === 0)
                        return [3 /*break*/, 7];
                    return [4 /*yield*/, client.query("\n        INSERT INTO patient_rag_chunks (\n          patient_id, organization_id, source_type, source_id, source_date,\n          document_key, chunk_index, chunk_text, chunk_hash, embedding, metadata, created_at, updated_at\n        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11::jsonb, NOW(), NOW())\n        ", [
                            chunk.patientId,
                            chunk.organizationId || null,
                            chunk.sourceType,
                            chunk.sourceId,
                            chunk.sourceDate || null,
                            chunk.documentKey,
                            chunk.chunkIndex,
                            chunk.chunkText,
                            chunk.chunkHash,
                            vectorLiteral(embedding),
                            JSON.stringify(chunk.metadata || {}),
                        ])];
                case 6:
                    _a.sent();
                    inserted += 1;
                    _a.label = 7;
                case 7:
                    i += 1;
                    return [3 /*break*/, 5];
                case 8: return [4 /*yield*/, client.query('COMMIT')];
                case 9:
                    _a.sent();
                    return [2 /*return*/, inserted];
                case 10:
                    error_2 = _a.sent();
                    return [4 /*yield*/, client.query('ROLLBACK')];
                case 11:
                    _a.sent();
                    throw error_2;
                case 12:
                    client.release();
                    return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function rebuildPatientRagIndexCore(input) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, pool, limit, dryRun, maxChunksPerPatient, patients, patientResults, indexedChunks, skippedPatients, _i, patients_1, patient, patientId, patientOrgId, sources, sourceDocuments, chunks, embeddings, padded, inserted, inserted, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    pool = (0, init_1.getPool)();
                    limit = sanitizeLimit(input.limit);
                    dryRun = sanitizeBoolean(input.dryRun);
                    maxChunksPerPatient = Math.max(20, Number(process.env.RAG_MAX_CHUNKS_PER_PATIENT || DEFAULT_MAX_CHUNKS_PER_PATIENT));
                    return [4 /*yield*/, fetchPatients(pool, __assign(__assign({}, input), { limit: limit }))];
                case 1:
                    patients = _a.sent();
                    patientResults = [];
                    indexedChunks = 0;
                    skippedPatients = 0;
                    _i = 0, patients_1 = patients;
                    _a.label = 2;
                case 2:
                    if (!(_i < patients_1.length)) return [3 /*break*/, 12];
                    patient = patients_1[_i];
                    patientId = toStringValue(patient.id);
                    if (!patientId) {
                        skippedPatients += 1;
                        return [3 /*break*/, 11];
                    }
                    patientOrgId = toStringValue(patient.organization_id) || input.organizationId;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 10, , 11]);
                    return [4 /*yield*/, fetchPatientSources(pool, patientId, patientOrgId)];
                case 4:
                    sources = _a.sent();
                    sourceDocuments = buildSourceDocuments(patient, sources);
                    chunks = buildChunkDocuments(patientId, patientOrgId, sourceDocuments, maxChunksPerPatient);
                    if (chunks.length === 0) {
                        skippedPatients += 1;
                        patientResults.push({ patientId: patientId, chunkCount: 0, status: 'skipped' });
                        return [3 /*break*/, 11];
                    }
                    if (dryRun) {
                        indexedChunks += chunks.length;
                        patientResults.push({ patientId: patientId, chunkCount: chunks.length, status: 'indexed' });
                        return [3 /*break*/, 11];
                    }
                    return [4 /*yield*/, (0, vertex_embeddings_1.generateEmbeddingsForTexts)(chunks.map(function (chunk) { return chunk.chunkText; }))];
                case 5:
                    embeddings = _a.sent();
                    if (embeddings.length === 0) {
                        skippedPatients += 1;
                        patientResults.push({
                            patientId: patientId,
                            chunkCount: chunks.length,
                            status: 'error',
                            error: 'Embedding generation returned no vectors',
                        });
                        return [3 /*break*/, 11];
                    }
                    if (!(embeddings.length !== chunks.length)) return [3 /*break*/, 7];
                    padded = __spreadArray([], embeddings, true);
                    while (padded.length < chunks.length)
                        padded.push([]);
                    return [4 /*yield*/, writePatientChunks(pool, patientId, chunks, padded)];
                case 6:
                    inserted = _a.sent();
                    indexedChunks += inserted;
                    patientResults.push({
                        patientId: patientId,
                        chunkCount: inserted,
                        status: inserted > 0 ? 'indexed' : 'error',
                        error: inserted > 0 ? undefined : 'No chunks inserted',
                    });
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, writePatientChunks(pool, patientId, chunks, embeddings)];
                case 8:
                    inserted = _a.sent();
                    indexedChunks += inserted;
                    patientResults.push({ patientId: patientId, chunkCount: inserted, status: 'indexed' });
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_3 = _a.sent();
                    skippedPatients += 1;
                    patientResults.push({
                        patientId: patientId,
                        chunkCount: 0,
                        status: 'error',
                        error: error_3.message,
                    });
                    return [3 /*break*/, 11];
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/, {
                        success: true,
                        mode: dryRun ? 'dry-run' : 'write',
                        processedPatients: patients.length,
                        indexedChunks: indexedChunks,
                        skippedPatients: skippedPatients,
                        patients: patientResults,
                        durationMs: Date.now() - startTime,
                    }];
            }
        });
    });
}
function isPatientRagIndexingEnabled() {
    return process.env.ENABLE_PGVECTOR_RAG === 'true';
}
function triggerPatientRagReindex(input) {
    return __awaiter(this, void 0, void 0, function () {
        var patientId, output, patientResult, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isPatientRagIndexingEnabled()) {
                        return [2 /*return*/, { success: false, indexedChunks: 0 }];
                    }
                    patientId = toStringValue(input.patientId);
                    if (!patientId) {
                        return [2 /*return*/, { success: false, indexedChunks: 0 }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, rebuildPatientRagIndexCore({
                            patientId: patientId,
                            organizationId: toStringValue(input.organizationId),
                            limit: 1,
                            dryRun: false,
                        })];
                case 2:
                    output = _a.sent();
                    patientResult = output.patients[0];
                    if ((patientResult === null || patientResult === void 0 ? void 0 : patientResult.status) === 'error') {
                        logger.warn('Incremental patient RAG reindex returned error status', {
                            patientId: patientId,
                            reason: input.reason || 'unspecified',
                            error: patientResult.error,
                        });
                        return [2 /*return*/, { success: false, indexedChunks: 0 }];
                    }
                    logger.info('Incremental patient RAG reindex completed', {
                        patientId: patientId,
                        reason: input.reason || 'unspecified',
                        indexedChunks: (patientResult === null || patientResult === void 0 ? void 0 : patientResult.chunkCount) || 0,
                        mode: output.mode,
                        durationMs: output.durationMs,
                    });
                    return [2 /*return*/, {
                            success: true,
                            indexedChunks: (patientResult === null || patientResult === void 0 ? void 0 : patientResult.chunkCount) || 0,
                        }];
                case 3:
                    error_4 = _a.sent();
                    logger.warn('Incremental patient RAG reindex failed', {
                        patientId: patientId,
                        reason: input.reason || 'unspecified',
                        error: error_4.message,
                    });
                    return [2 /*return*/, { success: false, indexedChunks: 0 }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function clearPatientRagIndex(patientId, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedPatientId, pool, result, _a, deletedChunks, error_5;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isPatientRagIndexingEnabled()) {
                        return [2 /*return*/, { success: false, deletedChunks: 0 }];
                    }
                    normalizedPatientId = toStringValue(patientId);
                    if (!normalizedPatientId) {
                        return [2 /*return*/, { success: false, deletedChunks: 0 }];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    pool = (0, init_1.getPool)();
                    if (!organizationId) return [3 /*break*/, 3];
                    return [4 /*yield*/, pool.query('DELETE FROM patient_rag_chunks WHERE patient_id = $1 AND organization_id = $2', [normalizedPatientId, organizationId])];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, pool.query('DELETE FROM patient_rag_chunks WHERE patient_id = $1', [normalizedPatientId])];
                case 4:
                    _a = _c.sent();
                    _c.label = 5;
                case 5:
                    result = _a;
                    deletedChunks = (_b = result.rowCount) !== null && _b !== void 0 ? _b : 0;
                    logger.info('Cleared patient RAG chunks', {
                        patientId: normalizedPatientId,
                        organizationId: organizationId || null,
                        deletedChunks: deletedChunks,
                    });
                    return [2 /*return*/, { success: true, deletedChunks: deletedChunks }];
                case 6:
                    error_5 = _c.sent();
                    logger.warn('Failed to clear patient RAG chunks', {
                        patientId: normalizedPatientId,
                        organizationId: organizationId || null,
                        error: error_5.message,
                    });
                    return [2 /*return*/, { success: false, deletedChunks: 0 }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
var rebuildPatientRagIndexHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentication required');
                }
                return [4 /*yield*/, assertAdmin(request.auth.uid)];
            case 1:
                _b.sent();
                data = (request.data || {});
                return [2 /*return*/, rebuildPatientRagIndexCore({
                        patientId: toStringValue(data.patientId),
                        organizationId: toStringValue(data.organizationId),
                        limit: sanitizeLimit(data.limit),
                        dryRun: sanitizeBoolean(data.dryRun),
                    })];
        }
    });
}); };
exports.rebuildPatientRagIndexHandler = rebuildPatientRagIndexHandler;
var rebuildPatientRagIndexHttpHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, body, result, error_6;
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
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                body = parseBody(req);
                return [4 /*yield*/, rebuildPatientRagIndexCore({
                        patientId: toStringValue(body.patientId),
                        organizationId: toStringValue(body.organizationId),
                        limit: sanitizeLimit(body.limit),
                        dryRun: sanitizeBoolean(body.dryRun),
                    })];
            case 2:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                res.status(500).json({
                    success: false,
                    error: error_6.message,
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.rebuildPatientRagIndexHttpHandler = rebuildPatientRagIndexHttpHandler;
