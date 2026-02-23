"use strict";
/**
 * Appointment Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - appointmentReminderWorkflow → Scheduled Function
 * - appointmentCreatedWorkflow → Firestore Trigger
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
exports.onAppointmentUpdatedWorkflow = exports.onAppointmentCreatedWorkflow = exports.appointmentReminders2h = exports.appointmentReminders = void 0;
exports.getAppointmentsWithRelations = getAppointmentsWithRelations;
// ============================================================================
// TYPES
// ============================================================================
var scheduler_1 = require("firebase-functions/v2/scheduler");
var firestore_1 = require("firebase-functions/v2/firestore");
var firebase_functions_1 = require("firebase-functions");
var init_1 = require("../init");
var resend_templates_1 = require("../communications/resend-templates");
var notifications_1 = require("./notifications");
function resolveAppointmentDateTime(appointment) {
    var rawDate = appointment.date || appointment.appointment_date;
    var rawTime = appointment.time || appointment.start_time || appointment.startTime || appointment.appointment_time;
    if (!rawDate || !rawTime)
        return null;
    var baseDate = null;
    if (rawDate instanceof Date) {
        baseDate = rawDate;
    }
    else if (typeof rawDate === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            var _a = rawDate.split('-').map(Number), year = _a[0], month = _a[1], day = _a[2];
            baseDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        }
        else {
            var parsed = new Date(rawDate);
            if (!Number.isNaN(parsed.getTime())) {
                baseDate = parsed;
            }
        }
    }
    else if (rawDate && typeof rawDate.toDate === 'function') {
        baseDate = rawDate.toDate();
    }
    if (!baseDate || Number.isNaN(baseDate.getTime()))
        return null;
    var _b = String(rawTime).split(':'), hoursStr = _b[0], minutesStr = _b[1];
    var hours = Number(hoursStr);
    var minutes = Number(minutesStr);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes))
        return null;
    var appointmentDateTime = new Date(baseDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    return Number.isNaN(appointmentDateTime.getTime()) ? null : appointmentDateTime;
}
// ============================================================================
// SCHEDULED FUNCTION: Appointment Reminders
// ============================================================================
/**
 * Send Appointment Reminders
 * Runs daily at 08:00 to send reminders for appointments the next day
 *
 * Schedule: "every day 08:00"
 */
