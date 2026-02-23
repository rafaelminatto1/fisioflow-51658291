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
exports.retrievePatientKnowledgeContext = retrievePatientKnowledgeContext;
var init_1 = require("../../init");
var logger_1 = require("../../lib/logger");
var vertex_embeddings_1 = require("./vertex-embeddings");
var logger = (0, logger_1.getLogger)('ai-patient-rag');
var DEFAULT_MAX_SNIPPETS = 8;
var DEFAULT_MAX_LEXICAL_CANDIDATES = 48;
var MAX_SNIPPET_TEXT_LENGTH = 320;
var MAX_VECTOR_SNIPPETS = 4;
var STOPWORDS = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'para', 'por', 'com', 'sem', 'na', 'no', 'nas', 'nos', 'em', 'que', 'se', 'ao', 'aos',
    'the', 'and', 'for', 'with', 'without', 'from', 'this', 'that', 'you', 'your', 'about',
]);
function toStringValue(value) {
    if (typeof value !== 'string')
        return undefined;
    var normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function truncateText(value, maxLength) {
    if (maxLength === void 0) { maxLength = MAX_SNIPPET_TEXT_LENGTH; }
    if (value.length <= maxLength)
        return value;
    return "".concat(value.slice(0, maxLength - 3), "...");
}
function normalizeText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function tokenize(text) {
    return normalizeText(text)
        .split(/[^a-z0-9]+/g)
        .filter(function (token) { return token.length >= 3 && !STOPWORDS.has(token); });
}
function scoreChunk(questionTokens, chunk) {
    var chunkTokens = tokenize(chunk.text);
    if (chunkTokens.length === 0)
        return 0;
    var chunkTokenSet = new Set(chunkTokens);
    var overlapCount = 0;
    questionTokens.forEach(function (token) {
        if (chunkTokenSet.has(token))
            overlapCount += 1;
    });
    var overlapScore = questionTokens.size > 0 ? overlapCount / questionTokens.size : 0;
    var densityScore = overlapCount / chunkTokens.length;
    var sourceBoost = chunk.sourceType === 'treatment_session' ? 0.12 :
        chunk.sourceType === 'medical_record' ? 0.09 :
            chunk.sourceType === 'pain_record' ? 0.06 :
                chunk.sourceType === 'goal' ? 0.04 :
                    0.02;
    var recencyBoost = 0;
    if (chunk.date) {
        var ageDays = Math.max(0, (Date.now() - new Date(chunk.date).getTime()) / (1000 * 60 * 60 * 24));
        recencyBoost = Math.max(0, 0.08 - ageDays * 0.0015);
    }
    return overlapScore * 0.72 + densityScore * 0.16 + sourceBoost + recencyBoost;
}
function splitIntoChunks(text, chunkSize, overlap) {
    if (chunkSize === void 0) { chunkSize = 460; }
    if (overlap === void 0) { overlap = 80; }
    if (text.length <= chunkSize)
        return [text];
    var chunks = [];
    var start = 0;
    while (start < text.length) {
        var end = Math.min(text.length, start + chunkSize);
        chunks.push(text.slice(start, end));
        if (end >= text.length)
            break;
        start = Math.max(0, end - overlap);
    }
    return chunks;
}
function mapTreatmentSessions(rows) {
    return rows
        .flatMap(function (row) {
        var date = toStringValue(row.session_date) || toStringValue(row.created_at);
        var body = [
            toStringValue(row.evolution),
            toStringValue(row.observations),
            toStringValue(row.next_session_goals),
        ]
            .filter(function (value) { return !!value; })
            .join('\n');
        if (!body)
            return [];
        var painBefore = typeof row.pain_level_before === 'number'
            ? "Dor antes: ".concat(row.pain_level_before, "/10. ")
            : '';
        var painAfter = typeof row.pain_level_after === 'number'
            ? "Dor apos: ".concat(row.pain_level_after, "/10. ")
            : '';
        var fullText = "".concat(painBefore).concat(painAfter).concat(body);
        return splitIntoChunks(fullText).map(function (chunk) { return ({
            sourceType: 'treatment_session',
            date: date,
            text: truncateText(chunk),
        }); });
    });
}
function mapMedicalRecords(rows) {
    return rows.flatMap(function (row) {
        var date = toStringValue(row.record_date) || toStringValue(row.created_at);
        var title = toStringValue(row.title);
        var type = toStringValue(row.type);
        var content = toStringValue(row.content);
        if (!content)
            return [];
        var headerParts = [type ? "[".concat(type, "]") : '', title || ''];
        var header = headerParts.filter(Boolean).join(' ').trim();
        var fullText = header ? "".concat(header, "\n").concat(content) : content;
        return splitIntoChunks(fullText).map(function (chunk) { return ({
            sourceType: 'medical_record',
            date: date,
            text: truncateText(chunk),
        }); });
    });
}
function mapGoals(rows) {
    var chunks = [];
    rows.forEach(function (row) {
        var description = toStringValue(row.description);
        if (!description)
            return;
        var status = toStringValue(row.status) || 'sem_status';
        var priority = toStringValue(row.priority) || 'sem_prioridade';
        var targetDate = toStringValue(row.target_date);
        var text = "Meta (".concat(status, ", prioridade ").concat(priority, ")").concat(targetDate ? ", prazo ".concat(targetDate) : '', ": ").concat(description);
        chunks.push({
            sourceType: 'goal',
            date: targetDate || undefined,
            text: truncateText(text),
        });
    });
    return chunks;
}
function mapPainRecords(rows) {
    var chunks = [];
    rows.forEach(function (row) {
        var date = toStringValue(row.record_date) || toStringValue(row.created_at);
        var level = typeof row.pain_level === 'number' ? row.pain_level : null;
        var notes = toStringValue(row.notes);
        if (level === null && !notes)
            return;
        var text = "Registro de dor".concat(level !== null ? " ".concat(level, "/10") : '').concat(notes ? ": ".concat(notes) : '');
        chunks.push({
            sourceType: 'pain_record',
            date: date,
            text: truncateText(text),
        });
    });
    return chunks;
}
function resolveOrganizationId(userId, providedOrganizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (providedOrganizationId)
                        return [2 /*return*/, providedOrganizationId];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT organization_id FROM profiles WHERE user_id = $1 LIMIT 1', [userId])];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, toStringValue((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.organization_id)];
                case 3:
                    error_1 = _b.sent();
                    logger.warn('Failed to resolve organization_id for RAG', {
                        userId: userId,
                        error: error_1.message,
                    });
                    return [2 /*return*/, undefined];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getVertexQueryEmbedding(text) {
    return __awaiter(this, void 0, void 0, function () {
        var enabled;
        return __generator(this, function (_a) {
            enabled = process.env.ENABLE_PGVECTOR_RAG === 'true';
            if (!enabled)
                return [2 /*return*/, null];
            return [2 /*return*/, (0, vertex_embeddings_1.generateEmbeddingForText)(text)];
        });
    });
}
function queryVectorChunks(patientId, organizationId, queryEmbedding) {
    return __awaiter(this, void 0, void 0, function () {
        var vectorLiteral, pool, whereOrgClause, params, sql, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!queryEmbedding || queryEmbedding.length === 0)
                        return [2 /*return*/, []];
                    vectorLiteral = "[".concat(queryEmbedding.map(function (value) { return Number(value).toFixed(6); }).join(','), "]");
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    whereOrgClause = organizationId ? 'AND organization_id = $2' : '';
                    params = organizationId
                        ? [patientId, organizationId, vectorLiteral, MAX_VECTOR_SNIPPETS]
                        : [patientId, vectorLiteral, MAX_VECTOR_SNIPPETS];
                    sql = organizationId
                        ? "\n          SELECT chunk_text, source_type, source_date,\n            1 - (embedding <=> $3::vector) AS similarity\n          FROM patient_rag_chunks\n          WHERE patient_id = $1\n            ".concat(whereOrgClause, "\n          ORDER BY embedding <=> $3::vector\n          LIMIT $4\n        ")
                        : "\n          SELECT chunk_text, source_type, source_date,\n            1 - (embedding <=> $2::vector) AS similarity\n          FROM patient_rag_chunks\n          WHERE patient_id = $1\n          ORDER BY embedding <=> $2::vector\n          LIMIT $3\n        ";
                    return [4 /*yield*/, pool.query(sql, params)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows
                            .map(function (row) { return ({
                            sourceType: 'vector_chunk',
                            date: toStringValue(row.source_date),
                            text: truncateText(toStringValue(row.chunk_text) || ''),
                            score: typeof row.similarity === 'number' ? row.similarity : 0,
                        }); })
                            .filter(function (snippet) { return snippet.text.length > 0; })];
                case 3:
                    error_2 = _a.sent();
                    logger.warn('Vector retrieval unavailable; continuing with lexical RAG', {
                        error: error_2.message,
                    });
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function retrievePatientKnowledgeContext(input) {
    return __awaiter(this, void 0, void 0, function () {
        var maxSnippets, organizationId, output, pool_1, emptyResult_1, safeQuery, patientQuery, sessionsQuery, medicalRecordsQuery, goalsQuery, painQuery, _a, patientRes, sessionsRes, medicalRes, goalsRes, painRes, patient, mergedPainRows, lexicalCandidates, questionTokens_1, scoredLexical, queryEmbedding, vectorSnippets, combined, error_3;
        var _this = this;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    maxSnippets = Math.max(1, (_b = input.maxSnippets) !== null && _b !== void 0 ? _b : DEFAULT_MAX_SNIPPETS);
                    return [4 /*yield*/, resolveOrganizationId(input.userId, input.organizationId)];
                case 1:
                    organizationId = _d.sent();
                    output = {
                        organizationId: organizationId,
                        retrievalMode: 'none',
                        snippets: [],
                    };
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 6, , 7]);
                    pool_1 = (0, init_1.getPool)();
                    emptyResult_1 = {
                        command: 'SELECT',
                        rowCount: 0,
                        oid: 0,
                        fields: [],
                        rows: [],
                    };
                    safeQuery = function (label, sql, params) { return __awaiter(_this, void 0, void 0, function () {
                        var error_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, pool_1.query(sql, params)];
                                case 1: return [2 /*return*/, _a.sent()];
                                case 2:
                                    error_4 = _a.sent();
                                    logger.warn("RAG source query failed (".concat(label, ")"), {
                                        patientId: input.patientId,
                                        error: error_4.message,
                                    });
                                    return [2 /*return*/, emptyResult_1];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); };
                    patientQuery = organizationId
                        ? safeQuery('patient', 'SELECT id, name, main_condition, organization_id FROM patients WHERE id = $1 AND organization_id = $2 LIMIT 1', [input.patientId, organizationId])
                        : safeQuery('patient', 'SELECT id, name, main_condition, organization_id FROM patients WHERE id = $1 LIMIT 1', [input.patientId]);
                    sessionsQuery = organizationId
                        ? safeQuery('treatment_sessions', "SELECT session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after, created_at\n         FROM treatment_sessions\n         WHERE patient_id = $1 AND organization_id = $2\n         ORDER BY session_date DESC, created_at DESC\n         LIMIT $3", [input.patientId, organizationId, DEFAULT_MAX_LEXICAL_CANDIDATES])
                        : safeQuery('treatment_sessions', "SELECT session_date, evolution, observations, next_session_goals, pain_level_before, pain_level_after, created_at\n         FROM treatment_sessions\n         WHERE patient_id = $1\n         ORDER BY session_date DESC, created_at DESC\n         LIMIT $2", [input.patientId, DEFAULT_MAX_LEXICAL_CANDIDATES]);
                    medicalRecordsQuery = organizationId
                        ? safeQuery('medical_records', "SELECT record_date, type, title, content, created_at\n         FROM medical_records\n         WHERE patient_id = $1 AND organization_id = $2\n         ORDER BY record_date DESC, created_at DESC\n         LIMIT $3", [input.patientId, organizationId, DEFAULT_MAX_LEXICAL_CANDIDATES])
                        : safeQuery('medical_records', "SELECT record_date, type, title, content, created_at\n         FROM medical_records\n         WHERE patient_id = $1\n         ORDER BY record_date DESC, created_at DESC\n         LIMIT $2", [input.patientId, DEFAULT_MAX_LEXICAL_CANDIDATES]);
                    goalsQuery = organizationId
                        ? safeQuery('patient_goals', "SELECT description, status, priority, target_date\n         FROM patient_goals\n         WHERE patient_id = $1 AND organization_id = $2\n         ORDER BY target_date DESC NULLS LAST\n         LIMIT $3", [input.patientId, organizationId, 20])
                        : safeQuery('patient_goals', "SELECT description, status, priority, target_date\n         FROM patient_goals\n         WHERE patient_id = $1\n         ORDER BY target_date DESC NULLS LAST\n         LIMIT $2", [input.patientId, 20]);
                    painQuery = organizationId
                        ? safeQuery('patient_pain_records', "SELECT created_at, pain_level, notes, record_date\n         FROM patient_pain_records\n         WHERE patient_id = $1 AND organization_id = $2\n         ORDER BY created_at DESC\n         LIMIT $3", [input.patientId, organizationId, 30])
                        : safeQuery('patient_pain_records', "SELECT created_at, pain_level, notes, record_date\n         FROM patient_pain_records\n         WHERE patient_id = $1\n         ORDER BY created_at DESC\n         LIMIT $2", [input.patientId, 30]);
                    return [4 /*yield*/, Promise.all([
                            patientQuery,
                            sessionsQuery,
                            medicalRecordsQuery,
                            goalsQuery,
                            painQuery,
                        ])];
                case 3:
                    _a = _d.sent(), patientRes = _a[0], sessionsRes = _a[1], medicalRes = _a[2], goalsRes = _a[3], painRes = _a[4];
                    patient = patientRes.rows[0];
                    if (patient) {
                        output.patientName = toStringValue(patient.name);
                        output.patientCondition = toStringValue(patient.main_condition);
                    }
                    output.sessionCount = (_c = sessionsRes.rowCount) !== null && _c !== void 0 ? _c : undefined;
                    mergedPainRows = __spreadArray([], painRes.rows.map(function (row) { return (__assign(__assign({}, row), { record_date: toStringValue(row.created_at) || toStringValue(row.record_date) })); }), true);
                    lexicalCandidates = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], mapTreatmentSessions(sessionsRes.rows), true), mapMedicalRecords(medicalRes.rows), true), mapGoals(goalsRes.rows), true), mapPainRecords(mergedPainRows), true);
                    questionTokens_1 = new Set(tokenize(input.question));
                    scoredLexical = lexicalCandidates
                        .map(function (chunk) { return (__assign(__assign({}, chunk), { score: scoreChunk(questionTokens_1, chunk) })); })
                        .filter(function (chunk) { return chunk.score > 0; })
                        .sort(function (a, b) { return b.score - a.score; })
                        .slice(0, maxSnippets)
                        .map(function (chunk) { return ({
                        sourceType: chunk.sourceType,
                        date: chunk.date,
                        text: chunk.text,
                        score: chunk.score,
                    }); });
                    return [4 /*yield*/, getVertexQueryEmbedding(input.question)];
                case 4:
                    queryEmbedding = _d.sent();
                    return [4 /*yield*/, queryVectorChunks(input.patientId, organizationId, queryEmbedding)];
                case 5:
                    vectorSnippets = _d.sent();
                    combined = __spreadArray(__spreadArray([], vectorSnippets, true), scoredLexical, true).sort(function (a, b) { return b.score - a.score; })
                        .slice(0, maxSnippets);
                    output.snippets = combined;
                    output.retrievalMode = vectorSnippets.length > 0
                        ? 'hybrid'
                        : (scoredLexical.length > 0 ? 'lexical' : 'none');
                    return [2 /*return*/, output];
                case 6:
                    error_3 = _d.sent();
                    logger.warn('Patient RAG retrieval failed; returning empty context', {
                        patientId: input.patientId,
                        userId: input.userId,
                        error: error_3.message,
                    });
                    return [2 /*return*/, output];
                case 7: return [2 /*return*/];
            }
        });
    });
}
