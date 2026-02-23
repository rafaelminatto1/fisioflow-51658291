"use strict";
/**
 * Notification Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - sendNotificationWorkflow → Callable Function + Pub/Sub
 * - sendNotificationBatchWorkflow → Callable Function
 * - Integrado com Firebase Cloud Messaging para push
 *
 * @version 2.0.0 - Fixed Firestore API usage
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
exports.emailWebhook = exports.processNotificationQueue = exports.sendNotificationBatch = exports.notifyAppointmentCancellation = exports.notifyAppointmentReschedule = exports.notifyAppointmentScheduled = exports.sendNotification = void 0;
exports.dispatchAppointmentNotification = dispatchAppointmentNotification;
// Firebase Functions v2 CORS - explicitly list allowed origins
var https_1 = require("firebase-functions/v2/https");
var pubsub_1 = require("firebase-functions/v2/pubsub");
var firebase_functions_1 = require("firebase-functions");
var init_1 = require("../init");
var firestore_1 = require("firebase-admin/firestore");
var resend_templates_1 = require("../communications/resend-templates");
var whatsapp_1 = require("../communications/whatsapp");
var push_notifications_1 = require("../integrations/notifications/push-notifications");
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
// ============================================================================
// COLLECTION REFERENCES
// ============================================================================
function getNotificationsCollection() {
    var db = (0, init_1.getAdminDb)();
    return db.collection('notifications');
}
var DEFAULT_SCHEDULE_NOTIFICATION_SETTINGS = {
    send_confirmation_email: true,
    send_confirmation_whatsapp: true,
    send_reminder_24h: true,
    send_reminder_2h: true,
    send_cancellation_notice: true,
    send_push_notifications: true,
};
function formatDatePtBr(dateValue) {
    var parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
        return dateValue;
    }
    return parsed.toLocaleDateString('pt-BR');
}
function renderTemplateMessage(template, vars) {
    return Object.entries(vars).reduce(function (acc, _a) {
        var key = _a[0], value = _a[1];
        var escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return acc.replace(new RegExp(escapedKey, 'g'), value);
    }, template);
}
function getDefaultMessage(kind, patientName, date, time) {
    if (kind === 'cancelled') {
        return "Ol\u00E1 ".concat(patientName, ", sua consulta de ").concat(date, " \u00E0s ").concat(time, " foi cancelada.");
    }
    if (kind === 'reminder_24h' || kind === 'reminder_2h') {
        return "Ol\u00E1 ".concat(patientName, ", lembrete da sua consulta em ").concat(date, " \u00E0s ").concat(time, ".");
    }
    if (kind === 'rescheduled') {
        return "Ol\u00E1 ".concat(patientName, ", sua consulta foi reagendada para ").concat(date, " \u00E0s ").concat(time, ".");
    }
    return "Ol\u00E1 ".concat(patientName, ", sua consulta foi confirmada para ").concat(date, " \u00E0s ").concat(time, ".");
}
function dispatchAppointmentNotification(input) {
    return __awaiter(this, void 0, void 0, function () {
        var db, patientSnap, patientData, resolvedOrganizationId, _a, settingsSnap, organizationSnap, settings, organizationData, patientName, therapistName, clinicName, clinicAddress, dateLabel, templateVars, eventAllowsEmail, eventAllowsWhatsApp, eventAllowsPush, fallbackMessage, email, phone, emailResult, html, sendResult, customTemplate, rendered, html, sendResult, sendResult, customTemplate, rendered, html, sendResult, sendResult, error_1, whatsappResult, to, customTemplate, template, templateError_1, textError_1, pushResult, pushTitle, pushResponse, pushError_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    db = (0, init_1.getAdminDb)();
                    return [4 /*yield*/, db.collection('patients').doc(input.patientId).get()];
                case 1:
                    patientSnap = _b.sent();
                    patientData = patientSnap.exists ? patientSnap.data() : {};
                    resolvedOrganizationId = (input.organizationId && input.organizationId !== 'system'
                        ? input.organizationId
                        : String(patientData.organization_id || input.organizationId || 'system'));
                    return [4 /*yield*/, Promise.all([
                            db.collection('schedule_notification_settings').doc(resolvedOrganizationId).get(),
                            db.collection('organizations').doc(resolvedOrganizationId).get(),
                        ])];
                case 2:
                    _a = _b.sent(), settingsSnap = _a[0], organizationSnap = _a[1];
                    settings = __assign(__assign({}, DEFAULT_SCHEDULE_NOTIFICATION_SETTINGS), (settingsSnap.exists ? settingsSnap.data() : {}));
                    organizationData = organizationSnap.exists ? organizationSnap.data() : {};
                    patientName = input.patientName || String(patientData.full_name || patientData.name || 'Paciente');
                    therapistName = input.therapistName || 'Seu fisioterapeuta';
                    clinicName = String(organizationData.name || 'FisioFlow');
                    clinicAddress = organizationData.address ? String(organizationData.address) : undefined;
                    dateLabel = formatDatePtBr(input.date);
                    templateVars = {
                        '{nome}': patientName,
                        '{data}': dateLabel,
                        '{hora}': input.time,
                        '{tipo}': 'Fisioterapia',
                        '{terapeuta}': therapistName,
                    };
                    eventAllowsEmail = input.kind === 'cancelled'
                        ? !!settings.send_cancellation_notice
                        : (input.kind === 'reminder_24h'
                            ? !!settings.send_reminder_24h
                            : (input.kind === 'reminder_2h'
                                ? !!settings.send_reminder_2h
                                : !!settings.send_confirmation_email));
                    eventAllowsWhatsApp = input.kind === 'cancelled'
                        ? !!settings.send_cancellation_notice
                        : (input.kind === 'reminder_24h'
                            ? !!settings.send_reminder_24h
                            : (input.kind === 'reminder_2h'
                                ? !!settings.send_reminder_2h
                                : !!settings.send_confirmation_whatsapp));
                    eventAllowsPush = settings.send_push_notifications !== false;
                    fallbackMessage = getDefaultMessage(input.kind, patientName, dateLabel, input.time);
                    email = patientData.email ? String(patientData.email) : '';
                    phone = patientData.phone ? String(patientData.phone) : '';
                    emailResult = {
                        sent: false,
                        channel: 'email',
                    };
                    if (!!eventAllowsEmail) return [3 /*break*/, 3];
                    emailResult.error = 'Disabled by schedule settings';
                    return [3 /*break*/, 17];
                case 3:
                    if (!!email) return [3 /*break*/, 4];
                    emailResult.error = 'Patient has no email';
                    return [3 /*break*/, 17];
                case 4:
                    _b.trys.push([4, 16, , 17]);
                    if (!(input.kind === 'cancelled')) return [3 /*break*/, 6];
                    html = "\n          <div style=\"font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;\">\n            <h2 style=\"margin: 0 0 12px;\">Consulta cancelada</h2>\n            <p>Ol\u00E1 <strong>".concat(patientName, "</strong>,</p>\n            <p>Sua consulta de <strong>").concat(dateLabel, "</strong> \u00E0s <strong>").concat(input.time, "</strong> foi cancelada.</p>\n            <p style=\"color: #6b7280; margin-top: 16px;\">").concat(clinicName, "</p>\n          </div>\n        ");
                    return [4 /*yield*/, (0, resend_templates_1.sendEmail)({
                            to: email,
                            subject: 'Consulta cancelada',
                            html: html,
                        })];
                case 5:
                    sendResult = _b.sent();
                    emailResult.sent = !!sendResult.success;
                    emailResult.error = sendResult.error;
                    return [3 /*break*/, 15];
                case 6:
                    if (!(input.kind === 'reminder_24h' || input.kind === 'reminder_2h')) return [3 /*break*/, 11];
                    customTemplate = (settings.custom_reminder_message || '').trim();
                    if (!customTemplate) return [3 /*break*/, 8];
                    rendered = renderTemplateMessage(customTemplate, templateVars);
                    html = "\n            <div style=\"font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;\">\n              <p style=\"white-space: pre-wrap;\">".concat(rendered, "</p>\n              <p style=\"color: #6b7280; margin-top: 16px;\">").concat(clinicName, "</p>\n            </div>\n          ");
                    return [4 /*yield*/, (0, resend_templates_1.sendEmail)({
                            to: email,
                            subject: 'Lembrete de consulta',
                            html: html,
                        })];
                case 7:
                    sendResult = _b.sent();
                    emailResult.sent = !!sendResult.success;
                    emailResult.error = sendResult.error;
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, (0, resend_templates_1.sendAppointmentReminderEmail)(email, {
                        patientName: patientName,
                        therapistName: therapistName,
                        date: input.date,
                        time: input.time,
                        clinicName: clinicName,
                    })];
                case 9:
                    sendResult = _b.sent();
                    emailResult.sent = !!sendResult.success;
                    emailResult.error = sendResult.error;
                    _b.label = 10;
                case 10: return [3 /*break*/, 15];
                case 11:
                    customTemplate = (settings.custom_confirmation_message || '').trim();
                    if (!customTemplate) return [3 /*break*/, 13];
                    rendered = renderTemplateMessage(customTemplate, templateVars);
                    html = "\n            <div style=\"font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;\">\n              <p style=\"white-space: pre-wrap;\">".concat(rendered, "</p>\n              <p style=\"color: #6b7280; margin-top: 16px;\">").concat(clinicName, "</p>\n            </div>\n          ");
                    return [4 /*yield*/, (0, resend_templates_1.sendEmail)({
                            to: email,
                            subject: input.kind === 'rescheduled' ? 'Consulta reagendada' : 'Consulta confirmada',
                            html: html,
                        })];
                case 12:
                    sendResult = _b.sent();
                    emailResult.sent = !!sendResult.success;
                    emailResult.error = sendResult.error;
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, (0, resend_templates_1.sendAppointmentConfirmationEmail)(email, {
                        patientName: patientName,
                        therapistName: therapistName,
                        date: input.date,
                        time: input.time,
                        clinicName: clinicName,
                        clinicAddress: clinicAddress,
                    })];
                case 14:
                    sendResult = _b.sent();
                    emailResult.sent = !!sendResult.success;
                    emailResult.error = sendResult.error;
                    _b.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    error_1 = _b.sent();
                    emailResult.sent = false;
                    emailResult.error = error_1 instanceof Error ? error_1.message : 'Failed to send email';
                    return [3 /*break*/, 17];
                case 17:
                    whatsappResult = {
                        sent: false,
                        channel: 'whatsapp',
                    };
                    if (!!eventAllowsWhatsApp) return [3 /*break*/, 18];
                    whatsappResult.error = 'Disabled by schedule settings';
                    return [3 /*break*/, 30];
                case 18:
                    if (!!phone) return [3 /*break*/, 19];
                    whatsappResult.error = 'Patient has no phone';
                    return [3 /*break*/, 30];
                case 19:
                    to = (0, whatsapp_1.formatPhoneForWhatsApp)(phone);
                    customTemplate = ((input.kind === 'reminder_24h' || input.kind === 'reminder_2h'
                        ? settings.custom_reminder_message
                        : settings.custom_confirmation_message) || '').trim();
                    _b.label = 20;
                case 20:
                    _b.trys.push([20, 25, , 30]);
                    if (!(customTemplate && input.kind !== 'cancelled')) return [3 /*break*/, 22];
                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTextMessageInternal)({
                            to: to,
                            message: renderTemplateMessage(customTemplate, templateVars),
                        })];
                case 21:
                    _b.sent();
                    whatsappResult.sent = true;
                    return [3 /*break*/, 24];
                case 22:
                    template = input.kind === 'cancelled'
                        ? whatsapp_1.WhatsAppTemplate.APPOINTMENT_CANCELLED
                        : (input.kind === 'reminder_24h' || input.kind === 'reminder_2h'
                            ? whatsapp_1.WhatsAppTemplate.APPOINTMENT_REMINDER
                            : whatsapp_1.WhatsAppTemplate.APPOINTMENT_CONFIRMATION);
                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTemplateMessageInternal)({
                            to: to,
                            template: template,
                            language: 'pt_BR',
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: patientName },
                                        { type: 'text', text: dateLabel },
                                        { type: 'text', text: input.time },
                                    ],
                                },
                            ],
                        })];
                case 23:
                    _b.sent();
                    whatsappResult.sent = true;
                    _b.label = 24;
                case 24: return [3 /*break*/, 30];
                case 25:
                    templateError_1 = _b.sent();
                    _b.label = 26;
                case 26:
                    _b.trys.push([26, 28, , 29]);
                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTextMessageInternal)({ to: to, message: fallbackMessage })];
                case 27:
                    _b.sent();
                    whatsappResult.sent = true;
                    return [3 /*break*/, 29];
                case 28:
                    textError_1 = _b.sent();
                    whatsappResult.sent = false;
                    whatsappResult.error = textError_1 instanceof Error
                        ? textError_1.message
                        : (templateError_1 instanceof Error ? templateError_1.message : 'Failed to send WhatsApp');
                    return [3 /*break*/, 29];
                case 29: return [3 /*break*/, 30];
                case 30:
                    pushResult = {
                        sent: false,
                        channel: 'push',
                    };
                    if (!!eventAllowsPush) return [3 /*break*/, 31];
                    pushResult.error = 'Disabled by schedule settings';
                    return [3 /*break*/, 35];
                case 31:
                    pushTitle = input.kind === 'cancelled'
                        ? 'Consulta cancelada'
                        : input.kind === 'rescheduled'
                            ? 'Consulta reagendada'
                            : (input.kind === 'reminder_24h' || input.kind === 'reminder_2h')
                                ? 'Lembrete de consulta'
                                : 'Consulta confirmada';
                    _b.label = 32;
                case 32:
                    _b.trys.push([32, 34, , 35]);
                    return [4 /*yield*/, (0, push_notifications_1.sendPushNotificationToUser)(input.patientId, {
                            title: pushTitle,
                            body: fallbackMessage,
                            data: {
                                type: 'appointment_notification',
                                appointmentId: input.appointmentId,
                                kind: input.kind,
                            },
                        })];
                case 33:
                    pushResponse = _b.sent();
                    if (pushResponse.successCount > 0) {
                        pushResult.sent = true;
                    }
                    if (pushResponse.failureCount > 0 || pushResponse.errors.length > 0) {
                        pushResult.error = pushResponse.errors.length > 0
                            ? pushResponse.errors.join('; ')
                            : 'One or more push notifications failed';
                    }
                    else if (pushResponse.successCount === 0) {
                        pushResult.error = 'Nenhum token válido encontrado';
                    }
                    return [3 /*break*/, 35];
                case 34:
                    pushError_1 = _b.sent();
                    pushResult.error = pushError_1 instanceof Error ? pushError_1.message : 'Failed to send push notification';
                    return [3 /*break*/, 35];
                case 35: return [2 /*return*/, {
                        email: emailResult,
                        whatsapp: whatsappResult,
                        push: pushResult,
                    }];
            }
        });
    });
}
// ============================================================================
// CALLABLE FUNCTION: Send Single Notification
// ============================================================================
/**
 * Send a single notification
 *
 * Usage:
 * ```ts
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const sendNotification = httpsCallable(functions, 'sendNotification');
 *
 * const result = await sendNotification({
 *   userId: 'xxx',
 *   organizationId: 'yyy',
 *   type: 'email',
 *   data: { to: 'user@example.com', subject: 'Test', body: 'Hello' }
 * });
 * ```
 */