exports.appointmentReminders = (0, scheduler_1.onSchedule)({
    schedule: 'every day 08:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, tomorrow, dayAfter, snapshot, patientIds, orgIds, _a, patientMap_1, orgMap_1, remindersSent_1, results, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[appointmentReminders] Starting appointment reminder check', {
                    jobName: 'appointmentReminders',
                    scheduleTime: event.scheduleTime,
                });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                dayAfter = new Date(tomorrow);
                dayAfter.setDate(dayAfter.getDate() + 1);
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('status', '==', 'agendado')
                        .where('date', '>=', tomorrow.toISOString())
                        .where('date', '<', dayAfter.toISOString())
                        .get()];
            case 2:
                snapshot = _b.sent();
                if (snapshot.empty) {
                    firebase_functions_1.logger.info('[appointmentReminders] No appointments found for tomorrow');
                    void {
                        success: true,
                        remindersSent: 0,
                        timestamp: new Date().toISOString(),
                    };
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[appointmentReminders] Appointments found', {
                    count: snapshot.docs.length,
                });
                patientIds = snapshot.docs.map(function (doc) { return doc.data().patient_id; }).filter(Boolean);
                orgIds = snapshot.docs.map(function (doc) { return doc.data().organization_id; }).filter(Boolean);
                return [4 /*yield*/, Promise.all([
                        (0, init_1.batchFetchDocuments)('patients', patientIds),
                        (0, init_1.batchFetchDocuments)('organizations', orgIds),
                    ])];
            case 3:
                _a = _b.sent(), patientMap_1 = _a[0], orgMap_1 = _a[1];
                remindersSent_1 = 0;
                return [4 /*yield*/, Promise.all(snapshot.docs.map(function (docSnap) { return __awaiter(void 0, void 0, void 0, function () {
                        var appointment, patient, organization, preferences, orgSettings, emailEnabledByOrg, whatsappEnabledByOrg, emailEnabledByPatient, whatsappEnabledByPatient, reminderSnapshot, dispatchResult, emailSent, whatsappSent, pushSent, anySent, reminderRef, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    appointment = __assign({ id: docSnap.id }, docSnap.data());
                                    patient = patientMap_1.get(appointment.patient_id) || {
                                        id: appointment.patient_id,
                                        full_name: 'Unknown',
                                        name: 'Unknown',
                                    };
                                    organization = orgMap_1.get(appointment.organization_id) || {
                                        id: appointment.organization_id,
                                        name: 'Unknown',
                                    };
                                    preferences = patient.notification_preferences || {};
                                    orgSettings = (organization === null || organization === void 0 ? void 0 : organization.settings) || {};
                                    emailEnabledByOrg = orgSettings.email_enabled !== false;
                                    whatsappEnabledByOrg = orgSettings.whatsapp_enabled !== false;
                                    emailEnabledByPatient = preferences.email !== false;
                                    whatsappEnabledByPatient = preferences.whatsapp !== false;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, db
                                            .collection('appointment_reminders')
                                            .where('appointment_id', '==', appointment.id)
                                            .where('reminder_type', '==', 'day_before')
                                            .limit(1)
                                            .get()];
                                case 2:
                                    reminderSnapshot = _a.sent();
                                    if (!reminderSnapshot.empty) {
                                        firebase_functions_1.logger.info('[appointmentReminders] Reminder already sent', {
                                            appointmentId: appointment.id,
                                        });
                                        return [2 /*return*/, {
                                                appointmentId: appointment.id,
                                                sent: false,
                                                reason: 'Already sent',
                                            }];
                                    }
                                    if ((!emailEnabledByOrg && !whatsappEnabledByOrg) || (!emailEnabledByPatient && !whatsappEnabledByPatient)) {
                                        return [2 /*return*/, {
                                                appointmentId: appointment.id,
                                                sent: false,
                                                reason: 'Notifications disabled by preferences',
                                            }];
                                    }
                                    return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                                            kind: 'reminder_24h',
                                            organizationId: organization.id,
                                            appointmentId: appointment.id,
                                            patientId: patient.id,
                                            date: appointment.date,
                                            time: appointment.time || appointment.startTime,
                                            patientName: patient.full_name || patient.name || 'Paciente',
                                            therapistName: appointment.therapistName || 'Seu fisioterapeuta',
                                        })];
                                case 3:
                                    dispatchResult = _a.sent();
                                    emailSent = emailEnabledByOrg && emailEnabledByPatient && !!dispatchResult.email.sent;
                                    whatsappSent = whatsappEnabledByOrg && whatsappEnabledByPatient && !!dispatchResult.whatsapp.sent;
                                    pushSent = !!dispatchResult.push.sent;
                                    anySent = emailSent || whatsappSent || pushSent;
                                    if (anySent)
                                        remindersSent_1++;
                                    reminderRef = db.collection('appointment_reminders').doc();
                                    return [4 /*yield*/, reminderRef.create({
                                            appointment_id: appointment.id,
                                            patient_id: patient.id,
                                            organization_id: organization.id,
                                            reminder_type: 'day_before',
                                            sent_at: new Date().toISOString(),
                                            channels: {
                                                email: emailSent,
                                                whatsapp: whatsappSent,
                                                push: pushSent,
                                            },
                                            errors: {
                                                email: dispatchResult.email.error || null,
                                                whatsapp: dispatchResult.whatsapp.error || null,
                                                push: dispatchResult.push.error || null,
                                            },
                                        })];
                                case 4:
                                    _a.sent();
                                    return [2 /*return*/, {
                                            appointmentId: appointment.id,
                                            patientId: patient.id,
                                            sent: anySent,
                                        }];
                                case 5:
                                    error_2 = _a.sent();
                                    firebase_functions_1.logger.error('[appointmentReminders] Error processing appointment', {
                                        appointmentId: appointment.id,
                                        error: error_2,
                                    });
                                    return [2 /*return*/, {
                                            appointmentId: appointment.id,
                                            sent: false,
                                            error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                                        }];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 4:
                results = _b.sent();
                firebase_functions_1.logger.info('[appointmentReminders] Completed', {
                    remindersSent: remindersSent_1,
                    totalAppointments: snapshot.docs.length,
                });
                void {
                    success: true,
                    remindersSent: remindersSent_1,
                    totalAppointments: snapshot.docs.length,
                    timestamp: new Date().toISOString(),
                    results: results,
                };
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                firebase_functions_1.logger.error('[appointmentReminders] Fatal error', { error: error_1 });
                throw error_1;
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Send 2-hour reminders.
 * Runs every 30 minutes and targets appointments between 90 and 150 minutes from now.
 */
exports.appointmentReminders2h = (0, scheduler_1.onSchedule)({
    schedule: 'every 30 minutes',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var db, now, snapshot, start, end, _a, candidates;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                db = (0, init_1.getAdminDb)();
                now = new Date();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 5]);
                start = new Date(now);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 2);
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('status', '==', 'agendado')
                        .where('date', '>=', start.toISOString())
                        .where('date', '<', end.toISOString())
                        .get()];
            case 2:
                snapshot = _b.sent();
                return [3 /*break*/, 5];
            case 3:
                _a = _b.sent();
                return [4 /*yield*/, db.collection('appointments').where('status', '==', 'agendado').get()];
            case 4:
                snapshot = _b.sent();
                return [3 /*break*/, 5];
            case 5:
                if (snapshot.empty) {
                    return [2 /*return*/];
                }
                candidates = snapshot.docs
                    .map(function (docSnap) { return (__assign({ id: docSnap.id }, docSnap.data())); })
                    .filter(function (appointment) {
                    var appointmentDateTime = resolveAppointmentDateTime(appointment);
                    if (!appointmentDateTime)
                        return false;
                    var diffMinutes = (appointmentDateTime.getTime() - now.getTime()) / 60000;
                    return diffMinutes >= 90 && diffMinutes <= 150;
                });
                if (candidates.length === 0) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Promise.all(candidates.map(function (appointment) { return __awaiter(void 0, void 0, void 0, function () {
                        var reminderSnapshot, dispatch;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, db
                                        .collection('appointment_reminders')
                                        .where('appointment_id', '==', appointment.id)
                                        .where('reminder_type', '==', 'two_hours')
                                        .limit(1)
                                        .get()];
                                case 1:
                                    reminderSnapshot = _a.sent();
                                    if (!reminderSnapshot.empty) {
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, (0, notifications_1.dispatchAppointmentNotification)({
                                            kind: 'reminder_2h',
                                            organizationId: String(appointment.organization_id || 'system'),
                                            appointmentId: String(appointment.id),
                                            patientId: String(appointment.patient_id),
                                            date: String(appointment.date || appointment.appointment_date || ''),
                                            time: String(appointment.time || appointment.start_time || appointment.startTime || appointment.appointment_time || ''),
                                        })];
                                case 2:
                                    dispatch = _a.sent();
                                    return [4 /*yield*/, db.collection('appointment_reminders').doc().create({
                                            appointment_id: appointment.id,
                                            patient_id: appointment.patient_id,
                                            organization_id: appointment.organization_id,
                                            reminder_type: 'two_hours',
                                            sent_at: new Date().toISOString(),
                                            channels: {
                                                email: dispatch.email.sent,
                                                whatsapp: dispatch.whatsapp.sent,
                                            },
                                            errors: {
                                                email: dispatch.email.error || null,
                                                whatsapp: dispatch.whatsapp.error || null,
                                            },
                                        })];
                                case 3:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 6:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// FIRESTORE TRIGGER: Appointment Created
// ============================================================================
/**
 * Handle Appointment Created
 * Triggered when a new appointment is created in Firestore
 *
 * Actions:
 * - Send confirmation message to patient
 * - Invalidate caches
 */
exports.onAppointmentCreatedWorkflow = (0, firestore_1.onDocumentCreated)('appointments/{appointmentId}', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var snapshot, appointment, db, _a, patientSnap, orgSnap, patient, organization, whatsappEnabled, emailEnabled, emailResult, error_3, confirmationRef, error_4;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                snapshot = event.data;
                if (!snapshot)
                    return [2 /*return*/];
                appointment = __assign({ id: snapshot.id }, snapshot.data());
                db = (0, init_1.getAdminDb)();
                if (appointment.notification_origin === 'api_appointments_v2') {
                    firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Notification skipped (handled by API flow)', {
                        appointmentId: appointment.id,
                    });
                    return [2 /*return*/];
                }
                firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Processing new appointment', {
                    appointmentId: appointment.id,
                });
                _f.label = 1;
            case 1:
                _f.trys.push([1, 10, , 11]);
                return [4 /*yield*/, Promise.all([
                        db.collection('patients').doc(appointment.patient_id).get(),
                        db.collection('organizations').doc(appointment.organization_id).get(),
                    ])];
            case 2:
                _a = _f.sent(), patientSnap = _a[0], orgSnap = _a[1];
                if (!patientSnap.exists) {
                    firebase_functions_1.logger.warn('[onAppointmentCreatedWorkflow] Patient not found', {
                        patientId: appointment.patient_id,
                    });
                    return [2 /*return*/];
                }
                patient = __assign({ id: patientSnap.id }, patientSnap.data());
                organization = orgSnap.exists
                    ? __assign({ id: orgSnap.id }, orgSnap.data())
                    : null;
                whatsappEnabled = (_c = (_b = organization === null || organization === void 0 ? void 0 : organization.settings) === null || _b === void 0 ? void 0 : _b.whatsapp_enabled) !== null && _c !== void 0 ? _c : true;
                emailEnabled = (_e = (_d = organization === null || organization === void 0 ? void 0 : organization.settings) === null || _d === void 0 ? void 0 : _d.email_enabled) !== null && _e !== void 0 ? _e : true;
                if (!(emailEnabled && patient.email)) return [3 /*break*/, 7];
                _f.label = 3;
            case 3:
                _f.trys.push([3, 6, , 7]);
                return [4 /*yield*/, (0, resend_templates_1.sendAppointmentConfirmationEmail)(patient.email, {
                        patientName: patient.full_name || patient.name || 'Paciente',
                        therapistName: appointment.therapistName || 'Seu fisioterapeuta',
                        date: appointment.date,
                        time: appointment.time || appointment.startTime,
                        clinicName: (organization === null || organization === void 0 ? void 0 : organization.name) || 'FisioFlow',
                        clinicAddress: organization === null || organization === void 0 ? void 0 : organization.address,
                    })];
            case 4:
                emailResult = _f.sent();
                firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Email confirmation sent', {
                    patientEmail: patient.email,
                    success: emailResult.success,
                    error: emailResult.error,
                });
                // Create confirmation log
                return [4 /*yield*/, db.collection('appointment_confirmations').doc().create({
                        appointment_id: appointment.id,
                        patient_id: patient.id,
                        organization_id: organization === null || organization === void 0 ? void 0 : organization.id,
                        sent_at: new Date().toISOString(),
                        channel: 'email',
                        status: emailResult.success ? 'sent' : 'failed',
                        email_id: emailResult.id || null,
                        error: emailResult.error || null,
                    })];
            case 5:
                // Create confirmation log
                _f.sent();
                return [3 /*break*/, 7];
            case 6:
                error_3 = _f.sent();
                firebase_functions_1.logger.error('[onAppointmentCreatedWorkflow] Failed to send email confirmation', {
                    patientEmail: patient.email,
                    error: error_3,
                });
                return [3 /*break*/, 7];
            case 7:
                if (!(whatsappEnabled && patient.phone)) return [3 /*break*/, 9];
                // TODO: Send WhatsApp confirmation
                firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Queuing WhatsApp confirmation', {
                    patientPhone: patient.phone,
                    appointmentDate: appointment.date,
                });
                confirmationRef = db.collection('appointment_confirmations').doc();
                return [4 /*yield*/, confirmationRef.create({
                        appointment_id: appointment.id,
                        patient_id: patient.id,
                        organization_id: organization === null || organization === void 0 ? void 0 : organization.id,
                        sent_at: new Date().toISOString(),
                        channel: 'whatsapp',
                    })];
            case 8:
                _f.sent();
                _f.label = 9;
            case 9:
                // Invalidate cache (if using KV cache)
                // TODO: Implement cache invalidation
                firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Processed successfully', {
                    appointmentId: appointment.id,
                });
                return [2 /*return*/, {
                        success: true,
                        appointmentId: appointment.id,
                    }];
            case 10:
                error_4 = _f.sent();
                firebase_functions_1.logger.error('[onAppointmentCreatedWorkflow] Error', {
                    appointmentId: appointment.id,
                    error: error_4,
                });
                return [2 /*return*/, {
                        success: false,
                        appointmentId: appointment.id,
                        error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                    }];
            case 11: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// FIRESTORE TRIGGER: Appointment Updated (for feedback workflow)
