"use strict";
/**
 * WhatsApp Business API Integration
 *
 * Integração com WhatsApp Cloud API para envio de mensagens
 *
 * @module communications/whatsapp
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
exports.getWhatsAppHistory = exports.testWhatsAppTemplate = exports.testWhatsAppMessage = exports.whatsappWebhookHttp = exports.sendWhatsAppExerciseAssigned = exports.sendWhatsAppCustomMessage = exports.sendWhatsAppWelcome = exports.sendWhatsAppAppointmentReminder = exports.sendWhatsAppAppointmentConfirmation = exports.WhatsAppTemplate = exports.WHATSAPP_ACCESS_TOKEN_SECRET = exports.WHATSAPP_PHONE_NUMBER_ID_SECRET = void 0;
exports.sendWhatsAppTemplateMessageInternal = sendWhatsAppTemplateMessageInternal;
exports.sendWhatsAppTextMessageInternal = sendWhatsAppTextMessageInternal;
exports.formatPhoneForWhatsApp = formatPhoneForWhatsApp;
exports.isValidWhatsAppPhone = isValidWhatsAppPhone;
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var logger = require("firebase-functions/logger");
var params_1 = require("firebase-functions/params");
var crypto = require("crypto");
exports.WHATSAPP_PHONE_NUMBER_ID_SECRET = (0, params_1.defineSecret)('WHATSAPP_PHONE_NUMBER_ID');
exports.WHATSAPP_ACCESS_TOKEN_SECRET = (0, params_1.defineSecret)('WHATSAPP_ACCESS_TOKEN');
// Firebase Functions v2 CORS - explicitly list allowed origins
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
// WhatsApp API configuration
var WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
var WHATSAPP_TIMEOUT_MS = 30000; // 30 seconds
var MAX_RETRIES = 3;
var RETRY_DELAY_MS = 1000; // Initial delay with exponential backoff
// Helper to get secrets with environment variable fallback
var getWhatsAppPhoneNumberId = function () { return exports.WHATSAPP_PHONE_NUMBER_ID_SECRET.value() || process.env.WHATSAPP_PHONE_NUMBER_ID; };
var getWhatsAppAccessToken = function () { return exports.WHATSAPP_ACCESS_TOKEN_SECRET.value() || process.env.WHATSAPP_ACCESS_TOKEN; };
/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
/**
 * Retry wrapper with exponential backoff for WhatsApp API calls
 */
function fetchWithRetry(url_1, options_1) {
    return __awaiter(this, arguments, void 0, function (url, options, retryCount) {
        var controller, timeoutId, response, delay, error_1, delay;
        var _a, _b;
        if (retryCount === void 0) { retryCount = 0; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    controller = new AbortController();
                    timeoutId = setTimeout(function () { return controller.abort(); }, WHATSAPP_TIMEOUT_MS);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, , 8]);
                    return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { signal: controller.signal }))];
                case 2:
                    response = _c.sent();
                    clearTimeout(timeoutId);
                    if (!(!response.ok && retryCount < MAX_RETRIES && (response.status >= 500 || response.status === 429))) return [3 /*break*/, 4];
                    delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                    logger.warn("WhatsApp API error ".concat(response.status, ", retrying in ").concat(delay, "ms (attempt ").concat(retryCount + 1, "/").concat(MAX_RETRIES, ")"));
                    return [4 /*yield*/, sleep(delay)];
                case 3:
                    _c.sent();
                    return [2 /*return*/, fetchWithRetry(url, options, retryCount + 1)];
                case 4: return [2 /*return*/, response];
                case 5:
                    error_1 = _c.sent();
                    clearTimeout(timeoutId);
                    if (!(retryCount < MAX_RETRIES && (error_1.name === 'AbortError' || ((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('fetch')) || ((_b = error_1.message) === null || _b === void 0 ? void 0 : _b.includes('network'))))) return [3 /*break*/, 7];
                    delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                    logger.warn("WhatsApp API network error, retrying in ".concat(delay, "ms (attempt ").concat(retryCount + 1, "/").concat(MAX_RETRIES, "):"), error_1.message);
                    return [4 /*yield*/, sleep(delay)];
                case 6:
                    _c.sent();
                    return [2 /*return*/, fetchWithRetry(url, options, retryCount + 1)];
                case 7: throw error_1;
                case 8: return [2 /*return*/];
            }
        });
    });
}
var init_1 = require("../init");
var auth_1 = require("../middleware/auth");
/**
 * Templates de WhatsApp aprovados
 * Para adicionar novos templates: https://business.facebook.com/wa/manage/phone-numbers/
 */
