"use strict";
/**
 * Lista templates de avaliação
 */
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssessmentHttp = exports.createAssessmentHttp = exports.getAssessmentHttp = exports.listAssessmentsHttp = exports.getAssessmentTemplateHttp = exports.listAssessmentTemplatesHttp = void 0;
exports.listAssessmentsHandler = listAssessmentsHandler;
exports.getAssessmentHandler = getAssessmentHandler;
exports.createAssessmentHandler = createAssessmentHandler;
exports.updateAssessmentHandler = updateAssessmentHandler;
exports.listAssessmentTemplatesHandler = listAssessmentTemplatesHandler;
exports.getAssessmentTemplateHandler = getAssessmentTemplateHandler;
var init_1 = require("../init");
var https_1 = require("firebase-functions/v2/https");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
function getAuthHeader(req) {
    var _a, _b;
    var h = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization);
    return Array.isArray(h) ? h[0] : h;
}
function parseBody(req) {
    return typeof req.body === 'string' ? (function () { try {
        return JSON.parse(req.body || '{}');
    }
    catch (_a) {
        return {};
    } })() : (req.body || {});
}
// ============================================================================
// HTTP VERSIONS (CORS fix)
// ============================================================================
// Configuração manual de CORS para evitar conflitos
// Usando any para evitar erros de tipagem estrita no HttpsOptions
var ASSESSMENT_HTTP_OPTS = {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
};
exports.listAssessmentTemplatesHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, pool, result, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT id, name, description, category, is_global, display_order, is_active, created_at, updated_at \n       FROM assessment_templates WHERE is_active = true AND (organization_id = $1 OR is_global = true) \n       ORDER BY display_order, name", [auth.organizationId])];
            case 3:
                result = _a.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 5];
            case 4:
                e_1 = _a.sent();
                if (e_1 instanceof https_1.HttpsError && e_1.code === 'unauthenticated') {
                    res.status(401).json({ error: e_1.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('listAssessmentTemplatesHttp:', e_1);
                res.status(500).json({ error: e_1 instanceof Error ? e_1.message : 'Erro ao listar templates' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getAssessmentTemplateHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, templateId, pool, templateResult, template, sectionsResult, sectionIds, sectionsWithQuestions_1, questionsResult, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 7, , 8]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                templateId = parseBody(req).templateId;
                if (!templateId) {
                    res.status(400).json({ error: 'templateId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT * FROM assessment_templates WHERE id = $1 AND is_active = true AND (organization_id = $2 OR is_global = true)", [templateId, auth.organizationId])];
            case 3:
                templateResult = _a.sent();
                if (templateResult.rows.length === 0) {
                    res.status(404).json({ error: 'Template não encontrado' });
                    return [2 /*return*/];
                }
                template = templateResult.rows[0];
                return [4 /*yield*/, pool.query("SELECT * FROM assessment_sections WHERE template_id = $1 AND is_active = true ORDER BY \"order\"", [templateId])];
            case 4:
                sectionsResult = _a.sent();
                sectionIds = sectionsResult.rows.map(function (s) { return s.id; });
                sectionsWithQuestions_1 = sectionsResult.rows.map(function (s) { return (__assign(__assign({}, s), { questions: [] })); });
                if (!(sectionIds.length > 0)) return [3 /*break*/, 6];
                return [4 /*yield*/, pool.query("SELECT * FROM assessment_questions WHERE section_id = ANY($1) AND is_active = true ORDER BY section_id, \"order\"", [sectionIds])];
            case 5:
                questionsResult = _a.sent();
                questionsResult.rows.forEach(function (q) {
                    var section = sectionsWithQuestions_1.find(function (s) { return s.id === q.section_id; });
                    if (section)
                        section.questions.push(q);
                });
                _a.label = 6;
            case 6:
                res.json({ data: __assign(__assign({}, template), { sections: sectionsWithQuestions_1 }) });
                return [3 /*break*/, 8];
            case 7:
                e_2 = _a.sent();
                if (e_2 instanceof https_1.HttpsError && e_2.code === 'unauthenticated') {
                    res.status(401).json({ error: e_2.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getAssessmentTemplateHttp:', e_2);
                res.status(500).json({ error: e_2 instanceof Error ? e_2.message : 'Erro ao buscar template' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
exports.listAssessmentsHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, status_1, pool, query, params, result, e_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                _a = parseBody(req), patientId = _a.patientId, status_1 = _a.status;
                if (!patientId) {
                    res.status(400).json({ error: 'patientId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                query = "SELECT a.*, t.name as template_name, p.full_name as performer_name FROM patient_assessments a LEFT JOIN assessment_templates t ON a.template_id = t.id LEFT JOIN profiles p ON a.performed_by = p.user_id WHERE a.patient_id = $1 AND a.organization_id = $2";
                params = [patientId, auth.organizationId];
                if (status_1) {
                    query += " AND a.status = $3";
                    params.push(status_1);
                }
                query += " ORDER BY a.assessment_date DESC, a.created_at DESC";
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _b.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 5];
            case 4:
                e_3 = _b.sent();
                if (e_3 instanceof https_1.HttpsError && e_3.code === 'unauthenticated') {
                    res.status(401).json({ error: e_3.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('listAssessmentsHttp:', e_3);
                res.status(500).json({ error: e_3 instanceof Error ? e_3.message : 'Erro ao listar avaliações' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.getAssessmentHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, assessmentId, pool, assessmentResult, assessment, responsesResult, e_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _a.sent();
                assessmentId = parseBody(req).assessmentId;
                if (!assessmentId) {
                    res.status(400).json({ error: 'assessmentId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2", [assessmentId, auth.organizationId])];
            case 3:
                assessmentResult = _a.sent();
                if (assessmentResult.rows.length === 0) {
                    res.status(404).json({ error: 'Avaliação não encontrada' });
                    return [2 /*return*/];
                }
                assessment = assessmentResult.rows[0];
                return [4 /*yield*/, pool.query("SELECT ar.*, q.question_text, q.answer_type, q.options FROM assessment_responses ar LEFT JOIN assessment_questions q ON ar.question_id = q.id WHERE ar.assessment_id = $1 ORDER BY q.section_id, q.order", [assessmentId])];
            case 4:
                responsesResult = _a.sent();
                res.json({ data: __assign(__assign({}, assessment), { responses: responsesResult.rows }) });
                return [3 /*break*/, 6];
            case 5:
                e_4 = _a.sent();
                if (e_4 instanceof https_1.HttpsError && e_4.code === 'unauthenticated') {
                    res.status(401).json({ error: e_4.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('getAssessmentHttp:', e_4);
                res.status(500).json({ error: e_4 instanceof Error ? e_4.message : 'Erro ao buscar avaliação' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.createAssessmentHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, templateId, title, assessmentDate, responses, pool, templateCheck, assessmentResult, assessment, _i, responses_1, response, e_5, e_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 15, , 16]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _b.sent();
                _a = parseBody(req), patientId = _a.patientId, templateId = _a.templateId, title = _a.title, assessmentDate = _a.assessmentDate, responses = _a.responses;
                if (!patientId || !templateId) {
                    res.status(400).json({ error: 'patientId e templateId são obrigatórios' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT id FROM assessment_templates WHERE id = $1 AND is_active = true", [templateId])];
            case 3:
                templateCheck = _b.sent();
                if (templateCheck.rows.length === 0) {
                    res.status(404).json({ error: 'Template não encontrado' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query('BEGIN')];
            case 4:
                _b.sent();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 12, , 14]);
                return [4 /*yield*/, pool.query("INSERT INTO patient_assessments (patient_id, template_id, title, assessment_date, performed_by, organization_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [patientId, templateId, title || 'Avaliação', assessmentDate || new Date().toISOString().split('T')[0], auth.userId, auth.organizationId, 'completed'])];
            case 6:
                assessmentResult = _b.sent();
                assessment = assessmentResult.rows[0];
                if (!(responses && Array.isArray(responses))) return [3 /*break*/, 10];
                _i = 0, responses_1 = responses;
                _b.label = 7;
            case 7:
                if (!(_i < responses_1.length)) return [3 /*break*/, 10];
                response = responses_1[_i];
                return [4 /*yield*/, pool.query("INSERT INTO assessment_responses (assessment_id, question_id, answer_text, answer_number, answer_json) VALUES ($1, $2, $3, $4, $5)", [assessment.id, response.question_id, response.answer_text || null, response.answer_number || null, response.answer_json ? JSON.stringify(response.answer_json) : null])];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10: return [4 /*yield*/, pool.query('COMMIT')];
            case 11:
                _b.sent();
                res.status(201).json({ data: assessment });
                return [3 /*break*/, 14];
            case 12:
                e_5 = _b.sent();
                return [4 /*yield*/, pool.query('ROLLBACK')];
            case 13:
                _b.sent();
                throw e_5;
            case 14: return [3 /*break*/, 16];
            case 15:
                e_6 = _b.sent();
                if (e_6 instanceof https_1.HttpsError && e_6.code === 'unauthenticated') {
                    res.status(401).json({ error: e_6.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('createAssessmentHttp:', e_6);
                res.status(500).json({ error: e_6 instanceof Error ? e_6.message : 'Erro ao criar avaliação' });
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); });
exports.updateAssessmentHttp = (0, https_1.onRequest)(ASSESSMENT_HTTP_OPTS, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, assessmentId, responses, updates, pool, existing, allowedFields, setClauses, values, pCount, _i, allowedFields_1, field, _b, responses_2, response, e_7, e_8;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    (0, cors_1.setCorsHeaders)(res);
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                (0, cors_1.setCorsHeaders)(res);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 17, , 18]);
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(getAuthHeader(req)))];
            case 2:
                auth = _c.sent();
                _a = parseBody(req), assessmentId = _a.assessmentId, responses = _a.responses, updates = __rest(_a, ["assessmentId", "responses"]);
                if (!assessmentId) {
                    res.status(400).json({ error: 'assessmentId é obrigatório' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2', [assessmentId, auth.organizationId])];
            case 3:
                existing = _c.sent();
                if (existing.rows.length === 0) {
                    res.status(404).json({ error: 'Avaliação não encontrada' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, pool.query('BEGIN')];
            case 4:
                _c.sent();
                _c.label = 5;
            case 5:
                _c.trys.push([5, 14, , 16]);
                allowedFields = ['title', 'status', 'conclusion', 'recommendations', 'next_assessment_date'];
                setClauses = [];
                values = [];
                pCount = 0;
                for (_i = 0, allowedFields_1 = allowedFields; _i < allowedFields_1.length; _i++) {
                    field = allowedFields_1[_i];
                    if (field in updates) {
                        pCount++;
                        setClauses.push("".concat(field, " = $").concat(pCount));
                        values.push(updates[field]);
                    }
                }
                if (!(setClauses.length > 0)) return [3 /*break*/, 7];
                pCount++;
                setClauses.push("updated_at = $".concat(pCount));
                values.push(new Date());
                values.push(assessmentId, auth.organizationId);
                return [4 /*yield*/, pool.query("UPDATE patient_assessments SET ".concat(setClauses.join(', '), " WHERE id = $").concat(pCount + 1, " AND organization_id = $").concat(pCount + 2), values)];
            case 6:
                _c.sent();
                _c.label = 7;
            case 7:
                if (!(responses && Array.isArray(responses))) return [3 /*break*/, 12];
                return [4 /*yield*/, pool.query('DELETE FROM assessment_responses WHERE assessment_id = $1', [assessmentId])];
            case 8:
                _c.sent();
                _b = 0, responses_2 = responses;
                _c.label = 9;
            case 9:
                if (!(_b < responses_2.length)) return [3 /*break*/, 12];
                response = responses_2[_b];
                return [4 /*yield*/, pool.query("INSERT INTO assessment_responses (assessment_id, question_id, answer_text, answer_number, answer_json) VALUES ($1, $2, $3, $4, $5)", [assessmentId, response.question_id, response.answer_text || null, response.answer_number || null, response.answer_json ? JSON.stringify(response.answer_json) : null])];
            case 10:
                _c.sent();
                _c.label = 11;
            case 11:
                _b++;
                return [3 /*break*/, 9];
            case 12: return [4 /*yield*/, pool.query('COMMIT')];
            case 13:
                _c.sent();
                res.json({ success: true });
                return [3 /*break*/, 16];
            case 14:
                e_7 = _c.sent();
                return [4 /*yield*/, pool.query('ROLLBACK')];
            case 15:
                _c.sent();
                throw e_7;
            case 16: return [3 /*break*/, 18];
            case 17:
                e_8 = _c.sent();
                if (e_8 instanceof https_1.HttpsError && e_8.code === 'unauthenticated') {
                    res.status(401).json({ error: e_8.message });
                    return [2 /*return*/];
                }
                logger_1.logger.error('updateAssessmentHttp:', e_8);
                res.status(500).json({ error: e_8 instanceof Error ? e_8.message : 'Erro ao atualizar avaliação' });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// INTERFACES & CALLABLE
// ============================================================================
// Handlers for unified service (callable wrapper)
function listAssessmentsHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // For now, just return empty - the HTTP versions handle the actual logic
            return [2 /*return*/, { data: [] }];
        });
    });
}
function getAssessmentHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { data: null }];
        });
    });
}
function createAssessmentHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: false, message: 'Use HTTP endpoints' }];
        });
    });
}
function updateAssessmentHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { success: false, message: 'Use HTTP endpoints' }];
        });
    });
}
function listAssessmentTemplatesHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { data: [] }];
        });
    });
}
function getAssessmentTemplateHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, { data: null }];
        });
    });
}