exports.sendNotification = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, userId, organizationId, type, notificationData, validTypes, db, notificationRef, notificationId, notificationDoc, result, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                // Auth check
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, userId = _a.userId, organizationId = _a.organizationId, type = _a.type, notificationData = _a.notificationData;
                if (!userId || !organizationId || !type || !notificationData) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
                }
                validTypes = ['email', 'whatsapp', 'push'];
                if (!validTypes.includes(type)) {
                    throw new https_1.HttpsError('invalid-argument', "Invalid notification type: ".concat(type));
                }
                db = (0, init_1.getAdminDb)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                notificationRef = getNotificationsCollection().doc();
                notificationId = notificationRef.id;
                notificationDoc = {
                    user_id: userId,
                    organization_id: organizationId,
                    type: type,
                    channel: type,
                    status: 'pending',
                    data: notificationData,
                    created_at: new Date().toISOString(),
                    retry_count: 0,
                };
                return [4 /*yield*/, notificationRef.create(notificationDoc)];
            case 2:
                _b.sent();
                return [4 /*yield*/, sendNotificationByType(type, notificationData, db, userId)];
            case 3:
                result = _b.sent();
                // Update notification status
                return [4 /*yield*/, notificationRef.update({
                        status: result.sent ? 'sent' : 'failed',
                        sent_at: firestore_1.FieldValue.serverTimestamp(),
                        error_message: result.error || null,
                    })];
            case 4:
                // Update notification status
                _b.sent();
                firebase_functions_1.logger.info('[sendNotification] Notification processed', {
                    notificationId: notificationId,
                    sent: result.sent,
                    channel: result.channel,
                });
                return [2 /*return*/, {
                        success: result.sent,
                        notificationId: notificationId,
                        result: result,
                    }];
            case 5:
                error_2 = _b.sent();
                firebase_functions_1.logger.error('[sendNotification] Error sending notification', {
                    userId: userId,
                    type: type,
                    error: error_2,
                });
                throw new https_1.HttpsError('internal', 'Failed to send notification');
            case 6: return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// CALLABLE FUNCTION: Schedule Appointment Notification