var WhatsAppTemplate;
(function (WhatsAppTemplate) {
    WhatsAppTemplate["APPOINTMENT_CONFIRMATION"] = "appointment_confirmation";
    WhatsAppTemplate["APPOINTMENT_REMINDER"] = "appointment_reminder";
    WhatsAppTemplate["APPOINTMENT_REMINDER_24H"] = "appointment_reminder_24h";
    WhatsAppTemplate["WELCOME"] = "welcome_message";
    WhatsAppTemplate["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    WhatsAppTemplate["PRECADASTRO_CONFIRMATION"] = "precadastro_confirmation";
    WhatsAppTemplate["BIRTHDAY_GREETING"] = "birthday_greeting";
    WhatsAppTemplate["PATIENT_REACTIVATION"] = "patient_reactivation";
    WhatsAppTemplate["PAYMENT_CONFIRMATION"] = "payment_confirmation";
    WhatsAppTemplate["EXERCISE_ASSIGNED"] = "exercise_assigned";
})(WhatsAppTemplate || (exports.WhatsAppTemplate = WhatsAppTemplate = {}));
/**
 * Cloud Function: Enviar confirmação de agendamento via WhatsApp
 */
exports.sendWhatsAppAppointmentConfirmation = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, appointmentId, patientDoc, patient, appointmentDoc, appointment, date, formattedDate, whatsappPhone, result;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
                }
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                if (!(patient === null || patient === void 0 ? void 0 : patient.phone)) {
                    throw new https_1.HttpsError('failed-precondition', 'Paciente não tem telefone cadastrado');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .doc(appointmentId)
                        .get()];
            case 2:
                appointmentDoc = _b.sent();
                if (!appointmentDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                appointment = appointmentDoc.data();
                date = new Date(appointment === null || appointment === void 0 ? void 0 : appointment.date);
                formattedDate = date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                });
                whatsappPhone = formatPhoneForWhatsApp(patient === null || patient === void 0 ? void 0 : patient.phone);
                return [4 /*yield*/, sendWhatsAppTemplateMessage({
                        to: whatsappPhone,
                        template: WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
                        language: 'pt_BR',
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name) },
                                    { type: 'text', text: formattedDate },
                                    { type: 'text', text: appointment === null || appointment === void 0 ? void 0 : appointment.startTime },
                                ],
                            },
                        ],
                    })];
            case 3:
                result = _b.sent();
                // Log message to DB
                return [4 /*yield*/, logWhatsAppMessage({
                        organization_id: (patient.organization_id || (appointment && appointment.organization_id)),
                        patient_id: patientId,
                        from_phone: getWhatsAppPhoneNumberId(),
                        to_phone: whatsappPhone,
                        message: "Confirma\u00E7\u00E3o de agendamento: ".concat(formattedDate, " \u00E0s ").concat(appointment === null || appointment === void 0 ? void 0 : appointment.startTime),
                        type: 'template',
                        template_name: WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
                        message_id: result.messages[0].id,
                        status: 'sent',
                    })];
            case 4:
                // Log message to DB
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar lembrete de agendamento (24h antes)
 */
exports.sendWhatsAppAppointmentReminder = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, appointmentId, patientDoc, patient, appointmentDoc, appointment, date, formattedDate, whatsappPhone;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                if (!(patient === null || patient === void 0 ? void 0 : patient.phone)) {
                    logger.info("Patient ".concat(patientId, " has no phone, skipping WhatsApp reminder"));
                    return [2 /*return*/, { skipped: true, reason: 'no_phone' }];
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .doc(appointmentId)
                        .get()];
            case 2:
                appointmentDoc = _b.sent();
                if (!appointmentDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                appointment = appointmentDoc.data();
                date = new Date(appointment === null || appointment === void 0 ? void 0 : appointment.date);
                formattedDate = date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                });
                whatsappPhone = formatPhoneForWhatsApp(patient === null || patient === void 0 ? void 0 : patient.phone);
                return [4 /*yield*/, sendWhatsAppTemplateMessage({
                        to: whatsappPhone,
                        template: WhatsAppTemplate.APPOINTMENT_REMINDER,
                        language: 'pt_BR',
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name) },
                                    { type: 'text', text: formattedDate },
                                    { type: 'text', text: appointment === null || appointment === void 0 ? void 0 : appointment.startTime },
                                ],
                            },
                        ],
                    })];
            case 3:
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar mensagem de boas-vindas
 */
