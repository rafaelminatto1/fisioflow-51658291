"use strict";
/**
 * Firebase Cloud Functions - Cron Jobs Adicionais
 *
 * Substitui os cron jobs do Vercel:
 * - /api/crons/expiring-vouchers → expiringVouchers
 * - /api/crons/birthdays → birthdays
 * - /api/crons/cleanup → cleanup
 * - /api/crons/data-integrity → dataIntegrity
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
exports.dataIntegrity = exports.cleanup = exports.birthdays = exports.expiringVouchers = void 0;
// ============================================================================
// EXPIRING VOUCHERS
// ============================================================================
/**
 * Expiring Vouchers Scheduled Function
 *
 * Executa diariamente às 10:00 para:
 * - Enviar lembretes de vouchers que expiram em 7 dias
 * - Notificar pacientes por email e WhatsApp
 *
 * Schedule: "every day 10:00"
 */
var scheduler_1 = require("firebase-functions/v2/scheduler");
var firebase_functions_1 = require("firebase-functions");
var init_1 = require("../init");
var firestore_1 = require("firebase-admin/firestore");
var resend_templates_1 = require("../communications/resend-templates");
var whatsapp_1 = require("../communications/whatsapp");
exports.expiringVouchers = (0, scheduler_1.onSchedule)({
    schedule: 'every day 10:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, sevenDaysFromNow_1, eightDaysFromNow, vouchersSnapshot, patientIds, orgIds, _a, patientsMap_1, orgsMap_1, remindersSent_1, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[expiringVouchers] Iniciando verificação de vouchers expirando', {
                    jobName: 'expiringVouchers',
                    scheduleTime: event.scheduleTime,
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                sevenDaysFromNow_1 = new Date();
                sevenDaysFromNow_1.setDate(sevenDaysFromNow_1.getDate() + 7);
                sevenDaysFromNow_1.setHours(23, 59, 59);
                eightDaysFromNow = new Date(sevenDaysFromNow_1);
                eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 1);
                return [4 /*yield*/, db
                        .collection('vouchers')
                        .where('active', '==', true)
                        .where('expiration_date', '>=', sevenDaysFromNow_1.toISOString())
                        .where('expiration_date', '<', eightDaysFromNow.toISOString())
                        .get()];
            case 2:
                vouchersSnapshot = _b.sent();
                if (vouchersSnapshot.empty) {
                    firebase_functions_1.logger.info('[expiringVouchers] Nenhum voucher expirando em 7 dias');
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[expiringVouchers] Vouchers encontrados', {
                    count: vouchersSnapshot.docs.length,
                });
                patientIds = vouchersSnapshot.docs
                    .map(function (doc) { return doc.data().patient_id; })
                    .filter(Boolean);
                orgIds = vouchersSnapshot.docs
                    .map(function (doc) { return doc.data().organization_id; })
                    .filter(Boolean);
                return [4 /*yield*/, Promise.all([
                        fetchDocumentsMap('patients', patientIds),
                        fetchDocumentsMap('organizations', orgIds),
                    ])];
            case 3:
                _a = _b.sent(), patientsMap_1 = _a[0], orgsMap_1 = _a[1];
                remindersSent_1 = 0;
                return [4 /*yield*/, Promise.all(vouchersSnapshot.docs.map(function (doc) { return __awaiter(void 0, void 0, void 0, function () {
                        var voucher, patient, organization, waError_1, reminderRef, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    voucher = __assign({ id: doc.id }, doc.data());
                                    patient = patientsMap_1.get(voucher.patient_id);
                                    organization = orgsMap_1.get(voucher.organization_id) || {
                                        id: voucher.organization_id,
                                        name: 'FisioFlow',
                                    };
                                    if (!patient)
                                        return [2 /*return*/];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 9, , 10]);
                                    if (!patient.email) return [3 /*break*/, 3];
                                    return [4 /*yield*/, (0, resend_templates_1.sendVoucherExpiringEmail)(patient.email, {
                                            customerName: patient.name || 'Paciente',
                                            voucherName: voucher.name || 'Voucher',
                                            sessionsRemaining: voucher.sessions_remaining || 0,
                                            expirationDate: voucher.expiration_date || sevenDaysFromNow_1.toISOString(),
                                            daysUntilExpiration: 7,
                                            organizationName: organization.name || 'FisioFlow',
                                        })];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    if (!patient.phone) return [3 /*break*/, 7];
                                    _a.label = 4;
                                case 4:
                                    _a.trys.push([4, 6, , 7]);
                                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTemplateMessageInternal)({
                                            to: (0, whatsapp_1.formatPhoneForWhatsApp)(patient.phone),
                                            template: whatsapp_1.WhatsAppTemplate.APPOINTMENT_REMINDER, // Reutilizando template aproximado ou criar específico
                                            language: 'pt_BR',
                                            components: [
                                                {
                                                    type: 'body',
                                                    parameters: [
                                                        { type: 'text', text: patient.name || 'Paciente' },
                                                        { type: 'text', text: 'Seu voucher expira em 7 dias' },
                                                        { type: 'text', text: 'FisioFlow' },
                                                    ],
                                                },
                                            ],
                                        })];
                                case 5:
                                    _a.sent();
                                    firebase_functions_1.logger.info('[expiringVouchers] WhatsApp reminder sent', { patientId: patient.id });
                                    return [3 /*break*/, 7];
                                case 6:
                                    waError_1 = _a.sent();
                                    firebase_functions_1.logger.error('[expiringVouchers] WhatsApp failed', { waError: waError_1 });
                                    return [3 /*break*/, 7];
                                case 7:
                                    reminderRef = db.collection('voucher_reminders').doc();
                                    return [4 /*yield*/, reminderRef.set({
                                            voucher_id: voucher.id,
                                            patient_id: patient.id,
                                            organization_id: organization.id,
                                            reminder_type: 'expiring_soon',
                                            sent_at: new Date().toISOString(),
                                            channels: {
                                                email: !!patient.email,
                                                whatsapp: !!patient.phone,
                                            },
                                        })];
                                case 8:
                                    _a.sent();
                                    remindersSent_1++;
                                    return [3 /*break*/, 10];
                                case 9:
                                    error_2 = _a.sent();
                                    firebase_functions_1.logger.error('[expiringVouchers] Erro ao enviar lembrete', {
                                        voucherId: voucher.id,
                                        patientId: patient.id,
                                        error: error_2,
                                    });
                                    return [3 /*break*/, 10];
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 4:
                _b.sent();
                firebase_functions_1.logger.info('[expiringVouchers] Concluído', { remindersSent: remindersSent_1 });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                firebase_functions_1.logger.error('[expiringVouchers] Erro fatal', { error: error_1 });
                throw error_1;
            case 6: return [2 /*return*/];
        }
    });
}); });
// Helper function to fetch documents and return a map
function fetchDocumentsMap(collectionPath, ids) {
    return __awaiter(this, void 0, void 0, function () {
        var db, map, batchSize, i, batch, snapshot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = (0, init_1.getAdminDb)();
                    map = new Map();
                    if (ids.length === 0)
                        return [2 /*return*/, map];
                    batchSize = 30;
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < ids.length)) return [3 /*break*/, 4];
                    batch = ids.slice(i, i + batchSize);
                    return [4 /*yield*/, db
                            .collection(collectionPath)
                            .where(firestore_1.FieldPath.documentId(), 'in', batch)
                            .get()];
                case 2:
                    snapshot = _a.sent();
                    snapshot.docs.forEach(function (doc) {
                        map.set(doc.id, __assign({ id: doc.id }, doc.data()));
                    });
                    _a.label = 3;
                case 3:
                    i += batchSize;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, map];
            }
        });
    });
}
// ============================================================================
// BIRTHDAY MESSAGES
// ============================================================================
/**
 * Birthday Messages Scheduled Function
 *
 * Executa diariamente às 09:00 para:
 * - Enviar mensagens de aniversário para pacientes
 * - Enviar via WhatsApp ou Email conforme preferência
 *
 * Schedule: "every day 09:00"
 */