// ============================================================================
exports.notifyAppointmentScheduled = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, appointmentId, patientId, date, time, patientName, organizationId, db, notificationRef, notificationId, notificationData, notificationDoc, channelDispatch, pushData, pushResult, result;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, appointmentId = _a.appointmentId, patientId = _a.patientId, date = _a.date, time = _a.time, patientName = _a.patientName, organizationId = _a.organizationId;
                if (!appointmentId || !patientId || !date || !time) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
                }
                db = (0, init_1.getAdminDb)();
                notificationRef = getNotificationsCollection().doc();
                notificationId = notificationRef.id;
                notificationData = {
                    appointmentId: appointmentId,
                    patientId: patientId,
                    date: date,
                    time: time,
                    patientName: patientName,
                };
                notificationDoc = {
                    user_id: patientId,
                    organization_id: organizationId || 'system',
                    type: 'push',
                    channel: 'push',
                    status: 'pending',
                    data: notificationData,
                    created_at: new Date().toISOString(),
                    retry_count: 0,
                };
                return [4 /*yield*/, notificationRef.create(notificationDoc)];
            case 1:
                _b.sent();
                return [4 /*yield*/, dispatchAppointmentNotification({
                        kind: 'scheduled',
                        organizationId: organizationId || 'system',
                        patientId: patientId,
                        appointmentId: appointmentId,
                        date: date,
                        time: time,
                        patientName: patientName,
                    })];
            case 2:
                channelDispatch = _b.sent();
                pushData = {
                    to: patientId,
                    subject: 'Lembrete de Consulta',
                    body: "Ol\u00E1 ".concat(patientName || 'paciente', ", voc\u00EA tem uma consulta agendada para ").concat(new Date(date).toLocaleDateString('pt-BR'), " \u00E0s ").concat(time, "."),
                    appointmentId: appointmentId,
                    action: 'appointment_reminder',
                };
                return [4 /*yield*/, sendNotificationByType('push', pushData, db, patientId)];
            case 3:
                pushResult = _b.sent();
                result = {
                    sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
                    channel: 'appointment_multichannel',
                    error: [
                        channelDispatch.email.error,
                        channelDispatch.whatsapp.error,
                        pushResult.error,
                    ].filter(Boolean).join(' | ') || undefined,
                };
                return [4 /*yield*/, notificationRef.update({
                        status: result.sent ? 'sent' : 'failed',
                        sent_at: firestore_1.FieldValue.serverTimestamp(),
                        error_message: result.error || null,
                        channel_results: {
                            email: channelDispatch.email,
                            whatsapp: channelDispatch.whatsapp,
                            push: pushResult,
                        },
                    })];
            case 4:
                _b.sent();
                return [2 /*return*/, {
                        success: result.sent,
                        notificationId: notificationId,
                        result: result,
                    }];
        }
    });
}); });
// ============================================================================
// CALLABLE FUNCTION: Reschedule Appointment Notification
// ============================================================================
exports.notifyAppointmentReschedule = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, appointmentId, patientId, newDate, newTime, patientName, organizationId, db, notificationRef, notificationId, notificationData, notificationDoc, channelDispatch, pushData, pushResult, result;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, appointmentId = _a.appointmentId, patientId = _a.patientId, newDate = _a.newDate, newTime = _a.newTime, patientName = _a.patientName, organizationId = _a.organizationId;
                if (!appointmentId || !patientId || !newDate || !newTime) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
                }
                db = (0, init_1.getAdminDb)();
                notificationRef = getNotificationsCollection().doc();
                notificationId = notificationRef.id;
                notificationData = {
                    appointmentId: appointmentId,
                    patientId: patientId,
                    date: newDate,
                    time: newTime,
                    patientName: patientName,
                };
                notificationDoc = {
                    user_id: patientId,
                    organization_id: organizationId || 'system',
                    type: 'push',
                    channel: 'push',
                    status: 'pending',
                    data: notificationData,
                    created_at: new Date().toISOString(),
                    retry_count: 0,
                };
                return [4 /*yield*/, notificationRef.create(notificationDoc)];
            case 1:
                _b.sent();
                return [4 /*yield*/, dispatchAppointmentNotification({
                        kind: 'rescheduled',
                        organizationId: organizationId || 'system',
                        patientId: patientId,
                        appointmentId: appointmentId,
                        date: newDate,
                        time: newTime,
                        patientName: patientName,
                    })];
            case 2:
                channelDispatch = _b.sent();
                pushData = {
                    to: patientId,
                    subject: 'Consulta Reagendada',
                    body: "Ol\u00E1 ".concat(patientName || 'paciente', ", sua consulta foi reagendada para ").concat(new Date(newDate).toLocaleDateString('pt-BR'), " \u00E0s ").concat(newTime, "."),
                    appointmentId: appointmentId,
                    action: 'appointment_reschedule',
                };
                return [4 /*yield*/, sendNotificationByType('push', pushData, db, patientId)];
            case 3:
                pushResult = _b.sent();
                result = {
                    sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
                    channel: 'appointment_multichannel',
                    error: [
                        channelDispatch.email.error,
                        channelDispatch.whatsapp.error,
                        pushResult.error,
                    ].filter(Boolean).join(' | ') || undefined,
                };
                return [4 /*yield*/, notificationRef.update({
                        status: result.sent ? 'sent' : 'failed',
                        sent_at: firestore_1.FieldValue.serverTimestamp(),
                        error_message: result.error || null,
                        channel_results: {
                            email: channelDispatch.email,
                            whatsapp: channelDispatch.whatsapp,
                            push: pushResult,
                        },
                    })];
            case 4:
                _b.sent();
                return [2 /*return*/, {
                        success: result.sent,
                        notificationId: notificationId,
                        result: result,
                    }];
        }
    });
}); });
// ============================================================================
// CALLABLE FUNCTION: Cancel Appointment Notification
// ============================================================================
exports.notifyAppointmentCancellation = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, appointmentId, patientId, date, time, patientName, organizationId, db, notificationRef, notificationId, notificationData, notificationDoc, channelDispatch, pushData, pushResult, result;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, appointmentId = _a.appointmentId, patientId = _a.patientId, date = _a.date, time = _a.time, patientName = _a.patientName, organizationId = _a.organizationId;
                if (!appointmentId || !patientId || !date || !time) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
                }
                db = (0, init_1.getAdminDb)();
                notificationRef = getNotificationsCollection().doc();
                notificationId = notificationRef.id;
                notificationData = {
                    appointmentId: appointmentId,
                    patientId: patientId,
                    date: date,
                    time: time,
                    patientName: patientName,
                };
                notificationDoc = {
                    user_id: patientId,
                    organization_id: organizationId || 'system',
                    type: 'push',
                    channel: 'push',
                    status: 'pending',
                    data: notificationData,
                    created_at: new Date().toISOString(),
                    retry_count: 0,
                };
                return [4 /*yield*/, notificationRef.create(notificationDoc)];
            case 1:
                _b.sent();
                return [4 /*yield*/, dispatchAppointmentNotification({
                        kind: 'cancelled',
                        organizationId: organizationId || 'system',
                        patientId: patientId,
                        appointmentId: appointmentId,
                        date: date,
                        time: time,
                        patientName: patientName,
                    })];
            case 2:
                channelDispatch = _b.sent();
                pushData = {
                    to: patientId,
                    subject: 'Consulta Cancelada',
                    body: "Ol\u00E1 ".concat(patientName || 'paciente', ", sua consulta de ").concat(new Date(date).toLocaleDateString('pt-BR'), " \u00E0s ").concat(time, " foi cancelada."),
                    appointmentId: appointmentId,
                    action: 'appointment_cancellation',
                };
                return [4 /*yield*/, sendNotificationByType('push', pushData, db, patientId)];
            case 3:
                pushResult = _b.sent();
                result = {
                    sent: channelDispatch.email.sent || channelDispatch.whatsapp.sent || pushResult.sent,
                    channel: 'appointment_multichannel',
                    error: [
                        channelDispatch.email.error,
                        channelDispatch.whatsapp.error,
                        pushResult.error,
                    ].filter(Boolean).join(' | ') || undefined,
                };
                return [4 /*yield*/, notificationRef.update({
                        status: result.sent ? 'sent' : 'failed',
                        sent_at: firestore_1.FieldValue.serverTimestamp(),
                        error_message: result.error || null,
                        channel_results: {
                            email: channelDispatch.email,
                            whatsapp: channelDispatch.whatsapp,
                            push: pushResult,
                        },
                    })];
            case 4:
                _b.sent();
                return [2 /*return*/, {
                        success: result.sent,
                        notificationId: notificationId,
                        result: result,
                    }];
        }
    });
}); });
exports.sendNotificationBatch = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, organizationId, notifications, db, batch, notificationIds, _i, notifications_1, notification, ref, notificationDoc;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, notifications = _a.notifications;
                if (!Array.isArray(notifications) || notifications.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'No notifications provided');
                }
                if (notifications.length > 100) {
                    throw new https_1.HttpsError('out-of-range', 'Maximum 100 notifications per batch');
                }
                db = (0, init_1.getAdminDb)();
                batch = db.batch();
                notificationIds = [];
                // Create notification records in batch
                for (_i = 0, notifications_1 = notifications; _i < notifications_1.length; _i++) {
                    notification = notifications_1[_i];
                    ref = getNotificationsCollection().doc();
                    notificationIds.push(ref.id);
                    notificationDoc = {
                        user_id: notification.userId,
                        organization_id: organizationId,
                        type: notification.type,
                        channel: notification.type,
                        status: 'pending',
                        data: notification.data,
                        created_at: new Date().toISOString(),
                        retry_count: 0,
                    };
                    batch.create(ref, notificationDoc);
                }
                return [4 /*yield*/, batch.commit()];
            case 1:
                _b.sent();
                // Queue for async processing via Pub/Sub
                // In production, you would publish to a Pub/Sub topic here
                // and have a separate function handle the actual sending
                firebase_functions_1.logger.info('[sendNotificationBatch] Batch queued', {
                    count: notifications.length,
                    notificationIds: notificationIds,
                });
                return [2 /*return*/, {
                        success: true,
                        queued: notifications.length,
                        timestamp: new Date().toISOString(),
                    }];
        }
    });
}); });
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function sendNotificationByType(type, data, db, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, to, subject, body, html, result, to, error_3, messaging, tokensSnapshot, tokens, message, response, batch_1, _loop_1, i;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = type;
                    switch (_a) {
                        case 'email': return [3 /*break*/, 1];
                        case 'whatsapp': return [3 /*break*/, 3];
                        case 'push': return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 12];
                case 1:
                    to = String(data.to || data.email || '').trim();
                    if (!to || !to.includes('@')) {
                        return [2 /*return*/, { sent: false, channel: 'email', error: 'Invalid email recipient' }];
                    }
                    subject = String(data.subject || 'FisioFlow');
                    body = String(data.body || '');
                    html = typeof data.html === 'string' && data.html.trim()
                        ? data.html
                        : "<div style=\"font-family: Arial, sans-serif; line-height: 1.5;\"><p style=\"white-space: pre-wrap;\">".concat(body, "</p></div>");
                    return [4 /*yield*/, (0, resend_templates_1.sendEmail)({ to: to, subject: subject, html: html })];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, { sent: !!result.success, channel: 'email', error: result.error }];
                case 3:
                    to = String(data.to || data.phone || '').trim();
                    if (!to) {
                        return [2 /*return*/, { sent: false, channel: 'whatsapp', error: 'Missing recipient phone' }];
                    }
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, whatsapp_1.sendWhatsAppTextMessageInternal)({
                            to: (0, whatsapp_1.formatPhoneForWhatsApp)(to),
                            message: String(data.body || ''),
                        })];
                case 5:
                    _b.sent();
                    return [2 /*return*/, { sent: true, channel: 'whatsapp' }];
                case 6:
                    error_3 = _b.sent();
                    return [2 /*return*/, {
                            sent: false,
                            channel: 'whatsapp',
                            error: error_3 instanceof Error ? error_3.message : 'Failed to send WhatsApp',
                        }];
                case 7:
                    messaging = (0, init_1.getAdminMessaging)();
                    return [4 /*yield*/, db
                            .collection('user_tokens')
                            .doc(userId)
                            .collection('push')
                            .where('active', '==', true)
                            .get()];
                case 8:
                    tokensSnapshot = _b.sent();
                    if (tokensSnapshot.empty) {
                        firebase_functions_1.logger.warn('[Notification] No push tokens found', { userId: userId });
                        return [2 /*return*/, { sent: false, channel: 'push', error: 'No tokens found' }];
                    }
                    tokens = tokensSnapshot.docs.map(function (doc) { return doc.data().token; }).filter(function (t) { return !!t; });
                    if (tokens.length === 0) {
                        return [2 /*return*/, { sent: false, channel: 'push', error: 'No valid tokens' }];
                    }
                    message = {
                        notification: {
                            title: data.subject || 'FisioFlow',
                            body: data.body,
                        },
                        data: Object.entries(data).reduce(function (acc, _a) {
                            var _b;
                            var k = _a[0], v = _a[1];
                            return (__assign(__assign({}, acc), (_b = {}, _b[k] = String(v), _b)));
                        }, { type: 'PROMOTIONAL' }),
                        tokens: tokens,
                    };
                    return [4 /*yield*/, messaging.sendEachForMulticast(message)];
                case 9:
                    response = _b.sent();
                    if (!(response.failureCount > 0)) return [3 /*break*/, 11];
                    firebase_functions_1.logger.warn('[Notification] Some push notifications failed', {
                        success: response.successCount,
                        failure: response.failureCount,
                    });
                    batch_1 = db.batch();
                    _loop_1 = function (i) {
                        if (!response.responses[i].success) {
                            var error = response.responses[i].error;
                            if ((error === null || error === void 0 ? void 0 : error.code) === 'messaging/registration-token-not-registered') {
                                // Find and delete the invalid token
                                var invalidToken_1 = tokens[i];
                                var invalidTokenDocs = tokensSnapshot.docs.filter(function (doc) { return doc.data().token === invalidToken_1; });
                                invalidTokenDocs.forEach(function (doc) { return batch_1.delete(doc.ref); });
                            }
                        }
                    };
                    for (i = 0; i < response.responses.length; i++) {
                        _loop_1(i);
                    }
                    if (!(response.failureCount > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, batch_1.commit()];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11: return [2 /*return*/, {
                        sent: response.successCount > 0,
                        channel: 'push',
                        error: response.failureCount === tokens.length ? 'All failed' : undefined,
                    }];
                case 12: return [2 /*return*/, { sent: false, channel: type, error: 'Unknown type' }];
            }
        });
    });
}
// ============================================================================
// PUBSUB FUNCTION: Process Notification Queue
// ============================================================================
/**
 * Process notification queue
 * Triggered by Pub/Sub for async processing
 *
 * To trigger this function:
 * ```bash
 * gcloud pubsub topics publish notification-queue --message='{...}'
 * ```
 */
exports.processNotificationQueue = (0, pubsub_1.onMessagePublished)({
    topic: 'notification-queue',
    region: 'southamerica-east1',
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var message;
    return __generator(this, function (_a) {
        message = event.data.message.json;
        firebase_functions_1.logger.info('[processNotificationQueue] Processing notification', { message: message });
        // Process notification from queue
        // This would handle the actual sending to email/whatsapp providers
        return [2 /*return*/, {
                success: true,
                processedAt: new Date().toISOString(),
            }];
    });
}); });
// ============================================================================
// HTTP FUNCTION: Webhook for Email Provider (e.g., SendGrid)
// ============================================================================
/**
 * Webhook for email delivery status updates
 * Integrates with SendGrid/Mailgun webhooks
 */
exports.emailWebhook = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        data = request.data;
        // Process webhook data from email provider
        // Update notification status in Firestore
        firebase_functions_1.logger.info('[emailWebhook] Received webhook', { data: data });
        return [2 /*return*/, { success: true }];
    });
}); });