exports.sendWhatsAppWelcome = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, userDoc, user, whatsappPhone;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = request.data.userId;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(userId)
                        .get()];
            case 1:
                userDoc = _a.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                user = userDoc.data();
                if (!(user === null || user === void 0 ? void 0 : user.phoneNumber)) {
                    return [2 /*return*/, { skipped: true, reason: 'no_phone' }];
                }
                whatsappPhone = formatPhoneForWhatsApp(user === null || user === void 0 ? void 0 : user.phoneNumber);
                return [4 /*yield*/, sendWhatsAppTemplateMessage({
                        to: whatsappPhone,
                        template: WhatsAppTemplate.WELCOME,
                        language: 'pt_BR',
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: (user === null || user === void 0 ? void 0 : user.displayName) || (user === null || user === void 0 ? void 0 : user.fullName) },
                                ],
                            },
                        ],
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar mensagem personalizada
 */
exports.sendWhatsAppCustomMessage = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, to, message, userDoc, role, whatsappPhone, result, adminProfile, organizationId;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
                }
                _a = request.data, to = _a.to, message = _a.message;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _d.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                role = (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
                if (!['admin', 'fisioterapeuta', 'estagiario'].includes(role)) {
                    throw new https_1.HttpsError('permission-denied', 'Sem permissão para enviar mensagens');
                }
                whatsappPhone = formatPhoneForWhatsApp(to);
                return [4 /*yield*/, sendWhatsAppTextMessage({
                        to: whatsappPhone,
                        message: message,
                    })];
            case 2:
                result = _d.sent();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)().collection('profiles').doc(request.auth.uid).get()];
            case 3:
                adminProfile = _d.sent();
                organizationId = (_c = adminProfile.data()) === null || _c === void 0 ? void 0 : _c.organization_id;
                // Log message to DB
                return [4 /*yield*/, logWhatsAppMessage({
                        organization_id: organizationId,
                        from_phone: getWhatsAppPhoneNumberId(),
                        to_phone: whatsappPhone,
                        message: message,
                        type: 'text',
                        message_id: result.messages[0].id,
                        status: 'sent',
                    })];
            case 4:
                // Log message to DB
                _d.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar notificação de exercício atribuído
 */
exports.sendWhatsAppExerciseAssigned = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, planName, exercisesCount, patientDoc, patient, whatsappPhone;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, patientId = _a.patientId, planName = _a.planName, exercisesCount = _a.exercisesCount;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _b.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                if (!(patient === null || patient === void 0 ? void 0 : patient.phone)) {
                    return [2 /*return*/, { skipped: true, reason: 'no_phone' }];
                }
                whatsappPhone = formatPhoneForWhatsApp(patient === null || patient === void 0 ? void 0 : patient.phone);
                return [4 /*yield*/, sendWhatsAppTemplateMessage({
                        to: whatsappPhone,
                        template: WhatsAppTemplate.EXERCISE_ASSIGNED,
                        language: 'pt_BR',
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    { type: 'text', text: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name) },
                                    { type: 'text', text: planName },
                                    { type: 'text', text: String(exercisesCount) },
                                ],
                            },
                        ],
                    })];
            case 2:
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Envia mensagem template do WhatsApp
 */
function sendWhatsAppTemplateMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, payload, response, error, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(WHATSAPP_API_URL, "/").concat(getWhatsAppPhoneNumberId(), "/messages");
                    payload = {
                        messaging_product: 'whatsapp',
                        to: params.to,
                        type: 'template',
                        template: {
                            name: params.template,
                            language: { code: params.language },
                            components: params.components || [],
                        },
                    };
                    return [4 /*yield*/, fetchWithRetry(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(getWhatsAppAccessToken()),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    logger.error("WhatsApp API error: ".concat(error));
                    throw new Error("WhatsApp API error: ".concat(error));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    result = _a.sent();
                    logger.info("WhatsApp template sent: ".concat(result.messages[0].id));
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Envia mensagem de texto personalizada do WhatsApp
 */
function sendWhatsAppTextMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, payload, response, error, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(WHATSAPP_API_URL, "/").concat(getWhatsAppPhoneNumberId(), "/messages");
                    payload = {
                        messaging_product: 'whatsapp',
                        to: params.to,
                        type: 'text',
                        text: {
                            body: params.message,
                        },
                    };
                    return [4 /*yield*/, fetchWithRetry(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(getWhatsAppAccessToken()),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    logger.error("WhatsApp API error: ".concat(error));
                    throw new Error("WhatsApp API error: ".concat(error));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    result = _a.sent();
                    logger.info("WhatsApp text sent: ".concat(result.messages[0].id));
                    return [2 /*return*/, result];
            }
        });
    });
}
function sendWhatsAppTemplateMessageInternal(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendWhatsAppTemplateMessage(params)];
        });
    });
}
function sendWhatsAppTextMessageInternal(params) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendWhatsAppTextMessage(params)];
        });
    });
}
/**
 * Formata número de telefone para o formato do WhatsApp
 * Converte various formats para: 55DDDDDDDDD
 */
function formatPhoneForWhatsApp(phone) {
    // Remover todos os caracteres não numéricos
    var cleaned = phone.replace(/\D/g, '');
    // Se começar com 0 (DDDD), remover
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    // Se não tiver código do país (55), adicionar
    if (cleaned.length === 10 || cleaned.length === 11) {
        cleaned = '55' + cleaned;
    }
    // Remover dígito 9 extra se tiver (para número padrão)
    if (cleaned.length === 13 && cleaned.startsWith('551')) {
        cleaned = cleaned.substring(0, 12) + cleaned.substring(13);
    }
    return cleaned;
}
/**
 * Verifica se um número de telefone está válido
 */
function isValidWhatsAppPhone(phone) {
    var formatted = formatPhoneForWhatsApp(phone);
    // Deve ter código do país (55) + DDD (2 dígitos) + número (8-9 dígitos)
    return /^55\d{10,11}$/.test(formatted);
}
/**
 * Verify WhatsApp webhook signature using X-Hub-Signature-256
 */
function verifyWhatsAppSignature(payload, signature, appSecret) {
    if (!signature) {
        return false;
    }
    // WhatsApp uses SHA-256: signature format is "sha256=<hex>"
    var signatureParts = signature.split('=');
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
        logger.error('[WhatsApp] Invalid signature format');
        return false;
    }
    var expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(payload, 'utf8')
        .digest('hex');
    // Secure comparison
    var providedSignature = signatureParts[1];
    if (expectedSignature.length !== providedSignature.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'utf8'), Buffer.from(providedSignature, 'utf8'));
}
/**
 * HTTP Endpoint para webhook do WhatsApp (opcional)
 * Usado para receber mensagens e status updates dos usuários
 */
exports.whatsappWebhookHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    secrets: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET'],
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var mode, challenge, verifyToken, signature, appSecret, rawBody, body, _i, _a, entry, _b, _c, change, changeValue, message, statuses, error_2;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                mode = request.query['hub.mode'];
                challenge = request.query['hub.challenge'];
                verifyToken = request.query['hub.verify_token'];
                if (mode && verifyToken) {
                    if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
                        logger.info('WhatsApp webhook verified');
                        return [2 /*return*/, response.status(200).send(challenge)];
                    }
                    return [2 /*return*/, response.status(403).send('Forbidden')];
                }
                signature = request.headers['x-hub-signature-256'];
                appSecret = exports.WHATSAPP_ACCESS_TOKEN_SECRET.value() || process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN;
                rawBody = ((_d = request.rawBody) === null || _d === void 0 ? void 0 : _d.toString()) || JSON.stringify(request.body);
                if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
                    logger.error('[WhatsApp] Invalid webhook signature');
                    return [2 /*return*/, response.status(403).send('Invalid signature')];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 11, , 12]);
                body = request.body;
                if (!(body.object === 'whatsapp_business_account')) return [3 /*break*/, 10];
                _i = 0, _a = body.entry;
                _e.label = 2;
            case 2:
                if (!(_i < _a.length)) return [3 /*break*/, 10];
                entry = _a[_i];
                _b = 0, _c = entry.changes;
                _e.label = 3;
            case 3:
                if (!(_b < _c.length)) return [3 /*break*/, 9];
                change = _c[_b];
                if (!(change.field === 'messages')) return [3 /*break*/, 6];
                changeValue = change.value;
                if (!(changeValue.messages && changeValue.messages.length > 0)) return [3 /*break*/, 5];
                message = changeValue.messages[0];
                // Processar mensagem recebida
                return [4 /*yield*/, handleIncomingWhatsAppMessage(message)];
            case 4:
                // Processar mensagem recebida
                _e.sent();
                _e.label = 5;
            case 5: return [3 /*break*/, 8];
            case 6:
                if (!(change.field === 'messaging_statuses')) return [3 /*break*/, 8];
                statuses = change.value.statuses;
                if (!(statuses && statuses.length > 0)) return [3 /*break*/, 8];
                return [4 /*yield*/, handleWhatsAppMessageStatus(statuses[0])];
            case 7:
                _e.sent();
                _e.label = 8;
            case 8:
                _b++;
                return [3 /*break*/, 3];
            case 9:
                _i++;
                return [3 /*break*/, 2];
            case 10: return [2 /*return*/, response.status(200).json({ received: true })];
            case 11:
                error_2 = _e.sent();
                logger.error('WhatsApp webhook error:', error_2);
                return [2 /*return*/, response.status(500).json({ error: 'Erro ao processar webhook' })];
            case 12: return [2 /*return*/];
        }
    });
}); });
/**
 * Processa mensagem recebida do WhatsApp
 */
