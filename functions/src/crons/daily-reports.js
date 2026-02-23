"use strict";
/**
 * Firebase Cloud Function - Daily Reports
 *
 * Substitui o cron job "/api/crons/daily-reports" do Vercel
 * Agendado para executar diariamente às 08:00
 *
 * @version 1.0.0 - Firebase Functions v2
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
exports.weeklySummary = exports.dailyReports = void 0;
/**
 * Daily Reports Scheduled Function
 *
 * Executa diariamente às 08:00 para:
 * - Gerar relatórios diários para cada organização
 * - Enviar relatórios por email para terapeutas
 * - Compilar estatísticas de sessões do dia anterior
 *
 * Schedule: "every day 08:00"
 * Region: southamerica-east1
 */
var scheduler_1 = require("firebase-functions/v2/scheduler");
var firebase_functions_1 = require("firebase-functions");
var init_1 = require("../init");
var resend_templates_1 = require("../communications/resend-templates");
exports.dailyReports = (0, scheduler_1.onSchedule)({
    schedule: 'every day 08:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, startTime, yesterday_1, today_1, organizationsSnapshot, organizations, results, totalReports, totalEmails, successfulOrgs, failedOrgs, duration, error_1, duration;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                startTime = Date.now();
                firebase_functions_1.logger.info('[dailyReports] Iniciando geração de relatórios diários', {
                    jobName: 'dailyReports',
                    scheduleTime: event.scheduleTime,
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                yesterday_1 = new Date();
                yesterday_1.setDate(yesterday_1.getDate() - 1);
                yesterday_1.setHours(0, 0, 0, 0);
                today_1 = new Date();
                today_1.setHours(0, 0, 0, 0);
                return [4 /*yield*/, db
                        .collection('organizations')
                        .where('active', '==', true)
                        .get()];
            case 2:
                organizationsSnapshot = _a.sent();
                organizations = organizationsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                if (organizations.length === 0) {
                    firebase_functions_1.logger.info('[dailyReports] Nenhuma organização ativa encontrada');
                    void {
                        success: true,
                        reportsGenerated: 0,
                        emailsSent: 0,
                        organizationsProcessed: 0,
                        timestamp: new Date().toISOString(),
                        message: 'No active organizations',
                    };
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[dailyReports] Processando organizações', {
                    count: organizations.length,
                });
                return [4 /*yield*/, Promise.all(organizations.map(function (org) { return __awaiter(void 0, void 0, void 0, function () {
                        var orgStartTime, therapistsSnapshot, therapists, sessionsSnapshot, sessions_1, appointmentsSnapshot, appointments_1, appointmentsByStatus, reportData_1, reportRef_1, emailsSent_1, emailPromises, orgDuration, error_2, orgDuration;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    orgStartTime = Date.now();
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 7, , 8]);
                                    return [4 /*yield*/, db
                                            .collection('profiles')
                                            .where('organization_id', '==', org.id)
                                            .where('active', '==', true)
                                            .where('receive_daily_reports', '==', true)
                                            .get()];
                                case 2:
                                    therapistsSnapshot = _a.sent();
                                    therapists = therapistsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    if (therapists.length === 0) {
                                        firebase_functions_1.logger.info("[dailyReports] Org ".concat(org.id, ": Nenhum terapeuta com relat\u00F3rios di\u00E1rios habilitados"));
                                        return [2 /*return*/, {
                                                organizationId: org.id,
                                                organizationName: org.name,
                                                reportsGenerated: 0,
                                                emailsSent: 0,
                                                skipped: true,
                                                reason: 'No therapists with daily reports enabled',
                                            }];
                                    }
                                    return [4 /*yield*/, db
                                            .collection('soap_records')
                                            .where('organization_id', '==', org.id)
                                            .where('created_at', '>=', yesterday_1.toISOString())
                                            .where('created_at', '<', today_1.toISOString())
                                            .get()];
                                case 3:
                                    sessionsSnapshot = _a.sent();
                                    sessions_1 = sessionsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    return [4 /*yield*/, db
                                            .collection('appointments')
                                            .where('organization_id', '==', org.id)
                                            .where('appointment_date', '==', yesterday_1.toISOString().split('T')[0])
                                            .get()];
                                case 4:
                                    appointmentsSnapshot = _a.sent();
                                    appointments_1 = appointmentsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    appointmentsByStatus = appointments_1.reduce(function (acc, apt) {
                                        var status = apt.status || 'unknown';
                                        acc[status] = (acc[status] || 0) + 1;
                                        return acc;
                                    }, {});
                                    reportData_1 = {
                                        organization: org.name,
                                        organizationId: org.id,
                                        date: yesterday_1.toISOString().split('T')[0],
                                        totalSessions: sessions_1.length,
                                        totalAppointments: appointments_1.length,
                                        appointmentsByStatus: appointmentsByStatus,
                                        sessionsByTherapist: sessions_1.reduce(function (acc, session) {
                                            var therapistId = session.created_by || 'unassigned';
                                            acc[therapistId] = (acc[therapistId] || 0) + 1;
                                            return acc;
                                        }, {}),
                                        completedSessions: sessions_1.filter(function (s) { return s.status === 'finalized'; }).length,
                                        draftSessions: sessions_1.filter(function (s) { return s.status === 'draft'; }).length,
                                    };
                                    reportRef_1 = db.collection('daily_reports').doc();
                                    return [4 /*yield*/, reportRef_1.create(__assign(__assign({}, reportData_1), { created_at: new Date().toISOString(), generated_by: 'system' }))];
                                case 5:
                                    _a.sent();
                                    emailsSent_1 = 0;
                                    emailPromises = therapists.map(function (therapist) { return __awaiter(void 0, void 0, void 0, function () {
                                        var emailResult, error_3;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 3, , 5]);
                                                    return [4 /*yield*/, (0, resend_templates_1.sendDailyReportEmail)(therapist.email, {
                                                            therapistName: therapist.displayName || therapist.name || 'Terapeuta',
                                                            organizationName: org.name,
                                                            date: yesterday_1.toISOString().split('T')[0],
                                                            totalSessions: sessions_1.length,
                                                            totalAppointments: appointments_1.length,
                                                            completedSessions: reportData_1.completedSessions,
                                                            draftSessions: reportData_1.draftSessions,
                                                            appointmentsByStatus: reportData_1.appointmentsByStatus,
                                                        })];
                                                case 1:
                                                    emailResult = _a.sent();
                                                    // Salvar log de envio
                                                    return [4 /*yield*/, db.collection('daily_report_logs').doc().create({
                                                            report_id: reportRef_1.id,
                                                            therapist_id: therapist.id,
                                                            therapist_email: therapist.email,
                                                            organization_id: org.id,
                                                            sent_at: new Date().toISOString(),
                                                            status: emailResult.success ? 'sent' : 'failed',
                                                            error: emailResult.error || null,
                                                            email_id: emailResult.id || null,
                                                        })];
                                                case 2:
                                                    // Salvar log de envio
                                                    _a.sent();
                                                    if (emailResult.success) {
                                                        emailsSent_1++;
                                                    }
                                                    return [3 /*break*/, 5];
                                                case 3:
                                                    error_3 = _a.sent();
                                                    firebase_functions_1.logger.error("[dailyReports] Erro ao enviar relat\u00F3rio para terapeuta", {
                                                        organizationId: org.id,
                                                        therapistId: therapist.id,
                                                        error: error_3,
                                                    });
                                                    // Salvar log de erro
                                                    return [4 /*yield*/, db.collection('daily_report_logs').doc().create({
                                                            report_id: reportRef_1.id,
                                                            therapist_id: therapist.id,
                                                            therapist_email: therapist.email,
                                                            organization_id: org.id,
                                                            sent_at: new Date().toISOString(),
                                                            status: 'failed',
                                                            error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                                                        })];
                                                case 4:
                                                    // Salvar log de erro
                                                    _a.sent();
                                                    return [3 /*break*/, 5];
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                    return [4 /*yield*/, Promise.all(emailPromises)];
                                case 6:
                                    _a.sent();
                                    orgDuration = Date.now() - orgStartTime;
                                    firebase_functions_1.logger.info("[dailyReports] Org ".concat(org.id, " processada"), {
                                        organizationName: org.name,
                                        reportsGenerated: 1,
                                        emailsSent: emailsSent_1,
                                        duration: orgDuration,
                                    });
                                    return [2 /*return*/, {
                                            organizationId: org.id,
                                            organizationName: org.name,
                                            reportsGenerated: 1,
                                            emailsSent: emailsSent_1,
                                            reportId: reportRef_1.id,
                                            reportData: reportData_1,
                                        }];
                                case 7:
                                    error_2 = _a.sent();
                                    orgDuration = Date.now() - orgStartTime;
                                    firebase_functions_1.logger.error("[dailyReports] Erro ao processar organiza\u00E7\u00E3o ".concat(org.id), {
                                        organizationName: org.name,
                                        error: error_2,
                                        duration: orgDuration,
                                    });
                                    return [2 /*return*/, {
                                            organizationId: org.id,
                                            organizationName: org.name,
                                            error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                                            reportsGenerated: 0,
                                            emailsSent: 0,
                                        }];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 3:
                results = _a.sent();
                totalReports = results.reduce(function (sum, r) { return sum + (r.reportsGenerated || 0); }, 0);
                totalEmails = results.reduce(function (sum, r) { return sum + (r.emailsSent || 0); }, 0);
                successfulOrgs = results.filter(function (r) { return !r.error; }).length;
                failedOrgs = results.filter(function (r) { return r.error; }).length;
                duration = Date.now() - startTime;
                firebase_functions_1.logger.info('[dailyReports] Relatórios diários concluídos', {
                    totalReports: totalReports,
                    totalEmails: totalEmails,
                    organizationsProcessed: organizations.length,
                    successfulOrgs: successfulOrgs,
                    failedOrgs: failedOrgs,
                    duration: duration,
                });
                void {
                    success: true,
                    reportsGenerated: totalReports,
                    emailsSent: totalEmails,
                    organizationsProcessed: organizations.length,
                    successfulOrgs: successfulOrgs,
                    failedOrgs: failedOrgs,
                    timestamp: new Date().toISOString(),
                    duration: duration,
                    results: results,
                };
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                duration = Date.now() - startTime;
                firebase_functions_1.logger.error('[dailyReports] Erro fatal na geração de relatórios', {
                    error: error_1,
                    duration: duration,
                });
                throw error_1;
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Weekly Summary Scheduled Function
 *
 * Executa toda segunda-feira às 09:00 para:
 * - Gerar resumo semanal para cada organização
 * - Compilar estatísticas da semana anterior
 *
 * Schedule: "every monday 09:00"
 */
exports.weeklySummary = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 09:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, today, lastWeek, startOfLastWeek_1, endOfLastWeek_1, organizationsSnapshot, organizations, results, totalSummaries, totalEmails, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[weeklySummary] Iniciando geração de resumos semanais', {
                    jobName: 'weeklySummary',
                    scheduleTime: event.scheduleTime,
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                today = new Date();
                lastWeek = new Date(today);
                lastWeek.setDate(lastWeek.getDate() - 7);
                lastWeek.setHours(0, 0, 0, 0);
                startOfLastWeek_1 = new Date(lastWeek);
                startOfLastWeek_1.setDate(startOfLastWeek_1.getDate() - startOfLastWeek_1.getDay()); // Sunday
                startOfLastWeek_1.setHours(0, 0, 0, 0);
                endOfLastWeek_1 = new Date(startOfLastWeek_1);
                endOfLastWeek_1.setDate(endOfLastWeek_1.getDate() + 6);
                endOfLastWeek_1.setHours(23, 59, 59, 999);
                return [4 /*yield*/, db
                        .collection('organizations')
                        .where('active', '==', true)
                        .get()];
            case 2:
                organizationsSnapshot = _a.sent();
                organizations = organizationsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                firebase_functions_1.logger.info('[weeklySummary] Processando organizações', {
                    count: organizations.length,
                    weekStart: startOfLastWeek_1.toISOString().split('T')[0],
                    weekEnd: endOfLastWeek_1.toISOString().split('T')[0],
                });
                return [4 /*yield*/, Promise.all(organizations.map(function (org) { return __awaiter(void 0, void 0, void 0, function () {
                        var therapistsSnapshot, therapists, sessionsSnapshot, sessions_2, appointmentsSnapshot, appointments_2, summaryData_1, summaryRef_1, emailsSent_2, emailPromises, error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 6, , 7]);
                                    return [4 /*yield*/, db
                                            .collection('profiles')
                                            .where('organization_id', '==', org.id)
                                            .where('active', '==', true)
                                            .where('receive_weekly_summary', '==', true)
                                            .get()];
                                case 1:
                                    therapistsSnapshot = _a.sent();
                                    therapists = therapistsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    if (therapists.length === 0) {
                                        return [2 /*return*/, {
                                                organizationId: org.id,
                                                organizationName: org.name,
                                                reportsGenerated: 0,
                                                emailsSent: 0,
                                                skipped: true,
                                                reason: 'No therapists with weekly summary enabled',
                                            }];
                                    }
                                    return [4 /*yield*/, db
                                            .collection('soap_records')
                                            .where('organization_id', '==', org.id)
                                            .where('created_at', '>=', startOfLastWeek_1.toISOString())
                                            .where('created_at', '<=', endOfLastWeek_1.toISOString())
                                            .get()];
                                case 2:
                                    sessionsSnapshot = _a.sent();
                                    sessions_2 = sessionsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    return [4 /*yield*/, db
                                            .collection('appointments')
                                            .where('organization_id', '==', org.id)
                                            .where('appointment_date', '>=', startOfLastWeek_1.toISOString().split('T')[0])
                                            .where('appointment_date', '<=', endOfLastWeek_1.toISOString().split('T')[0])
                                            .get()];
                                case 3:
                                    appointmentsSnapshot = _a.sent();
                                    appointments_2 = appointmentsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                                    summaryData_1 = {
                                        organization: org.name,
                                        organizationId: org.id,
                                        weekStart: startOfLastWeek_1.toISOString().split('T')[0],
                                        weekEnd: endOfLastWeek_1.toISOString().split('T')[0],
                                        totalSessions: sessions_2.length,
                                        totalAppointments: appointments_2.length,
                                        completedAppointments: appointments_2.filter(function (a) { return a.status === 'concluido'; }).length,
                                        cancelledAppointments: appointments_2.filter(function (a) { return a.status === 'cancelado'; }).length,
                                        missedAppointments: appointments_2.filter(function (a) { return a.status === 'faltou'; }).length,
                                        sessionsByTherapist: sessions_2.reduce(function (acc, session) {
                                            var therapistId = session.created_by || 'unassigned';
                                            acc[therapistId] = (acc[therapistId] || 0) + 1;
                                            return acc;
                                        }, {}),
                                        completedSessions: sessions_2.filter(function (s) { return s.status === 'finalized'; }).length,
                                        draftSessions: sessions_2.filter(function (s) { return s.status === 'draft'; }).length,
                                    };
                                    summaryRef_1 = db.collection('weekly_summaries').doc();
                                    return [4 /*yield*/, summaryRef_1.create(__assign(__assign({}, summaryData_1), { created_at: new Date().toISOString(), generated_by: 'system' }))];
                                case 4:
                                    _a.sent();
                                    emailsSent_2 = 0;
                                    emailPromises = therapists.map(function (therapist) { return __awaiter(void 0, void 0, void 0, function () {
                                        var emailResult, error_6;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    _a.trys.push([0, 3, , 4]);
                                                    return [4 /*yield*/, (0, resend_templates_1.sendWeeklySummaryEmail)(therapist.email, {
                                                            therapistName: therapist.displayName || therapist.name || 'Terapeuta',
                                                            organizationName: org.name,
                                                            weekStart: startOfLastWeek_1.toISOString().split('T')[0],
                                                            weekEnd: endOfLastWeek_1.toISOString().split('T')[0],
                                                            totalSessions: sessions_2.length,
                                                            totalAppointments: appointments_2.length,
                                                            completedSessions: summaryData_1.completedSessions,
                                                            completedAppointments: summaryData_1.completedAppointments,
                                                            cancelledAppointments: summaryData_1.cancelledAppointments,
                                                            missedAppointments: summaryData_1.missedAppointments,
                                                        })];
                                                case 1:
                                                    emailResult = _a.sent();
                                                    return [4 /*yield*/, db.collection('weekly_summary_logs').doc().create({
                                                            summary_id: summaryRef_1.id,
                                                            therapist_id: therapist.id,
                                                            therapist_email: therapist.email,
                                                            organization_id: org.id,
                                                            sent_at: new Date().toISOString(),
                                                            status: emailResult.success ? 'sent' : 'failed',
                                                            error: emailResult.error || null,
                                                            email_id: emailResult.id || null,
                                                        })];
                                                case 2:
                                                    _a.sent();
                                                    if (emailResult.success) {
                                                        emailsSent_2++;
                                                    }
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    error_6 = _a.sent();
                                                    firebase_functions_1.logger.error("[weeklySummary] Erro ao enviar resumo para terapeuta", {
                                                        organizationId: org.id,
                                                        therapistId: therapist.id,
                                                        error: error_6,
                                                    });
                                                    return [3 /*break*/, 4];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                    return [4 /*yield*/, Promise.all(emailPromises)];
                                case 5:
                                    _a.sent();
                                    return [2 /*return*/, {
                                            organizationId: org.id,
                                            organizationName: org.name,
                                            reportsGenerated: 1,
                                            emailsSent: emailsSent_2,
                                            summaryId: summaryRef_1.id,
                                            summaryData: summaryData_1,
                                        }];
                                case 6:
                                    error_5 = _a.sent();
                                    firebase_functions_1.logger.error("[weeklySummary] Erro ao processar organiza\u00E7\u00E3o ".concat(org.id), {
                                        organizationName: org.name,
                                        error: error_5,
                                    });
                                    return [2 /*return*/, {
                                            organizationId: org.id,
                                            organizationName: org.name,
                                            error: error_5 instanceof Error ? error_5.message : 'Unknown error',
                                            reportsGenerated: 0,
                                            emailsSent: 0,
                                        }];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 3:
                results = _a.sent();
                totalSummaries = results.reduce(function (sum, r) { return sum + (r.reportsGenerated || 0); }, 0);
                totalEmails = results.reduce(function (sum, r) { return sum + (r.emailsSent || 0); }, 0);
                firebase_functions_1.logger.info('[weeklySummary] Resumos semanais concluídos', {
                    totalSummaries: totalSummaries,
                    totalEmails: totalEmails,
                    organizationsProcessed: organizations.length,
                });
                void {
                    success: true,
                    summariesGenerated: totalSummaries,
                    emailsSent: totalEmails,
                    organizationsProcessed: organizations.length,
                    timestamp: new Date().toISOString(),
                    results: results,
                };
                return [3 /*break*/, 5];
            case 4:
                error_4 = _a.sent();
                firebase_functions_1.logger.error('[weeklySummary] Erro fatal na geração de resumos', { error: error_4 });
                throw error_4;
            case 5: return [2 /*return*/];
        }
    });
}); });
