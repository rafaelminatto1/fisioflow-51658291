"use strict";
/**
 * AI Reports System
 * Auto-generated clinical and administrative reports using Vertex AI
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledWeeklyReport = exports.scheduledDailyReport = exports.downloadReport = exports.getReport = exports.listReports = exports.generateAIReport = exports.ReportType = void 0;
var https_1 = require("firebase-functions/v2/https");
var scheduler_1 = require("firebase-functions/v2/scheduler");
var vertexai_1 = require("@google-cloud/vertexai");
var admin = require("firebase-admin");
var logger_1 = require("../lib/logger");
var idempotency_1 = require("../lib/idempotency");
var logger = (0, logger_1.getLogger)('ai-reports');
var db = admin.firestore();
/**
 * Report types
 */
var ReportType;
(function (ReportType) {
    ReportType["PATIENT_PROGRESS"] = "patient_progress";
    ReportType["TREATMENT_SUMMARY"] = "treatment_summary";
    ReportType["CLINICAL_OUTCOMES"] = "clinical_outcomes";
    ReportType["APPOINTMENT_ANALYTICS"] = "appointment_analytics";
    ReportType["REVENUE_REPORT"] = "revenue_report";
    ReportType["DAILY_SUMMARY"] = "daily_summary";
    ReportType["WEEKLY_SUMMARY"] = "weekly_summary";
    ReportType["MONTHLY_SUMMARY"] = "monthly_summary";
})(ReportType || (exports.ReportType = ReportType = {}));
/**
 * Generate AI report
 */
exports.generateAIReport = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 180,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, type, organizationId, patientId, startDate, endDate, _b, includeRecommendations, _c, format, end_1, start_1, reportData_1, cacheParams, report, reportRef, error_1;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                data = request.data;
                userId = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid;
                if (!userId) {
                    throw new https_2.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, type = _a.type, organizationId = _a.organizationId, patientId = _a.patientId, startDate = _a.startDate, endDate = _a.endDate, _b = _a.includeRecommendations, includeRecommendations = _b === void 0 ? true : _b, _c = _a.format, format = _c === void 0 ? 'markdown' : _c;
                if (!type || !organizationId) {
                    throw new https_2.HttpsError('invalid-argument', 'type and organizationId are required');
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 5, , 6]);
                logger.info('Generating AI report', { userId: userId, type: type, organizationId: organizationId, patientId: patientId });
                end_1 = endDate ? new Date(endDate) : new Date();
                start_1 = startDate ? new Date(startDate) : new Date(end_1.getTime() - 30 * 24 * 60 * 60 * 1000);
                return [4 /*yield*/, gatherReportData(type, organizationId, patientId, start_1, end_1)];
            case 2:
                reportData_1 = _e.sent();
                cacheParams = {
                    type: type,
                    organizationId: organizationId,
                    patientId: patientId,
                    startDate: start_1.toISOString(),
                    endDate: end_1.toISOString(),
                    includeRecommendations: includeRecommendations,
                };
                return [4 /*yield*/, (0, idempotency_1.withIdempotency)('AI_REPORT', userId, cacheParams, function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, generateReportContent(type, reportData_1, {
                                        start: start_1,
                                        end: end_1,
                                        includeRecommendations: includeRecommendations,
                                        format: format,
                                    })];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); }, { cacheTtl: 30 * 60 * 1000 } // 30 minutes cache
                    )];
            case 3:
                report = _e.sent();
                return [4 /*yield*/, db.collection('ai_reports').add({
                        type: type,
                        organizationId: organizationId,
                        patientId: patientId,
                        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        period: { start: start_1, end: end_1 },
                        content: report.content,
                        summary: report.summary,
                        recommendations: report.recommendations,
                        generatedBy: userId,
                        format: format,
                    })];
            case 4:
                reportRef = _e.sent();
                logger.info('AI report generated', { reportId: reportRef.id, type: type });
                return [2 /*return*/, {
                        success: true,
                        reportId: reportRef.id,
                        report: __assign({ id: reportRef.id }, report),
                    }];
            case 5:
                error_1 = _e.sent();
                logger.error('Failed to generate AI report', { error: error_1 });
                throw new https_2.HttpsError('internal', "Failed to generate report: ".concat(error_1.message));
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Get list of generated reports
 */