function handleIncomingWhatsAppMessage(message) {
    return __awaiter(this, void 0, void 0, function () {
        var from, messageId, timestamp, type, phone, patientsSnapshot, maskedPhone, patient, text, pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('Received WhatsApp message:', message);
                    from = message.from;
                    messageId = message.id;
                    timestamp = message.timestamp;
                    type = message.type;
                    phone = from.replace(/\D/g, '').replace(/^55/, '');
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('patients')
                            .where('phone', '==', phone)
                            .get()];
                case 1:
                    patientsSnapshot = _a.sent();
                    if (patientsSnapshot.empty) {
                        maskedPhone = phone.length > 4 ? '...' + phone.substring(phone.length - 4) : '***';
                        logger.info("No patient found for phone: ".concat(maskedPhone));
                        return [2 /*return*/];
                    }
                    patient = patientsSnapshot.docs[0].data();
                    if (!(type === 'text')) return [3 /*break*/, 5];
                    text = message.text.body;
                    // Salvar mensagem recebida no Firestore (maintining legacy)
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('whatsapp_messages')
                            .add({
                            from: from,
                            to: getWhatsAppPhoneNumberId(),
                            messageId: messageId,
                            type: 'text',
                            text: text,
                            timestamp: new Date(parseInt(timestamp) * 1000),
                            patientId: patientsSnapshot.docs[0].id,
                            read: false,
                            createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 2:
                    // Salvar mensagem recebida no Firestore (maintining legacy)
                    _a.sent();
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("INSERT INTO whatsapp_messages (\n        organization_id, patient_id, from_phone, to_phone, message, type, message_id, status, created_at\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
                            patient.organization_id,
                            patientsSnapshot.docs[0].id,
                            from,
                            getWhatsAppPhoneNumberId(),
                            text,
                            'text',
                            messageId,
                            'received',
                            new Date(parseInt(timestamp) * 1000)
                        ])];
                case 3:
                    _a.sent();
                    // Responder automaticamente se necessário
                    return [4 /*yield*/, handleAutoReply(from, text, patient)];
                case 4:
                    // Responder automaticamente se necessário
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Processa atualização de status de mensagem
 */
function handleWhatsAppMessageStatus(status) {
    return __awaiter(this, void 0, void 0, function () {
        var id, messageStatus, messagesSnapshot, pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('WhatsApp message status update:', status);
                    id = status.id, messageStatus = status.status;
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('whatsapp_messages')
                            .where('messageId', '==', id)
                            .get()];
                case 1:
                    messagesSnapshot = _a.sent();
                    if (!!messagesSnapshot.empty) return [3 /*break*/, 3];
                    return [4 /*yield*/, messagesSnapshot.docs[0].ref.update({
                            status: messageStatus,
                            statusUpdatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('UPDATE whatsapp_messages SET status = $1, metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{status_history}\', COALESCE(metadata->\'status_history\', \'[]\'::jsonb) || $2::jsonb) WHERE message_id = $3', [
                            messageStatus,
                            JSON.stringify([{ status: messageStatus, timestamp: new Date().toISOString() }]),
                            id
                        ])];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Resposta automática a mensagens recebidas
 */
function handleAutoReply(from, text, patient) {
    return __awaiter(this, void 0, void 0, function () {
        var lowerText, replyMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lowerText = text.toLowerCase();
                    replyMessage = '';
                    if (lowerText.includes('agendar') || lowerText.includes('horário')) {
                        replyMessage = "Ol\u00E1 ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || 'Paciente', "! Para agendar uma sess\u00E3o, voc\u00EA pode:\n\n1. Acessar: ").concat(process.env.PUBLIC_URL, "/agenda\n2. Ou responder esta mensagem com a data desejada.");
                    }
                    else if (lowerText.includes('cancelar')) {
                        replyMessage = 'Para cancelar ou remarcar um agendamento, por favor entre em contato pelo telefone ou acesse o site.';
                    }
                    else if (lowerText.includes('exercício') || lowerText.includes('exercicio')) {
                        replyMessage = "Seus exerc\u00EDcios est\u00E3o dispon\u00EDveis em: ".concat(process.env.PUBLIC_URL, "/exercises");
                    }
                    else {
                        replyMessage = "Obrigado pela mensagem, ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || 'Paciente', "! Em breve retornaremos o contato.");
                    }
                    if (!replyMessage) return [3 /*break*/, 2];
                    return [4 /*yield*/, sendWhatsAppTextMessage({
                            to: from,
                            message: replyMessage,
                        })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
// ============================================================================================
// TEST FUNCTIONS
// ============================================================================================
/**
 * Cloud Function: Testar envio de mensagem WhatsApp
 * Útil para verificar se as credenciais estão configuradas corretamente
 */
exports.testWhatsAppMessage = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, phone, _b, template, _c, name, targetPhone, userDoc, user, whatsappPhone;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth && request.data.secret !== 'FISIOFLOW_TEST_SECRET') {
                    throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
                }
                _a = request.data, phone = _a.phone, _b = _a.template, template = _b === void 0 ? WhatsAppTemplate.WELCOME : _b, _c = _a.name, name = _c === void 0 ? 'Teste' : _c;
                targetPhone = phone;
                if (!!targetPhone) return [3 /*break*/, 2];
                if (!request.auth) {
                    throw new https_1.HttpsError('failed-precondition', 'Telefone não fornecido e usuário não autenticado');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _d.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                user = userDoc.data();
                if (!(user === null || user === void 0 ? void 0 : user.phoneNumber)) {
                    throw new https_1.HttpsError('failed-precondition', 'Usuário não tem telefone cadastrado. Forneça um telefone no parâmetro "phone"');
                }
                targetPhone = user.phoneNumber;
                _d.label = 2;
            case 2:
                if (!targetPhone) {
                    throw new https_1.HttpsError('failed-precondition', 'Telefone não fornecido');
                }
                whatsappPhone = formatPhoneForWhatsApp(targetPhone);
                // Enviar mensagem de teste
                return [4 /*yield*/, sendWhatsAppTextMessage({
                        to: whatsappPhone,
                        message: "\uD83E\uDDEA Teste FisioFlow WhatsApp\n\nOl\u00E1 ".concat(name, "!\n\nEsta \u00E9 uma mensagem de teste do FisioFlow. Se voc\u00EA recebeu esta mensagem, a integra\u00E7\u00E3o est\u00E1 funcionando corretamente! \uD83C\uDF89\n\nData: ").concat(new Date().toLocaleString('pt-BR')),
                    })];
            case 3:
                // Enviar mensagem de teste
                _d.sent();
                logger.info("Test message sent to ".concat(whatsappPhone));
                return [2 /*return*/, {
                        success: true,
                        phone: whatsappPhone,
                        template: template,
                        message: 'Mensagem de teste enviada com sucesso!',
                    }];
        }
    });
}); });
/**
 * Cloud Function: Testar template do WhatsApp
 * Envia um template específico para verificar se foi aprovado
 */
exports.testWhatsAppTemplate = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, phone, _b, template, params, targetPhone, userDoc, user, whatsappPhone, defaultParams, components;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
                }
                _a = request.data, phone = _a.phone, _b = _a.template, template = _b === void 0 ? WhatsAppTemplate.APPOINTMENT_CONFIRMATION : _b, params = _a.params;
                targetPhone = phone;
                if (!!targetPhone) return [3 /*break*/, 2];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(request.auth.uid)
                        .get()];
            case 1:
                userDoc = _c.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                user = userDoc.data();
                if (!(user === null || user === void 0 ? void 0 : user.phoneNumber)) {
                    throw new https_1.HttpsError('failed-precondition', 'Usuário não tem telefone cadastrado. Forneça um telefone no parâmetro "phone"');
                }
                targetPhone = user.phoneNumber;
                _c.label = 2;
            case 2:
                if (!targetPhone) {
                    throw new https_1.HttpsError('failed-precondition', 'Telefone não fornecido');
                }
                whatsappPhone = formatPhoneForWhatsApp(targetPhone);
                defaultParams = {
                    patientName: (params === null || params === void 0 ? void 0 : params.patientName) || 'Paciente Teste',
                    date: (params === null || params === void 0 ? void 0 : params.date) || new Date().toLocaleDateString('pt-BR'),
                    time: (params === null || params === void 0 ? void 0 : params.time) || '14:00',
                    professional: (params === null || params === void 0 ? void 0 : params.professional) || 'Dr. Teste',
                    address: (params === null || params === void 0 ? void 0 : params.address) || 'Rua Teste, 123',
                };
                components = [];
                switch (template) {
                    case WhatsAppTemplate.APPOINTMENT_CONFIRMATION:
                        components.push({
                            type: 'body',
                            parameters: [
                                { type: 'text', text: defaultParams.patientName },
                                { type: 'text', text: defaultParams.date },
                                { type: 'text', text: defaultParams.time },
                                { type: 'text', text: defaultParams.professional },
                                { type: 'text', text: defaultParams.address },
                            ],
                        });
                        break;
                    case WhatsAppTemplate.APPOINTMENT_REMINDER:
                        components.push({
                            type: 'body',
                            parameters: [
                                { type: 'text', text: defaultParams.patientName },
                                { type: 'text', text: defaultParams.time },
                                { type: 'text', text: defaultParams.professional },
                            ],
                        });
                        break;
                    case WhatsAppTemplate.WELCOME:
                        components.push({
                            type: 'body',
                            parameters: [
                                { type: 'text', text: defaultParams.patientName },
                            ],
                        });
                        break;
                    default:
                        throw new https_1.HttpsError('invalid-argument', "Template n\u00E3o suportado: ".concat(template));
                }
                // Enviar template
                return [4 /*yield*/, sendWhatsAppTemplateMessage({
                        to: whatsappPhone,
                        template: template,
                        language: 'pt_BR',
                        components: components,
                    })];
            case 3:
                // Enviar template
                _c.sent();
                logger.info("Test template \"".concat(template, "\" sent to ").concat(whatsappPhone));
                return [2 /*return*/, {
                        success: true,
                        phone: whatsappPhone,
                        template: template,
                        message: "Template \"".concat(template, "\" enviado com sucesso!"),
                    }];
        }
    });
}); });
/**
 * Cloud Function: Buscar histórico de mensagens do WhatsApp
 */