exports.birthdays = (0, scheduler_1.onSchedule)({
    schedule: 'every day 09:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, today, month, day, todayMMDD_1, optimizedSnapshot, birthdayPatients, fullSnapshot, snapshot, orgIds, orgsMap_2, therapistsSnapshot, therapistByOrg_1, messagesQueued_1, results, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[birthdays] Iniciando verificação de aniversariantes', {
                    jobName: 'birthdays',
                    scheduleTime: event.scheduleTime,
                });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 10, , 11]);
                today = new Date();
                month = String(today.getMonth() + 1).padStart(2, '0');
                day = String(today.getDate()).padStart(2, '0');
                todayMMDD_1 = "".concat(month, "-").concat(day);
                return [4 /*yield*/, db
                        .collection('patients')
                        .where('active', '==', true)
                        .where('birthday_MMDD', '==', todayMMDD_1)
                        .limit(1)
                        .get()];
            case 2:
                optimizedSnapshot = _a.sent();
                birthdayPatients = [];
                if (!!optimizedSnapshot.empty) return [3 /*break*/, 4];
                return [4 /*yield*/, db
                        .collection('patients')
                        .where('active', '==', true)
                        .where('birthday_MMDD', '==', todayMMDD_1)
                        .get()];
            case 3:
                fullSnapshot = _a.sent();
                birthdayPatients = fullSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [3 /*break*/, 6];
            case 4:
                // Fall back to client-side filtering
                firebase_functions_1.logger.warn('[birthdays] Campo birthday_MMDD não encontrado, usando filtro client-side');
                return [4 /*yield*/, db
                        .collection('patients')
                        .where('active', '==', true)
                        .select('id', 'name', 'email', 'phone', 'date_of_birth', 'organization_id', 'settings', 'notification_preferences')
                        .get()];
            case 5:
                snapshot = _a.sent();
                birthdayPatients = snapshot.docs
                    .map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })
                    .filter(function (patient) {
                    var dob = patient.date_of_birth;
                    return dob && dob.includes("-".concat(todayMMDD_1));
                });
                _a.label = 6;
            case 6:
                if (birthdayPatients.length === 0) {
                    firebase_functions_1.logger.info('[birthdays] Nenhum aniversário hoje');
                    void {
                        success: true,
                        messagesSent: 0,
                        timestamp: new Date().toISOString(),
                        message: 'No birthdays today',
                    };
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[birthdays] Pacientes com aniversário hoje', {
                    count: birthdayPatients.length,
                });
                orgIds = __spreadArray([], new Set(birthdayPatients.map(function (p) { return p.organization_id; }).filter(Boolean)), true);
                return [4 /*yield*/, fetchDocumentsMap('organizations', orgIds)];
            case 7:
                orgsMap_2 = _a.sent();
                return [4 /*yield*/, db
                        .collection('profiles')
                        .where('organization_id', 'in', orgIds)
                        .where('role', '==', 'therapist')
                        .get()];
            case 8:
                therapistsSnapshot = _a.sent();
                therapistByOrg_1 = new Map();
                therapistsSnapshot.docs.forEach(function (doc) {
                    var therapist = __assign({ id: doc.id }, doc.data());
                    therapistByOrg_1.set(therapist.organization_id, therapist);
                });
                messagesQueued_1 = 0;
                return [4 /*yield*/, Promise.all(birthdayPatients.map(function (patient) { return __awaiter(void 0, void 0, void 0, function () {
                        var org, preferredChannel, notifPrefs, whatsappEnabled, emailEnabled, therapist, waError_2, emailResult, greetingRef, error_4;
                        var _a, _b, _c, _d, _e, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    org = orgsMap_2.get(patient.organization_id);
                                    preferredChannel = ((_a = patient.settings) === null || _a === void 0 ? void 0 : _a.notification_channel) ||
                                        ((_b = patient.notification_preferences) === null || _b === void 0 ? void 0 : _b.preferred_channel) ||
                                        'whatsapp';
                                    notifPrefs = patient.notification_preferences || {};
                                    whatsappEnabled = ((_d = (_c = org === null || org === void 0 ? void 0 : org.settings) === null || _c === void 0 ? void 0 : _c.whatsapp_enabled) !== null && _d !== void 0 ? _d : true) && notifPrefs.whatsapp !== false;
                                    emailEnabled = ((_f = (_e = org === null || org === void 0 ? void 0 : org.settings) === null || _e === void 0 ? void 0 : _e.email_enabled) !== null && _f !== void 0 ? _f : true) && notifPrefs.email !== false;
                                    therapist = therapistByOrg_1.get(patient.organization_id);
                                    _g.label = 1;
                                case 1:
                                    _g.trys.push([1, 9, , 10]);
                                    if (!(whatsappEnabled && preferredChannel === 'whatsapp' && patient.phone)) return [3 /*break*/, 5];
                                    _g.label = 2;
                                case 2:
                                    _g.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTemplateMessageInternal)({
                                            to: (0, whatsapp_1.formatPhoneForWhatsApp)(patient.phone),
                                            template: whatsapp_1.WhatsAppTemplate.BIRTHDAY_GREETING,
                                            language: 'pt_BR',
                                            components: [
                                                {
                                                    type: 'body',
                                                    parameters: [
                                                        { type: 'text', text: patient.name || 'Paciente' },
                                                        { type: 'text', text: (org === null || org === void 0 ? void 0 : org.name) || 'FisioFlow' },
                                                    ],
                                                },
                                            ],
                                        })];
                                case 3:
                                    _g.sent();
                                    firebase_functions_1.logger.info('[birthdays] WhatsApp message sent', { patientId: patient.id });
                                    messagesQueued_1++;
                                    return [3 /*break*/, 5];
                                case 4:
                                    waError_2 = _g.sent();
                                    firebase_functions_1.logger.error('[birthdays] WhatsApp failed', { waError: waError_2 });
                                    return [3 /*break*/, 5];
                                case 5:
                                    if (!(emailEnabled && patient.email)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, (0, resend_templates_1.sendBirthdayEmail)(patient.email, {
                                            patientName: patient.name || 'Paciente',
                                            therapistName: (therapist === null || therapist === void 0 ? void 0 : therapist.displayName) || (therapist === null || therapist === void 0 ? void 0 : therapist.name) || 'Equipe FisioFlow',
                                            clinicName: (org === null || org === void 0 ? void 0 : org.name) || 'FisioFlow',
                                        })];
                                case 6:
                                    emailResult = _g.sent();
                                    firebase_functions_1.logger.info('[birthdays] Birthday email sent', {
                                        patientId: patient.id,
                                        patientEmail: patient.email,
                                        success: emailResult.success,
                                        error: emailResult.error,
                                    });
                                    if (emailResult.success) {
                                        messagesQueued_1++;
                                    }
                                    _g.label = 7;
                                case 7:
                                    greetingRef = db.collection('birthday_greetings').doc();
                                    return [4 /*yield*/, greetingRef.create({
                                            patient_id: patient.id,
                                            organization_id: org === null || org === void 0 ? void 0 : org.id,
                                            therapist_id: therapist === null || therapist === void 0 ? void 0 : therapist.id,
                                            sent_at: new Date().toISOString(),
                                            channels: {
                                                whatsapp: whatsappEnabled && preferredChannel === 'whatsapp' && !!patient.phone,
                                                email: emailEnabled && !!patient.email,
                                            },
                                        })];
                                case 8:
                                    _g.sent();
                                    void {
                                        patientId: patient.id,
                                        sent: true,
                                        channels: {
                                            whatsapp: whatsappEnabled && preferredChannel === 'whatsapp' && !!patient.phone,
                                            email: emailEnabled && !!patient.email,
                                        },
                                    };
                                    return [2 /*return*/];
                                case 9:
                                    error_4 = _g.sent();
                                    firebase_functions_1.logger.error('[birthdays] Erro ao processar aniversário', {
                                        patientId: patient.id,
                                        error: error_4,
                                    });
                                    void {
                                        patientId: patient.id,
                                        sent: false,
                                        error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                                    };
                                    return [2 /*return*/];
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 9:
                results = _a.sent();
                firebase_functions_1.logger.info('[birthdays] Concluído', {
                    messagesQueued: messagesQueued_1,
                    totalPatients: birthdayPatients.length,
                });
                void {
                    success: true,
                    messagesQueued: messagesQueued_1,
                    totalPatients: birthdayPatients.length,
                    timestamp: new Date().toISOString(),
                    results: results,
                };
                return [3 /*break*/, 11];
            case 10:
                error_3 = _a.sent();
                firebase_functions_1.logger.error('[birthdays] Erro fatal', { error: error_3 });
                throw error_3;
            case 11: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// CLEANUP
// ============================================================================
/**
 * Cleanup Scheduled Function
 *
 * Executa diariamente às 03:00 (madrugada) para:
 * - Limpar logs de notificação antigos (>90 dias)
 * - Limpar tokens de reset de senha expirados (>24h)
 * - Limpar logs de saúde do sistema (>30 dias)
 * - Limpar sessões incompletas (>7 dias)
 * - Expirar ofertas da lista de espera
 *
 * Schedule: "every day 03:00"
 */
exports.cleanup = (0, scheduler_1.onSchedule)({
    schedule: 'every day 03:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, result, errors, ninetyDaysAgo, _a, error_5, errorMsg, twentyFourHoursAgo, _b, error_6, errorMsg, thirtyDaysAgo, _c, error_7, errorMsg, sevenDaysAgo, snapshot, batch_1, error_8, errorMsg, now, snapshot, batch_2, processedCount_1, error_9, errorMsg, error_10;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[cleanup] Iniciando limpeza de dados', {
                    jobName: 'cleanup',
                    scheduleTime: event.scheduleTime,
                });
                _d.label = 1;
            case 1:
                _d.trys.push([1, 22, , 23]);
                result = {};
                errors = [];
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                _a = result;
                return [4 /*yield*/, (0, init_1.deleteByQuery)('notification_history', 'created_at', '<', ninetyDaysAgo.toISOString(), { maxDeletes: 10000 })];
            case 3:
                _a.notificationHistory = _d.sent();
                firebase_functions_1.logger.info('[cleanup] Logs de notificação limpos', {
                    count: result.notificationHistory,
                });
                return [3 /*break*/, 5];
            case 4:
                error_5 = _d.sent();
                errorMsg = "Notifica\u00E7\u00E3o cleanup: ".concat(error_5 instanceof Error ? error_5.message : 'Unknown');
                errors.push(errorMsg);
                result.notificationHistory = 0;
                return [3 /*break*/, 5];
            case 5:
                _d.trys.push([5, 7, , 8]);
                twentyFourHoursAgo = new Date();
                twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
                _b = result;
                return [4 /*yield*/, (0, init_1.deleteByQuery)('password_reset_tokens', 'created_at', '<', twentyFourHoursAgo.toISOString(), { maxDeletes: 5000 })];
            case 6:
                _b.passwordResetTokens = _d.sent();
                firebase_functions_1.logger.info('[cleanup] Tokens de senha limpos', {
                    count: result.passwordResetTokens,
                });
                return [3 /*break*/, 8];
            case 7:
                error_6 = _d.sent();
                errorMsg = "Password tokens cleanup: ".concat(error_6 instanceof Error ? error_6.message : 'Unknown');
                errors.push(errorMsg);
                result.passwordResetTokens = 0;
                return [3 /*break*/, 8];
            case 8:
                _d.trys.push([8, 10, , 11]);
                thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                _c = result;
                return [4 /*yield*/, (0, init_1.deleteByQuery)('system_health_logs', 'created_at', '<', thirtyDaysAgo.toISOString(), { maxDeletes: 5000 })];
            case 9:
                _c.systemHealthLogs = _d.sent();
                firebase_functions_1.logger.info('[cleanup] Logs de saúde limpos', {
                    count: result.systemHealthLogs,
                });
                return [3 /*break*/, 11];
            case 10:
                error_7 = _d.sent();
                errorMsg = "Health logs cleanup: ".concat(error_7 instanceof Error ? error_7.message : 'Unknown');
                errors.push(errorMsg);
                result.systemHealthLogs = 0;
                return [3 /*break*/, 11];
            case 11:
                _d.trys.push([11, 15, , 16]);
                sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return [4 /*yield*/, db
                        .collection('soap_records')
                        .where('status', '==', 'in_progress')
                        .where('updated_at', '<', sevenDaysAgo.toISOString())
                        .limit(500)
                        .get()];
            case 12:
                snapshot = _d.sent();
                if (!!snapshot.empty) return [3 /*break*/, 14];
                batch_1 = db.batch();
                snapshot.docs.forEach(function (doc) {
                    batch_1.delete(doc.ref);
                });
                return [4 /*yield*/, batch_1.commit()];
            case 13:
                _d.sent();
                _d.label = 14;
            case 14:
                result.incompleteSessions = snapshot.docs.length;
                firebase_functions_1.logger.info('[cleanup] Sessões incompletas limpas', {
                    count: result.incompleteSessions,
                });
                return [3 /*break*/, 16];
            case 15:
                error_8 = _d.sent();
                errorMsg = "Sessions cleanup: ".concat(error_8 instanceof Error ? error_8.message : 'Unknown');
                errors.push(errorMsg);
                result.incompleteSessions = 0;
                return [3 /*break*/, 16];
            case 16:
                _d.trys.push([16, 20, , 21]);
                now = new Date().toISOString();
                return [4 /*yield*/, db
                        .collection('waitlist')
                        .where('status', '==', 'offered')
                        .where('offer_expires_at', '<', now)
                        .limit(500)
                        .get()];
            case 17:
                snapshot = _d.sent();
                if (!!snapshot.empty) return [3 /*break*/, 19];
                batch_2 = db.batch();
                processedCount_1 = 0;
                snapshot.docs.forEach(function (docSnap) {
                    var offer = docSnap.data();
                    var newRefusalCount = (offer.refusal_count || 0) + 1;
                    var newStatus = newRefusalCount >= 3 ? 'removed' : 'waiting';
                    batch_2.update(docSnap.ref, {
                        status: newStatus,
                        offered_slot: null,
                        offered_at: null,
                        offer_expires_at: null,
                        refusal_count: newRefusalCount,
                    });
                    processedCount_1++;
                });
                return [4 /*yield*/, batch_2.commit()];
            case 18:
                _d.sent();
                _d.label = 19;
            case 19:
                result.expiredWaitlistOffers = snapshot.docs.length;
                firebase_functions_1.logger.info('[cleanup] Ofertas da lista de espera expiradas', {
                    count: result.expiredWaitlistOffers,
                });
                return [3 /*break*/, 21];
            case 20:
                error_9 = _d.sent();
                errorMsg = "Expired offers: ".concat(error_9 instanceof Error ? error_9.message : 'Unknown');
                errors.push(errorMsg);
                result.expiredWaitlistOffers = 0;
                return [3 /*break*/, 21];
            case 21:
                if (errors.length > 0) {
                    firebase_functions_1.logger.warn('[cleanup] Erros durante limpeza', { errors: errors });
                }
                firebase_functions_1.logger.info('[cleanup] Limpeza concluída', { result: result });
                void __assign(__assign({ success: true, timestamp: new Date().toISOString() }, result), { errors: errors.length > 0 ? errors : undefined });
                return [3 /*break*/, 23];
            case 22:
                error_10 = _d.sent();
                firebase_functions_1.logger.error('[cleanup] Erro fatal', { error: error_10 });
                throw error_10;
            case 23: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// DATA INTEGRITY
// ============================================================================
/**
 * Data Integrity Scheduled Function
 *
 * Executa a cada 6 horas para:
 * - Verificar agendamentos órfãos (sem paciente válido)
 * - Verificar sessões órfãs (sem agendamento válido)
 * - Verificar pagamentos órfãos (sem agendamento válido)
 * - Verificar pacientes com organizações inválidas
 *
 * Schedule: "every 6 hours"
 */
exports.dataIntegrity = (0, scheduler_1.onSchedule)({
    schedule: 'every 6 hours',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, issues, appointmentsSnapshot, orphanedAppointmentsCount, patientIds, uniquePatientIds, _loop_1, _i, uniquePatientIds_1, patientId, sessionsSnapshot, orphanedSessionsCount, appointmentIds, uniqueAppointmentIds, _loop_2, _a, uniqueAppointmentIds_1, appointmentId, paymentsSnapshot, orphanedPaymentsCount, appointmentIds, uniqueAppointmentIds, _loop_3, _b, uniqueAppointmentIds_2, appointmentId, patientsSnapshot, orphanedPatientsCount, orgIds, uniqueOrgIds, _loop_4, _c, uniqueOrgIds_1, orgId, error_11;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[dataIntegrity] Iniciando verificação de integridade', {
                    jobName: 'dataIntegrity',
                    scheduleTime: event.scheduleTime,
                });
                _d.label = 1;
            case 1:
                _d.trys.push([1, 22, , 23]);
                issues = [];
                return [4 /*yield*/, db
                        .collection('appointments')
                        .limit(100)
                        .get()];
            case 2:
                appointmentsSnapshot = _d.sent();
                orphanedAppointmentsCount = 0;
                patientIds = appointmentsSnapshot.docs
                    .map(function (doc) { return doc.data().patient_id; })
                    .filter(Boolean);
                uniquePatientIds = __spreadArray([], new Set(patientIds), true);
                _loop_1 = function (patientId) {
                    var patientRef, count;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0: return [4 /*yield*/, db.collection('patients').doc(patientId).get()];
                            case 1:
                                patientRef = _e.sent();
                                if (!patientRef.exists) {
                                    count = appointmentsSnapshot.docs.filter(function (doc) { return doc.data().patient_id === patientId; }).length;
                                    orphanedAppointmentsCount += count;
                                }
                                return [2 /*return*/];
                        }
                    });
                };
                _i = 0, uniquePatientIds_1 = uniquePatientIds;
                _d.label = 3;
            case 3:
                if (!(_i < uniquePatientIds_1.length)) return [3 /*break*/, 6];
                patientId = uniquePatientIds_1[_i];
                return [5 /*yield**/, _loop_1(patientId)];
            case 4:
                _d.sent();
                _d.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 3];
            case 6:
                if (orphanedAppointmentsCount > 0) {
                    issues.push("".concat(orphanedAppointmentsCount, " agendamentos com pacientes inv\u00E1lidos"));
                }
                return [4 /*yield*/, db
                        .collection('soap_records')
                        .where('appointment_id', '!=', null)
                        .limit(100)
                        .get()];
            case 7:
                sessionsSnapshot = _d.sent();
                orphanedSessionsCount = 0;
                if (!!sessionsSnapshot.empty) return [3 /*break*/, 11];
                appointmentIds = sessionsSnapshot.docs
                    .map(function (doc) { return doc.data().appointment_id; })
                    .filter(Boolean);
                uniqueAppointmentIds = __spreadArray([], new Set(appointmentIds), true);
                _loop_2 = function (appointmentId) {
                    var appointmentRef, count;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0: return [4 /*yield*/, db
                                    .collection('appointments')
                                    .doc(appointmentId)
                                    .get()];
                            case 1:
                                appointmentRef = _f.sent();
                                if (!appointmentRef.exists) {
                                    count = sessionsSnapshot.docs.filter(function (doc) { return doc.data().appointment_id === appointmentId; }).length;
                                    orphanedSessionsCount += count;
                                }
                                return [2 /*return*/];
                        }
                    });
                };
                _a = 0, uniqueAppointmentIds_1 = uniqueAppointmentIds;
                _d.label = 8;
            case 8:
                if (!(_a < uniqueAppointmentIds_1.length)) return [3 /*break*/, 11];
                appointmentId = uniqueAppointmentIds_1[_a];
                return [5 /*yield**/, _loop_2(appointmentId)];
            case 9:
                _d.sent();
                _d.label = 10;
            case 10:
                _a++;
                return [3 /*break*/, 8];
            case 11:
                if (orphanedSessionsCount > 0) {
                    issues.push("".concat(orphanedSessionsCount, " sess\u00F5es com agendamentos inv\u00E1lidos"));
                }
                return [4 /*yield*/, db
                        .collection('payments')
                        .where('appointment_id', '!=', null)
                        .limit(100)
                        .get()];
            case 12:
                paymentsSnapshot = _d.sent();
                orphanedPaymentsCount = 0;
                if (!!paymentsSnapshot.empty) return [3 /*break*/, 16];
                appointmentIds = paymentsSnapshot.docs
                    .map(function (doc) { return doc.data().appointment_id; })
                    .filter(Boolean);
                uniqueAppointmentIds = __spreadArray([], new Set(appointmentIds), true);
                _loop_3 = function (appointmentId) {
                    var appointmentRef, count;
                    return __generator(this, function (_g) {
                        switch (_g.label) {
                            case 0: return [4 /*yield*/, db
                                    .collection('appointments')
                                    .doc(appointmentId)
                                    .get()];
                            case 1:
                                appointmentRef = _g.sent();
                                if (!appointmentRef.exists) {
                                    count = paymentsSnapshot.docs.filter(function (doc) { return doc.data().appointment_id === appointmentId; }).length;
                                    orphanedPaymentsCount += count;
                                }
                                return [2 /*return*/];
                        }
                    });
                };
                _b = 0, uniqueAppointmentIds_2 = uniqueAppointmentIds;
                _d.label = 13;
            case 13:
                if (!(_b < uniqueAppointmentIds_2.length)) return [3 /*break*/, 16];
                appointmentId = uniqueAppointmentIds_2[_b];
                return [5 /*yield**/, _loop_3(appointmentId)];
            case 14:
                _d.sent();
                _d.label = 15;
            case 15:
                _b++;
                return [3 /*break*/, 13];
            case 16:
                if (orphanedPaymentsCount > 0) {
                    issues.push("".concat(orphanedPaymentsCount, " pagamentos com agendamentos inv\u00E1lidos"));
                }
                return [4 /*yield*/, db
                        .collection('patients')
                        .limit(100)
                        .get()];
            case 17:
                patientsSnapshot = _d.sent();
                orphanedPatientsCount = 0;
                orgIds = patientsSnapshot.docs
                    .map(function (doc) { return doc.data().organization_id; })
                    .filter(Boolean);
                uniqueOrgIds = __spreadArray([], new Set(orgIds), true);
                _loop_4 = function (orgId) {
                    var orgRef, count;
                    return __generator(this, function (_h) {
                        switch (_h.label) {
                            case 0: return [4 /*yield*/, db.collection('organizations').doc(orgId).get()];
                            case 1:
                                orgRef = _h.sent();
                                if (!orgRef.exists) {
                                    count = patientsSnapshot.docs.filter(function (doc) { return doc.data().organization_id === orgId; }).length;
                                    orphanedPatientsCount += count;
                                }
                                return [2 /*return*/];
                        }
                    });
                };
                _c = 0, uniqueOrgIds_1 = uniqueOrgIds;
                _d.label = 18;
            case 18:
                if (!(_c < uniqueOrgIds_1.length)) return [3 /*break*/, 21];
                orgId = uniqueOrgIds_1[_c];
                return [5 /*yield**/, _loop_4(orgId)];
            case 19:
                _d.sent();
                _d.label = 20;
            case 20:
                _c++;
                return [3 /*break*/, 18];
            case 21:
                if (orphanedPatientsCount > 0) {
                    issues.push("".concat(orphanedPatientsCount, " pacientes com organiza\u00E7\u00F5es inv\u00E1lidas"));
                }
                // Log results
                if (issues.length > 0) {
                    firebase_functions_1.logger.warn('[dataIntegrity] Problemas encontrados', {
                        issues: issues,
                        count: issues.length,
                    });
                    // TODO: Send alert to admins
                }
                else {
                    firebase_functions_1.logger.info('[dataIntegrity] Verificação concluída: Sem problemas');
                }
                void {
                    success: true,
                    issuesFound: issues.length,
                    issues: issues,
                    orphanedAppointments: orphanedAppointmentsCount,
                    orphanedSessions: orphanedSessionsCount,
                    orphanedPayments: orphanedPaymentsCount,
                    orphanedPatients: orphanedPatientsCount,
                    timestamp: new Date().toISOString(),
                };
                return [3 /*break*/, 23];
            case 22:
                error_11 = _d.sent();
                firebase_functions_1.logger.error('[dataIntegrity] Erro fatal', { error: error_11 });
                throw error_11;
            case 23: return [2 /*return*/];
        }
    });
}); });