// ============================================================================
/**
 * Handle Appointment Updated
 * Triggered when an appointment is updated
 * Used to trigger feedback request when appointment is completed
 */
exports.onAppointmentUpdatedWorkflow = (0, firestore_1.onDocumentUpdated)('appointments/{appointmentId}', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var before, after, completedStatuses, isCompleted, wasCompleted, appointmentId, db, feedbackRef;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
                after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
                if (!before || !after)
                    return [2 /*return*/];
                completedStatuses = ['concluido', 'realizado', 'attended', 'completed'];
                isCompleted = completedStatuses.includes((_c = after.status) === null || _c === void 0 ? void 0 : _c.toLowerCase());
                wasCompleted = completedStatuses.includes((_d = before.status) === null || _d === void 0 ? void 0 : _d.toLowerCase());
                if (!isCompleted || wasCompleted) {
                    return [2 /*return*/];
                }
                appointmentId = event.params.appointmentId;
                db = (0, init_1.getAdminDb)();
                firebase_functions_1.logger.info('[onAppointmentUpdatedWorkflow] Appointment completed, scheduling feedback', {
                    appointmentId: appointmentId,
                });
                feedbackRef = db.collection('feedback_tasks').doc();
                return [4 /*yield*/, feedbackRef.create({
                        appointment_id: appointmentId,
                        patient_id: after.patient_id,
                        organization_id: after.organization_id,
                        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
                        status: 'pending',
                        created_at: new Date().toISOString(),
                    })];
            case 1:
                _e.sent();
                firebase_functions_1.logger.info('[onAppointmentUpdatedWorkflow] Feedback task created', {
                    appointmentId: appointmentId,
                    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                });
                return [2 /*return*/, {
                        success: true,
                        feedbackScheduled: true,
                    }];
        }
    });
}); });
// ============================================================================
// HELPER FUNCTION: Get Appointments with Relations
// ============================================================================
function getAppointmentsWithRelations(startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var db, snapshot, patientIds, orgIds, _a, patientMap, orgMap, appointments, _i, _b, docSnap, appointment;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    db = (0, init_1.getAdminDb)();
                    return [4 /*yield*/, db
                            .collection('appointments')
                            .where('status', '==', 'agendado')
                            .where('date', '>=', startDate.toISOString())
                            .where('date', '<', endDate.toISOString())
                            .get()];
                case 1:
                    snapshot = _c.sent();
                    if (snapshot.empty) {
                        return [2 /*return*/, []];
                    }
                    patientIds = snapshot.docs.map(function (doc) { return doc.data().patient_id; }).filter(Boolean);
                    orgIds = snapshot.docs.map(function (doc) { return doc.data().organization_id; }).filter(Boolean);
                    return [4 /*yield*/, Promise.all([
                            (0, init_1.batchFetchDocuments)('patients', patientIds),
                            (0, init_1.batchFetchDocuments)('organizations', orgIds),
                        ])];
                case 2:
                    _a = _c.sent(), patientMap = _a[0], orgMap = _a[1];
                    appointments = [];
                    for (_i = 0, _b = snapshot.docs; _i < _b.length; _i++) {
                        docSnap = _b[_i];
                        appointment = __assign({ id: docSnap.id }, docSnap.data());
                        appointments.push({
                            id: appointment.id,
                            date: appointment.date,
                            time: appointment.time,
                            patient_id: appointment.patient_id,
                            organization_id: appointment.organization_id,
                            patient: patientMap.get(appointment.patient_id) || {
                                id: appointment.patient_id,
                                full_name: 'Unknown',
                                name: 'Unknown',
                            },
                            organization: orgMap.get(appointment.organization_id) || {
                                id: appointment.organization_id,
                                name: 'Unknown',
                            },
                        });
                    }
                    return [2 /*return*/, appointments];
            }
        });
    });
}