exports.getWhatsAppHistory = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, _b, limit, _c, offset, auth, pool, result, error_3;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
                }
                _a = request.data, patientId = _a.patientId, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _d.sent();
                pool = (0, init_1.getPool)();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT * FROM whatsapp_messages \n       WHERE organization_id = $1 AND patient_id = $2\n       ORDER BY created_at DESC \n       LIMIT $3 OFFSET $4", [auth.organizationId, patientId, limit, offset])];
            case 3:
                result = _d.sent();
                return [2 /*return*/, {
                        data: result.rows,
                        total: result.rowCount
                    }];
            case 4:
                error_3 = _d.sent();
                logger.error('Error fetching WhatsApp history:', error_3);
                throw new https_1.HttpsError('internal', 'Erro ao buscar histórico de mensagens');
            case 5: return [2 /*return*/];
        }
    });
}); });
// ============================================================================================
// DATABASE HELPERS
// ============================================================================================
/**
 * Registra uma mensagem no banco de dados
 */
function logWhatsAppMessage(params) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("INSERT INTO whatsapp_messages (\n        organization_id, patient_id, from_phone, to_phone, message, type, template_name, message_id, status\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
                            params.organization_id,
                            params.patient_id || null,
                            params.from_phone,
                            params.to_phone,
                            params.message,
                            params.type,
                            params.template_name || null,
                            params.message_id,
                            params.status
                        ])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    logger.error('Error logging WhatsApp message:', error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