exports.listReports = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, type, _b, limit, query, snapshot, reports, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                data = request.data;
                userId = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid;
                if (!userId) {
                    throw new https_2.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, type = _a.type, _b = _a.limit, limit = _b === void 0 ? 20 : _b;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                query = db
                    .collection('ai_reports')
                    .where('organizationId', '==', organizationId)
                    .orderBy('generatedAt', 'desc')
                    .limit(limit);
                if (type) {
                    query = query.where('type', '==', type);
                }
                return [4 /*yield*/, query.get()];
            case 2:
                snapshot = _d.sent();
                reports = snapshot.docs.map(function (doc) {
                    var _a;
                    var data = doc.data();
                    return __assign(__assign({ id: doc.id }, data), { generatedAt: (_a = data.generatedAt) === null || _a === void 0 ? void 0 : _a.toDate() });
                });
                return [2 /*return*/, { success: true, reports: reports, count: reports.length }];
            case 3:
                error_2 = _d.sent();
                logger.error('Failed to list reports', { error: error_2 });
                throw new https_2.HttpsError('internal', "Failed to list reports: ".concat(error_2.message));
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get report by ID
 */
exports.getReport = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, reportId, doc, reportData, error_3;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
                if (!userId) {
                    throw new https_2.HttpsError('unauthenticated', 'User must be authenticated');
                }
                reportId = data.reportId;
                if (!reportId) {
                    throw new https_2.HttpsError('invalid-argument', 'reportId is required');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.collection('ai_reports').doc(reportId).get()];
            case 2:
                doc = _c.sent();
                if (!doc.exists) {
                    throw new https_2.HttpsError('not-found', 'Report not found');
                }
                reportData = doc.data();
                return [2 /*return*/, {
                        success: true,
                        report: __assign(__assign({ id: doc.id }, reportData), { generatedAt: (_b = reportData.generatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }),
                    }];
            case 3:
                error_3 = _c.sent();
                if (error_3.code === 'not-found') {
                    throw error_3;
                }
                logger.error('Failed to get report', { error: error_3 });
                throw new https_2.HttpsError('internal', "Failed to get report: ".concat(error_3.message));
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Download report as file
 */
exports.downloadReport = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var reportId, doc, report, contentType, extension, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // CORS
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'GET') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                reportId = req.query.reportId;
                if (!reportId || typeof reportId !== 'string') {
                    res.status(400).json({ error: 'reportId is required' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.collection('ai_reports').doc(reportId).get()];
            case 2:
                doc = _a.sent();
                if (!doc.exists) {
                    res.status(404).json({ error: 'Report not found' });
                    return [2 /*return*/];
                }
                report = doc.data();
                contentType = 'text/markdown';
                extension = 'md';
                if (report.format === 'json') {
                    contentType = 'application/json';
                    extension = 'json';
                }
                else if (report.format === 'html') {
                    contentType = 'text/html';
                    extension = 'html';
                }
                // Set headers for download
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', "attachment; filename=\"report-".concat(report.type, "-").concat(reportId, ".").concat(extension, "\""));
                res.send(report.content);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                logger.error('Failed to download report', { error: error_4 });
                res.status(500).json({ error: 'Failed to download report' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Scheduled report generation - daily summary
 */
exports.scheduledDailyReport = (0, scheduler_1.onSchedule)({
    schedule: '0 20 * * *', // 8 PM every day
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var orgsSnapshot, _i, _a, orgDoc, orgId, end, start, reportData, report, error_5, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logger.info('Starting scheduled daily report generation');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 11, , 12]);
                return [4 /*yield*/, db.collection('organizations').where('active', '==', true).get()];
            case 2:
                orgsSnapshot = _b.sent();
                _i = 0, _a = orgsSnapshot.docs;
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 10];
                orgDoc = _a[_i];
                orgId = orgDoc.id;
                _b.label = 4;
            case 4:
                _b.trys.push([4, 8, , 9]);
                end = new Date();
                start = new Date();
                start.setHours(0, 0, 0, 0);
                return [4 /*yield*/, gatherReportData(ReportType.DAILY_SUMMARY, orgId, undefined, start, end)];
            case 5:
                reportData = _b.sent();
                return [4 /*yield*/, generateReportContent(ReportType.DAILY_SUMMARY, reportData, { start: start, end: end, includeRecommendations: true, format: 'markdown' })];
            case 6:
                report = _b.sent();
                // Save report
                return [4 /*yield*/, db.collection('ai_reports').add({
                        type: ReportType.DAILY_SUMMARY,
                        organizationId: orgId,
                        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        period: { start: start, end: end },
                        content: report.content,
                        summary: report.summary,
                        recommendations: report.recommendations,
                        generatedBy: 'system',
                        format: 'markdown',
                        isScheduled: true,
                    })];
            case 7:
                // Save report
                _b.sent();
                logger.info('Daily report generated', { organizationId: orgId });
                return [3 /*break*/, 9];
            case 8:
                error_5 = _b.sent();
                logger.error('Failed to generate daily report for org', {
                    organizationId: orgId,
                    error: error_5,
                });
                return [3 /*break*/, 9];
            case 9:
                _i++;
                return [3 /*break*/, 3];
            case 10:
                logger.info('Scheduled daily reports completed');
                return [3 /*break*/, 12];
            case 11:
                error_6 = _b.sent();
                logger.error('Failed to complete scheduled reports', { error: error_6 });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
/**
 * Scheduled report generation - weekly summary
 */
exports.scheduledWeeklyReport = (0, scheduler_1.onSchedule)({
    schedule: '0 20 * * 1', // 8 PM every Monday
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var orgsSnapshot, _i, _a, orgDoc, orgId, end, start, reportData, report, error_7, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                logger.info('Starting scheduled weekly report generation');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 11, , 12]);
                return [4 /*yield*/, db.collection('organizations').where('active', '==', true).get()];
            case 2:
                orgsSnapshot = _b.sent();
                _i = 0, _a = orgsSnapshot.docs;
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 10];
                orgDoc = _a[_i];
                orgId = orgDoc.id;
                _b.label = 4;
            case 4:
                _b.trys.push([4, 8, , 9]);
                end = new Date();
                start = new Date();
                start.setDate(start.getDate() - 7);
                return [4 /*yield*/, gatherReportData(ReportType.WEEKLY_SUMMARY, orgId, undefined, start, end)];
            case 5:
                reportData = _b.sent();
                return [4 /*yield*/, generateReportContent(ReportType.WEEKLY_SUMMARY, reportData, { start: start, end: end, includeRecommendations: true, format: 'markdown' })];
            case 6:
                report = _b.sent();
                return [4 /*yield*/, db.collection('ai_reports').add({
                        type: ReportType.WEEKLY_SUMMARY,
                        organizationId: orgId,
                        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        period: { start: start, end: end },
                        content: report.content,
                        summary: report.summary,
                        recommendations: report.recommendations,
                        generatedBy: 'system',
                        format: 'markdown',
                        isScheduled: true,
                    })];
            case 7:
                _b.sent();
                logger.info('Weekly report generated', { organizationId: orgId });
                return [3 /*break*/, 9];
            case 8:
                error_7 = _b.sent();
                logger.error('Failed to generate weekly report for org', {
                    organizationId: orgId,
                    error: error_7,
                });
                return [3 /*break*/, 9];
            case 9:
                _i++;
                return [3 /*break*/, 3];
            case 10:
                logger.info('Scheduled weekly reports completed');
                return [3 /*break*/, 12];
            case 11:
                error_8 = _b.sent();
                logger.error('Failed to complete scheduled reports', { error: error_8 });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// Helper functions
function gatherReportData(type, organizationId, patientId, start, end) {
    return __awaiter(this, void 0, void 0, function () {
        var data, _a, _b, patient, evolutions, sessions, exercises, _c, appointments, patients, payments, payments;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    data = {
                        organizationId: organizationId,
                        patientId: patientId,
                        period: { start: start, end: end },
                    };
                    _a = type;
                    switch (_a) {
                        case ReportType.PATIENT_PROGRESS: return [3 /*break*/, 1];
                        case ReportType.APPOINTMENT_ANALYTICS: return [3 /*break*/, 3];
                        case ReportType.DAILY_SUMMARY: return [3 /*break*/, 3];
                        case ReportType.WEEKLY_SUMMARY: return [3 /*break*/, 3];
                        case ReportType.REVENUE_REPORT: return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1:
                    if (!patientId)
                        throw new Error('patientId required for patient progress report');
                    return [4 /*yield*/, Promise.all([
                            db.collection('patients').doc(patientId).get(),
                            db
                                .collection('evolutions')
                                .where('patientId', '==', patientId)
                                .where('createdAt', '>=', start)
                                .where('createdAt', '<=', end)
                                .orderBy('createdAt', 'asc')
                                .get(),
                            db
                                .collection('treatment_sessions')
                                .where('patientId', '==', patientId)
                                .where('createdAt', '>=', start)
                                .where('createdAt', '<=', end)
                                .get(),
                            db
                                .collection('exercise_logs')
                                .where('patientId', '==', patientId)
                                .where('timestamp', '>=', start)
                                .where('timestamp', '<=', end)
                                .get(),
                        ])];
                case 2:
                    _b = _d.sent(), patient = _b[0], evolutions = _b[1], sessions = _b[2], exercises = _b[3];
                    data.patient = patient.exists ? patient.data() : null;
                    data.evolutions = evolutions.docs.map(function (d) { return d.data(); });
                    data.sessions = sessions.docs.map(function (d) { return d.data(); });
                    data.exercises = exercises.docs.map(function (d) { return d.data(); });
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, Promise.all([
                        db
                            .collection('appointments')
                            .where('organizationId', '==', organizationId)
                            .where('startTime', '>=', start)
                            .where('startTime', '<=', end)
                            .get(),
                        db.collection('patients').where('organizationId', '==', organizationId).get(),
                        db
                            .collection('payments')
                            .where('organizationId', '==', organizationId)
                            .where('createdAt', '>=', start)
                            .where('createdAt', '<=', end)
                            .get(),
                    ])];
                case 4:
                    _c = _d.sent(), appointments = _c[0], patients = _c[1], payments = _c[2];
                    data.appointments = appointments.docs.map(function (d) { return d.data(); });
                    data.patients = patients.docs.map(function (d) { return d.data(); });
                    data.payments = payments.docs.map(function (d) { return d.data(); });
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, db
                        .collection('payments')
                        .where('organizationId', '==', organizationId)
                        .where('createdAt', '>=', start)
                        .where('createdAt', '<=', end)
                        .get()];
                case 6:
                    payments = _d.sent();
                    data.payments = payments.docs.map(function (d) { return d.data(); });
                    return [3 /*break*/, 8];
                case 7: return [3 /*break*/, 8];
                case 8: return [2 /*return*/, data];
            }
        });
    });
}
function generateReportContent(type, data, options) {
    return __awaiter(this, void 0, void 0, function () {
        var vertexAI, model, systemPrompt, userPrompt, result, response, summary, recommendations, content;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    vertexAI = new vertexai_1.VertexAI({
                        project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
                        location: 'us-central1',
                    });
                    model = vertexAI.getGenerativeModel({
                        model: 'gemini-2.0-flash-exp',
                    });
                    systemPrompt = getSystemPromptForReportType(type);
                    userPrompt = buildPromptForReportType(type, data, options);
                    return [4 /*yield*/, model.generateContent({
                            systemInstruction: systemPrompt,
                            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                        })];
                case 1:
                    result = _f.sent();
                    response = ((_e = (_d = (_c = (_b = (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '';
                    summary = extractSummary(response);
                    recommendations = options.includeRecommendations
                        ? extractRecommendations(response)
                        : undefined;
                    content = response;
                    // Convert format if needed
                    if (options.format === 'json') {
                        content = JSON.stringify({ summary: summary, recommendations: recommendations, fullReport: response }, null, 2);
                    }
                    else if (options.format === 'html') {
                        content = markdownToHtml(response);
                    }
                    return [2 /*return*/, { content: content, summary: summary, recommendations: recommendations }];
            }
        });
    });
}
function getSystemPromptForReportType(type) {
    var _a;
    var basePrompt = "Voc\u00EA \u00E9 um especialista em fisioterapia e an\u00E1lise de dados cl\u00EDnicos do FisioFlow.\nGere relat\u00F3rios profissionais, objetivos e acion\u00E1veis em portugu\u00EAs brasileiro.\nUse markdown para formata\u00E7\u00E3o.\nSeja conciso mas completo.";
    var specificPrompts = (_a = {},
        _a[ReportType.PATIENT_PROGRESS] = "".concat(basePrompt, "\nFoque em: evolu\u00E7\u00E3o cl\u00EDnica, progresso funcional, ades\u00E3o ao tratamento, pr\u00F3ximos passos."),
        _a[ReportType.TREATMENT_SUMMARY] = "".concat(basePrompt, "\nFoque em: efic\u00E1cia do tratamento, objetivos alcan\u00E7ados, ajustes necess\u00E1rios."),
        _a[ReportType.CLINICAL_OUTCOMES] = "".concat(basePrompt, "\nFoque em: resultados cl\u00EDnicos, melhoria de qualidade de vida, m\u00E9tricas de outcome."),
        _a[ReportType.APPOINTMENT_ANALYTICS] = "".concat(basePrompt, "\nFoque em: taxa de comparecimento, cancelamentos, hor\u00E1rios de pico, otimiza\u00E7\u00E3o de agenda."),
        _a[ReportType.REVENUE_REPORT] = "".concat(basePrompt, "\nFoque em: receita, fluxo de pagamentos, valores pendentes, proje\u00E7\u00F5es."),
        _a[ReportType.DAILY_SUMMARY] = "".concat(basePrompt, "\nFoque em: resumo executivo do dia, pontos de aten\u00E7\u00E3o, tarefas para amanh\u00E3."),
        _a[ReportType.WEEKLY_SUMMARY] = "".concat(basePrompt, "\nFoque em: an\u00E1lise semanal, tend\u00EAncias, compara\u00E7\u00F5es, planejamento para pr\u00F3xima semana."),
        _a[ReportType.MONTHLY_SUMMARY] = "".concat(basePrompt, "\nFoque em: an\u00E1lise mensal, KPIs, metas alcan\u00E7adas, planejamento estrat\u00E9gico."),
        _a);
    return specificPrompts[type] || basePrompt;
}
function buildPromptForReportType(type, data, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    var periodStr = "Per\u00EDodo: ".concat(options.start.toLocaleDateString('pt-BR'), " a ").concat(options.end.toLocaleDateString('pt-BR'));
    var prompt = "".concat(periodStr, "\n\n");
    switch (type) {
        case ReportType.PATIENT_PROGRESS:
            prompt += "**Paciente:** ".concat(((_a = data.patient) === null || _a === void 0 ? void 0 : _a.name) || 'N/A', "\n");
            prompt += "**Condi\u00E7\u00E3o:** ".concat(((_b = data.patient) === null || _b === void 0 ? void 0 : _b.condition) || 'N/A', "\n\n");
            prompt += "**Evolu\u00E7\u00F5es (".concat(((_c = data.evolutions) === null || _c === void 0 ? void 0 : _c.length) || 0, "):**\n");
            (_d = data.evolutions) === null || _d === void 0 ? void 0 : _d.forEach(function (e, i) {
                var _a, _b;
                prompt += "".concat(i + 1, ". ").concat(new Date(((_b = (_a = e.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || e.createdAt).toLocaleDateString('pt-BR'), ": ").concat(e.notes || 'Sem notas', "\n");
            });
            prompt += "\n**Sess\u00F5es realizadas:** ".concat(((_e = data.sessions) === null || _e === void 0 ? void 0 : _e.length) || 0, "\n");
            prompt += "**Exerc\u00EDcios registrados:** ".concat(((_f = data.exercises) === null || _f === void 0 ? void 0 : _f.length) || 0, "\n\n");
            prompt += "**Instru\u00E7\u00F5es:**\n";
            prompt += "1. Analise o progresso do paciente\n";
            prompt += "2. Identifique melhorias e \u00E1reas de aten\u00E7\u00E3o\n";
            prompt += "3. Sugira ajustes no plano de tratamento\n";
            prompt += "4. Forne\u00E7a 3-5 recomenda\u00E7\u00F5es espec\u00EDficas\n";
            break;
        case ReportType.APPOINTMENT_ANALYTICS:
        case ReportType.DAILY_SUMMARY:
        case ReportType.WEEKLY_SUMMARY: {
            var totalAppts = ((_g = data.appointments) === null || _g === void 0 ? void 0 : _g.length) || 0;
            var completed = ((_h = data.appointments) === null || _h === void 0 ? void 0 : _h.filter(function (a) { return a.status === 'completed'; }).length) || 0;
            var cancelled = ((_j = data.appointments) === null || _j === void 0 ? void 0 : _j.filter(function (a) { return a.status === 'cancelled'; }).length) || 0;
            var noShow = ((_k = data.appointments) === null || _k === void 0 ? void 0 : _k.filter(function (a) { return a.status === 'no_show'; }).length) || 0;
            prompt += "**Estat\u00EDsticas de Agendamentos:**\n";
            prompt += "- Total: ".concat(totalAppts, "\n");
            prompt += "- Completados: ".concat(completed, " (").concat(((completed / totalAppts) * 100).toFixed(1), "%)\n");
            prompt += "- Cancelados: ".concat(cancelled, " (").concat(((cancelled / totalAppts) * 100).toFixed(1), "%)\n");
            prompt += "- N\u00E3o compareceu: ".concat(noShow, " (").concat(((noShow / totalAppts) * 100).toFixed(1), "%)\n\n");
            prompt += "**Pacientes ativos:** ".concat(((_l = data.patients) === null || _l === void 0 ? void 0 : _l.length) || 0, "\n\n");
            prompt += "**Instru\u00E7\u00F5es:**\n";
            prompt += "Gere um relat\u00F3rio executivo com:\n";
            prompt += "1. Resumo dos principais n\u00FAmeros\n";
            prompt += "2. Pontos de aten\u00E7\u00E3o\n";
            prompt += "3. Oportunidades de melhoria\n";
            if (options.includeRecommendations) {
                prompt += "4. Recomenda\u00E7\u00F5es acion\u00E1veis\n";
            }
            break;
        }
        case ReportType.REVENUE_REPORT: {
            var totalRevenue = ((_m = data.payments) === null || _m === void 0 ? void 0 : _m.reduce(function (sum, p) { return sum + (p.amount || 0); }, 0)) || 0;
            var pending = ((_o = data.payments) === null || _o === void 0 ? void 0 : _o.filter(function (p) { return p.status === 'pending'; }).length) || 0;
            var overdue = ((_p = data.payments) === null || _p === void 0 ? void 0 : _p.filter(function (p) { return p.status === 'overdue'; }).length) || 0;
            prompt += "**Resumo Financeiro:**\n";
            prompt += "- Receita total: R$ ".concat((totalRevenue / 100).toFixed(2), "\n");
            prompt += "- Pagamentos pendentes: ".concat(pending, "\n");
            prompt += "- Pagamentos atrasados: ".concat(overdue, "\n\n");
            prompt += "**Instru\u00E7\u00F5es:**\n";
            prompt += "Gere um relat\u00F3rio financeiro com:\n";
            prompt += "1. An\u00E1lise de receita\n";
            prompt += "2. Identifica\u00E7\u00E3o de pend\u00EAncias\n";
            prompt += "3. Proje\u00E7\u00F5es e recomenda\u00E7\u00F5es\n";
            break;
        }
        default:
            prompt += "**Dados dispon\u00EDveis:**\n".concat(JSON.stringify(data, null, 2), "\n\n");
            prompt += "Gere um relat\u00F3rio baseado nos dados fornecidos.";
    }
    return prompt;
}
function extractSummary(content) {
    // Try to extract summary section
    var summaryMatch = content.match(/##? Resumo?\n+(.*?)(?=\n##|\n\n|$)/is);
    if (summaryMatch) {
        return summaryMatch[1].trim();
    }
    // Fallback: first paragraph
    var firstParagraph = content.split('\n\n')[0];
    return (firstParagraph === null || firstParagraph === void 0 ? void 0 : firstParagraph.replace(/#/g, '').trim()) || content.substring(0, 200) + '...';
}
function extractRecommendations(content) {
    var recommendations = [];
    // Try to find numbered recommendations
    var recMatch = content.match(/##? Recomendações?\n+(.*?)(?=\n##|\n\n|$)/is);
    if (recMatch) {
        var lines = recMatch[1].split('\n');
        lines.forEach(function (line) {
            var match = line.match(/^\d+\.\s+(.*)/);
            if (match) {
                recommendations.push(match[1].trim());
            }
        });
    }
    return recommendations.length > 0 ? recommendations : ['Analisar os dados para identificar oportunidades de melhoria.'];
}
function markdownToHtml(markdown) {
    // Simple markdown to HTML conversion
    var html = markdown;
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Bold
    html = html.replace(/\*\*(.*?)\*/gim, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    // Lists
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    return html;
}
var https_2 = require("firebase-functions/v2/https");
