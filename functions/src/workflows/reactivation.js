"use strict";
/**
 * Patient Reactivation Workflow - Firebase Cloud Functions
 *
 * Substitui workflow do Inngest:
 * - reactivationWorkflow → Scheduled Function
 *
 * Executa semanalmente (segundas-feiras às 10:00) para:
 * - Encontrar pacientes inativos (>30 dias sem consulta)
 * - Enviar mensagens de reativação via WhatsApp/Email
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
exports.triggerPatientReactivation = exports.patientReactivation = void 0;
// ============================================================================
// TYPES
// ============================================================================
var scheduler_1 = require("firebase-functions/v2/scheduler");
var firebase_functions_1 = require("firebase-functions");
var init_1 = require("../init");
// ============================================================================
// SCHEDULED FUNCTION: Weekly Patient Reactivation
// ============================================================================
/**
 * Weekly Patient Reactivation Campaign
 * Runs every Monday at 10:00 AM
 *
 * Schedule: "every monday 10:00"
 */
exports.patientReactivation = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 10:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, thirtyDaysAgo, patientsSnapshot, inactivePatients, now, appointmentsSnapshot, latestAppointmentByPatient_1, _i, _a, patientDoc, p, prefs, lastApp, lastDate, diffTime, diffDays, orgIds, orgPromises, orgSnapshots, orgMap_1, messagesQueued_1, results, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[patientReactivation] Starting weekly reactivation campaign', {
                    jobName: 'patientReactivation',
                    scheduleTime: event.scheduleTime,
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return [4 /*yield*/, db
                        .collection('patients')
                        .where('active', '==', true)
                        .select('id', 'name', 'full_name', 'phone', 'email', 'organization_id', 'notification_preferences')
                        .get()];
            case 2:
                patientsSnapshot = _b.sent();
                firebase_functions_1.logger.info('[patientReactivation] Active patients found', {
                    count: patientsSnapshot.docs.length,
                });
                inactivePatients = [];
                now = new Date();
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('status', 'in', ['concluido', 'realizado', 'attended'])
                        .where('date', '>=', new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString())
                        .get()];
            case 3:
                appointmentsSnapshot = _b.sent();
                latestAppointmentByPatient_1 = new Map();
                appointmentsSnapshot.docs.forEach(function (doc) {
                    var appt = __assign({ id: doc.id }, doc.data());
                    var existing = latestAppointmentByPatient_1.get(appt.patient_id || '');
                    if (!existing || new Date(appt.date) > new Date(existing.date)) {
                        latestAppointmentByPatient_1.set(appt.patient_id || '', { date: appt.date });
                    }
                });
                // Find inactive patients (30-37 days since last appointment)
                for (_i = 0, _a = patientsSnapshot.docs; _i < _a.length; _i++) {
                    patientDoc = _a[_i];
                    p = __assign({ id: patientDoc.id }, patientDoc.data());
                    // Normalize name field
                    if (!p.full_name && p.name) {
                        p.full_name = p.name;
                    }
                    prefs = p.notification_preferences || {};
                    if (prefs.whatsapp === false && prefs.email === false)
                        continue;
                    if (!p.phone && !p.email)
                        continue;
                    lastApp = latestAppointmentByPatient_1.get(p.id);
                    if (!lastApp)
                        continue; // No appointments at all
                    lastDate = new Date(lastApp.date);
                    diffTime = Math.abs(now.getTime() - lastDate.getTime());
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    // If last appointment was between 30 and 37 days ago
                    if (diffDays >= 30 && diffDays <= 37) {
                        inactivePatients.push(p);
                    }
                }
                if (inactivePatients.length === 0) {
                    firebase_functions_1.logger.info('[patientReactivation] No inactive patients found in window');
                    void {
                        success: true,
                        processed: 0,
                        timestamp: new Date().toISOString(),
                        message: 'No inactive patients found in window',
                    };
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[patientReactivation] Inactive patients found', {
                    count: inactivePatients.length,
                });
                orgIds = __spreadArray([], new Set(inactivePatients.map(function (p) { return p.organization_id; })), true);
                orgPromises = orgIds.map(function (orgId) { return db.collection('organizations').doc(orgId).get(); });
                return [4 /*yield*/, Promise.all(orgPromises)];
            case 4:
                orgSnapshots = _b.sent();
                orgMap_1 = new Map();
                orgSnapshots
                    .filter(function (snap) { return snap.exists; })
                    .forEach(function (snap) {
                    orgMap_1.set(snap.id, __assign({ id: snap.id }, snap.data()));
                });
                messagesQueued_1 = 0;
                return [4 /*yield*/, Promise.all(inactivePatients.map(function (patient) { return __awaiter(void 0, void 0, void 0, function () {
                        var org, notificationPrefs, whatsappEnabled, emailEnabled, campaignRef1, campaignRef2, error_2;
                        var _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    org = orgMap_1.get(patient.organization_id);
                                    notificationPrefs = patient.notification_preferences || {};
                                    whatsappEnabled = ((_b = (_a = org === null || org === void 0 ? void 0 : org.settings) === null || _a === void 0 ? void 0 : _a.whatsapp_enabled) !== null && _b !== void 0 ? _b : true) && notificationPrefs.whatsapp !== false;
                                    emailEnabled = ((_d = (_c = org === null || org === void 0 ? void 0 : org.settings) === null || _c === void 0 ? void 0 : _c.email_enabled) !== null && _d !== void 0 ? _d : true) && notificationPrefs.email !== false;
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 6, , 7]);
                                    if (!(whatsappEnabled && patient.phone)) return [3 /*break*/, 3];
                                    firebase_functions_1.logger.info('[patientReactivation] Queuing WhatsApp reactivation', {
                                        patientId: patient.id,
                                        patientPhone: patient.phone,
                                    });
                                    // TODO: Send via WhatsApp provider
                                    messagesQueued_1++;
                                    campaignRef1 = db.collection('reactivation_campaigns').doc();
                                    return [4 /*yield*/, campaignRef1.create({
                                            patient_id: patient.id,
                                            organization_id: org === null || org === void 0 ? void 0 : org.id,
                                            channel: 'whatsapp',
                                            sent_at: new Date().toISOString(),
                                            status: 'queued',
                                        })];
                                case 2:
                                    _e.sent();
                                    _e.label = 3;
                                case 3:
                                    if (!(emailEnabled && patient.email)) return [3 /*break*/, 5];
                                    firebase_functions_1.logger.info('[patientReactivation] Queuing email reactivation', {
                                        patientId: patient.id,
                                        patientEmail: patient.email,
                                    });
                                    // TODO: Send via email provider
                                    messagesQueued_1++;
                                    campaignRef2 = db.collection('reactivation_campaigns').doc();
                                    return [4 /*yield*/, campaignRef2.create({
                                            patient_id: patient.id,
                                            organization_id: org === null || org === void 0 ? void 0 : org.id,
                                            channel: 'email',
                                            sent_at: new Date().toISOString(),
                                            status: 'queued',
                                        })];
                                case 4:
                                    _e.sent();
                                    _e.label = 5;
                                case 5: return [2 /*return*/, {
                                        patientId: patient.id,
                                        queued: true,
                                        channels: {
                                            whatsapp: whatsappEnabled && !!patient.phone,
                                            email: emailEnabled && !!patient.email,
                                        },
                                    }];
                                case 6:
                                    error_2 = _e.sent();
                                    firebase_functions_1.logger.error('[patientReactivation] Error processing patient', {
                                        patientId: patient.id,
                                        error: error_2,
                                    });
                                    return [2 /*return*/, {
                                            patientId: patient.id,
                                            queued: false,
                                            error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                                        }];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 5:
                results = _b.sent();
                firebase_functions_1.logger.info('[patientReactivation] Completed', {
                    messagesQueued: messagesQueued_1,
                    totalPatients: inactivePatients.length,
                });
                void {
                    success: true,
                    processed: inactivePatients.length,
                    messagesQueued: messagesQueued_1,
                    timestamp: new Date().toISOString(),
                    results: results,
                };
                return [3 /*break*/, 7];
            case 6:
                error_1 = _b.sent();
                firebase_functions_1.logger.error('[patientReactivation] Fatal error', { error: error_1 });
                throw error_1;
            case 7: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Manually trigger reactivation for a specific patient
 * This can be called from a client app
 */
var triggerPatientReactivation = function (patientId) { return __awaiter(void 0, void 0, void 0, function () {
    var db, patientSnap, patient, orgSnap, org, prefs, whatsappEnabled, emailEnabled, error_3;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                _e.label = 1;
            case 1:
                _e.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.collection('patients').doc(patientId).get()];
            case 2:
                patientSnap = _e.sent();
                if (!patientSnap.exists) {
                    return [2 /*return*/, { success: false, message: 'Patient not found' }];
                }
                patient = __assign({ id: patientSnap.id }, patientSnap.data());
                return [4 /*yield*/, db.collection('organizations').doc(patient.organization_id).get()];
            case 3:
                orgSnap = _e.sent();
                org = orgSnap.exists ? __assign({ id: orgSnap.id }, orgSnap.data()) : null;
                prefs = patient.notification_preferences || {};
                whatsappEnabled = ((_b = (_a = org === null || org === void 0 ? void 0 : org.settings) === null || _a === void 0 ? void 0 : _a.whatsapp_enabled) !== null && _b !== void 0 ? _b : true) && prefs.whatsapp !== false;
                emailEnabled = ((_d = (_c = org === null || org === void 0 ? void 0 : org.settings) === null || _c === void 0 ? void 0 : _c.email_enabled) !== null && _d !== void 0 ? _d : true) && prefs.email !== false;
                if (!whatsappEnabled && !emailEnabled) {
                    return [2 /*return*/, { success: false, message: 'All notifications disabled' }];
                }
                if (whatsappEnabled && patient.phone) {
                    // TODO: Send via WhatsApp provider
                    firebase_functions_1.logger.info('[triggerPatientReactivation] WhatsApp queued', { patientId: patientId });
                }
                if (emailEnabled && patient.email) {
                    // TODO: Send via email provider
                    firebase_functions_1.logger.info('[triggerPatientReactivation] Email queued', { patientId: patientId });
                }
                return [2 /*return*/, { success: true, message: 'Reactivation messages queued' }];
            case 4:
                error_3 = _e.sent();
                firebase_functions_1.logger.error('[triggerPatientReactivation] Error', { patientId: patientId, error: error_3 });
                return [2 /*return*/, { success: false, message: 'Error triggering reactivation' }];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.triggerPatientReactivation = triggerPatientReactivation;
