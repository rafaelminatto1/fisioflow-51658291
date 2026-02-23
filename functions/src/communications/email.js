"use strict";
/**
 * Email Service Integration
 *
 * Integração com SendGrid/Resend para envio de emails transacionais
 *
 * @module communications/email
 */
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
exports.sendExercisePlanEmail = exports.sendPaymentConfirmation = exports.sendWelcomeEmail = exports.sendAppointmentReminder = exports.sendAppointmentConfirmation = exports.EmailTemplate = void 0;
// Configuração do provedor de email
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var logger = require("firebase-functions/logger");
var EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'sendgrid' ou 'resend'
var RESEND_API_KEY = process.env.RESEND_API_KEY;
var SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
var FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fisioflow.app';
var FROM_NAME = process.env.FROM_NAME || 'FisioFlow';
/**
 * Templates de email disponíveis
 */
var EmailTemplate;
(function (EmailTemplate) {
    EmailTemplate["APPOINTMENT_CONFIRMATION"] = "appointment_confirmation";
    EmailTemplate["APPOINTMENT_REMINDER"] = "appointment_reminder";
    EmailTemplate["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    EmailTemplate["APPOINTMENT_RESCHEDULED"] = "appointment_rescheduled";
    EmailTemplate["WELCOME"] = "welcome";
    EmailTemplate["PASSWORD_RESET"] = "password_reset";
    EmailTemplate["PAYMENT_CONFIRMATION"] = "payment_confirmation";
    EmailTemplate["VOUCHER_PURCHASED"] = "voucher_purchased";
    EmailTemplate["EVOLUTION_SHARED"] = "evolution_shared";
    EmailTemplate["EXERCISE_PLAN_ASSIGNED"] = "exercise_plan_assigned";
})(EmailTemplate || (exports.EmailTemplate = EmailTemplate = {}));
/**
 * Cloud Function: Enviar email de confirmação de agendamento
 */
exports.sendAppointmentConfirmation = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, appointmentId, patientDoc, patient, appointmentDoc, appointment, therapistDoc, therapist, date, formattedDate;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Verificar autenticação
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
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(appointment === null || appointment === void 0 ? void 0 : appointment.therapistId)
                        .get()];
            case 3:
                therapistDoc = _b.sent();
                therapist = therapistDoc.data();
                date = new Date(appointment === null || appointment === void 0 ? void 0 : appointment.date);
                formattedDate = date.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
                // Enviar email
                return [4 /*yield*/, sendEmail({
                        to: patient === null || patient === void 0 ? void 0 : patient.email,
                        templateId: EmailTemplate.APPOINTMENT_CONFIRMATION,
                        subject: 'Confirmação de Agendamento - FisioFlow',
                        data: {
                            patientName: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name),
                            therapistName: (therapist === null || therapist === void 0 ? void 0 : therapist.displayName) || 'Seu fisioterapeuta',
                            date: formattedDate,
                            time: appointment === null || appointment === void 0 ? void 0 : appointment.startTime,
                            type: appointment === null || appointment === void 0 ? void 0 : appointment.type,
                            clinicName: (therapist === null || therapist === void 0 ? void 0 : therapist.organizationName) || 'FisioFlow',
                            location: (therapist === null || therapist === void 0 ? void 0 : therapist.clinicAddress) || '',
                            calendarUrl: "".concat(process.env.PUBLIC_URL, "/calendar/").concat(appointmentId),
                        },
                    })];
            case 4:
                // Enviar email
                _b.sent();
                // Marcar lembrete como enviado
                return [4 /*yield*/, appointmentDoc.ref.update({
                        reminderSent: true,
                        reminderSentAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 5:
                // Marcar lembrete como enviado
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar lembrete de agendamento
 */
exports.sendAppointmentReminder = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, appointmentId, hoursBefore, patientDoc, patient, appointmentDoc, appointment, date, formattedDate;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId, hoursBefore = _a.hoursBefore;
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
                    day: 'numeric',
                    month: 'long',
                });
                return [4 /*yield*/, sendEmail({
                        to: patient === null || patient === void 0 ? void 0 : patient.email,
                        templateId: EmailTemplate.APPOINTMENT_REMINDER,
                        subject: 'Lembrete: Sua sessão de fisioterapia é amanhã! - FisioFlow',
                        data: {
                            patientName: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name),
                            date: formattedDate,
                            time: appointment === null || appointment === void 0 ? void 0 : appointment.startTime,
                            type: appointment === null || appointment === void 0 ? void 0 : appointment.type,
                            hoursBefore: hoursBefore || 24,
                        },
                    })];
            case 3:
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar email de boas-vindas
 */
exports.sendWelcomeEmail = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, userDoc, user;
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
                return [4 /*yield*/, sendEmail({
                        to: user === null || user === void 0 ? void 0 : user.email,
                        templateId: EmailTemplate.WELCOME,
                        subject: 'Bem-vindo ao FisioFlow! 🎉',
                        data: {
                            name: (user === null || user === void 0 ? void 0 : user.displayName) || (user === null || user === void 0 ? void 0 : user.fullName),
                            email: user === null || user === void 0 ? void 0 : user.email,
                            loginUrl: "".concat(process.env.PUBLIC_URL, "/auth"),
                            dashboardUrl: "".concat(process.env.PUBLIC_URL, "/dashboard"),
                        },
                    })];
            case 2:
                _a.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar confirmação de pagamento
 */
exports.sendPaymentConfirmation = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, voucherId, amount, userDoc, user, voucherDoc, voucher;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, userId = _a.userId, voucherId = _a.voucherId, amount = _a.amount;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(userId)
                        .get()];
            case 1:
                userDoc = _b.sent();
                user = userDoc.exists ? userDoc.data() : null;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_vouchers')
                        .doc(voucherId)
                        .get()];
            case 2:
                voucherDoc = _b.sent();
                voucher = voucherDoc.data();
                return [4 /*yield*/, sendEmail({
                        to: (user === null || user === void 0 ? void 0 : user.email) || (voucher === null || voucher === void 0 ? void 0 : voucher.patientEmail),
                        templateId: EmailTemplate.PAYMENT_CONFIRMATION,
                        subject: 'Pagamento Confirmado - FisioFlow',
                        data: {
                            name: (user === null || user === void 0 ? void 0 : user.displayName) || (voucher === null || voucher === void 0 ? void 0 : voucher.patientName),
                            voucherName: voucher === null || voucher === void 0 ? void 0 : voucher.name,
                            amount: (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            sessions: voucher === null || voucher === void 0 ? void 0 : voucher.sessionsTotal,
                            voucherUrl: "".concat(process.env.PUBLIC_URL, "/vouchers/").concat(voucherId),
                        },
                    })];
            case 3:
                _b.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
/**
 * Cloud Function: Enviar plano de exercícios
 */
exports.sendExercisePlanEmail = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientId, planId, patientDoc, patient, planDoc, plan;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, patientId = _a.patientId, planId = _a.planId;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 1:
                patientDoc = _c.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('exercise_plans')
                        .doc(planId)
                        .get()];
            case 2:
                planDoc = _c.sent();
                if (!planDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Plano não encontrado');
                }
                plan = planDoc.data();
                return [4 /*yield*/, sendEmail({
                        to: patient === null || patient === void 0 ? void 0 : patient.email,
                        templateId: EmailTemplate.EXERCISE_PLAN_ASSIGNED,
                        subject: 'Novo Plano de Exercícios Disponível - FisioFlow',
                        data: {
                            patientName: (patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name),
                            planName: plan === null || plan === void 0 ? void 0 : plan.name,
                            exercisesCount: ((_b = plan === null || plan === void 0 ? void 0 : plan.exercises) === null || _b === void 0 ? void 0 : _b.length) || 0,
                            planUrl: "".concat(process.env.PUBLIC_URL, "/exercises/").concat(planId),
                        },
                    })];
            case 3:
                _c.sent();
                return [2 /*return*/, { success: true }];
        }
    });
}); });
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Envia email usando o provedor configurado
 */
function sendEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var to, templateId, subject, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    to = params.to, templateId = params.templateId, subject = params.subject, data = params.data;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    if (!(EMAIL_PROVIDER === 'resend')) return [3 /*break*/, 3];
                    return [4 /*yield*/, sendEmailViaResend({ to: to, subject: subject, templateId: templateId, data: data })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, sendEmailViaSendGrid({ to: to, subject: subject, templateId: templateId, data: data })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    logger.info("Email sent: ".concat(templateId, " to ").concat(to));
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    logger.error("Failed to send email: ".concat(error_1.message));
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Envia email via Resend
 */
function sendEmailViaResend(params) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': "Bearer ".concat(RESEND_API_KEY),
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: "".concat(FROM_NAME, " <").concat(FROM_EMAIL, ">"),
                            to: params.to,
                            subject: params.subject,
                            html: renderEmailTemplate(params.templateId, params.data),
                        }),
                    })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    throw new Error("Resend API error: ".concat(error));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Envia email via SendGrid
 */
function sendEmailViaSendGrid(params) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch('https://api.sendgrid.com/v3/mail/send', {
                        method: 'POST',
                        headers: {
                            'Authorization': "Bearer ".concat(SENDGRID_API_KEY),
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            personalizations: [
                                {
                                    to: [{ email: params.to }],
                                    subject: params.subject,
                                    dynamic_template_data: params.data,
                                },
                            ],
                            from: { email: FROM_EMAIL, name: FROM_NAME },
                            content: [{ type: 'text/html', value: renderEmailTemplate(params.templateId, params.data) }],
                            template_id: getSendGridTemplateId(params.templateId),
                        }),
                    })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    throw new Error("SendGrid API error: ".concat(error));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Renderiza template HTML de email
 */
function renderEmailTemplate(templateId, data) {
    var _a;
    var templates = (_a = {},
        _a[EmailTemplate.APPOINTMENT_CONFIRMATION] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Agendamento Confirmado \u2713</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Seu agendamento foi confirmado para:</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Data:</strong> {{date}}</p>\n          <p><strong>Hor\u00E1rio:</strong> {{time}}</p>\n          <p><strong>Tipo:</strong> {{type}}</p>\n          <p><strong>Com:</strong> {{therapistName}}</p>\n        </div>\n        <p>At\u00E9 breve!</p>\n      </div>\n    ",
        _a[EmailTemplate.APPOINTMENT_REMINDER] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #F59E0B;\">\u23F0 Lembrete de Agendamento</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Sua sess\u00E3o de fisioterapia \u00E9 em {{hoursBefore}} horas!</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Data:</strong> {{date}}</p>\n          <p><strong>Hor\u00E1rio:</strong> {{time}}</p>\n        </div>\n        <p>N\u00E3o se esque\u00E7a!</p>\n      </div>\n    ",
        _a[EmailTemplate.WELCOME] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h1 style=\"color: #10B981;\">Bem-vindo ao FisioFlow! \uD83C\uDF89</h1>\n        <p>Ol\u00E1 {{name}},</p>\n        <p>Estamos muito felizes em ter voc\u00EA conosco!</p>\n        <p>O FisioFlow \u00E9 a plataforma completa para gest\u00E3o de fisioterapia.</p>\n        <div style=\"text-align: center; margin: 30px 0;\">\n          <a href=\"{{dashboardUrl}}\" style=\"background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;\">Acessar Dashboard</a>\n        </div>\n      </div>\n    ",
        _a[EmailTemplate.PAYMENT_CONFIRMATION] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Pagamento Confirmado \u2713</h2>\n        <p>Ol\u00E1 {{name}},</p>\n        <p>Seu pagamento foi confirmado!</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Voucher:</strong> {{voucherName}}</p>\n          <p><strong>Valor:</strong> {{amount}}</p>\n          <p><strong>Sess\u00F5es:</strong> {{sessions}}</p>\n        </div>\n        <p>Agradecemos pela prefer\u00EAncia!</p>\n      </div>\n    ",
        _a[EmailTemplate.EXERCISE_PLAN_ASSIGNED] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Novo Plano de Exerc\u00EDcios \uD83D\uDCAA</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Seu fisioterapeuta atribuiu um novo plano de exerc\u00EDcios!</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Plano:</strong> {{planName}}</p>\n          <p><strong>Exerc\u00EDcios:</strong> {{exercisesCount}}</p>\n        </div>\n        <div style=\"text-align: center; margin: 30px 0;\">\n          <a href=\"{{planUrl}}\" style=\"background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;\">Ver Plano</a>\n        </div>\n      </div>\n    ",
        _a[EmailTemplate.APPOINTMENT_CANCELLED] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #EF4444;\">Agendamento Cancelado</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Seu agendamento foi cancelado.</p>\n        <p>Se voc\u00EA n\u00E3o solicitou isso, entre em contato conosco.</p>\n      </div>\n    ",
        _a[EmailTemplate.APPOINTMENT_RESCHEDULED] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Agendamento Remarcado \uD83D\uDCC5</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Seu agendamento foi remarcado para:</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Nova Data:</strong> {{newDate}}</p>\n          <p><strong>Novo Hor\u00E1rio:</strong> {{newTime}}</p>\n        </div>\n      </div>\n    ",
        _a[EmailTemplate.PASSWORD_RESET] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Redefinir Senha</h2>\n        <p>Ol\u00E1 {{name}},</p>\n        <p>Clique no link abaixo para redefinir sua senha:</p>\n        <div style=\"text-align: center; margin: 30px 0;\">\n          <a href=\"{{resetUrl}}\" style=\"background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;\">Redefinir Senha</a>\n        </div>\n        <p>Se voc\u00EA n\u00E3o solicitou isso, ignore este email.</p>\n      </div>\n    ",
        _a[EmailTemplate.VOUCHER_PURCHASED] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Voucher Adquirido! \uD83C\uDF9F\uFE0F</h2>\n        <p>Ol\u00E1 {{name}},</p>\n        <p>Seu voucher foi adquirido com sucesso!</p>\n        <div style=\"background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;\">\n          <p><strong>Voucher:</strong> {{voucherName}}</p>\n          <p><strong>C\u00F3digo:</strong> {{voucherCode}}</p>\n          <p><strong>Sess\u00F5es:</strong> {{sessions}}</p>\n        </div>\n      </div>\n    ",
        _a[EmailTemplate.EVOLUTION_SHARED] = "\n      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n        <h2 style=\"color: #10B981;\">Nova Evolu\u00E7\u00E3o Dispon\u00EDvel \uD83D\uDCCA</h2>\n        <p>Ol\u00E1 {{patientName}},</p>\n        <p>Seu fisioterapeuta compartilhou uma nova evolu\u00E7\u00E3o com voc\u00EA!</p>\n        <div style=\"text-align: center; margin: 30px 0;\">\n          <a href=\"{{evolutionUrl}}\" style=\"background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;\">Ver Evolu\u00E7\u00E3o</a>\n        </div>\n      </div>\n    ",
        _a);
    var html = templates[templateId] || '<p>Email</p>';
    // Substituir variáveis
    Object.keys(data).forEach(function (key) {
        html = html.replace(new RegExp("{{".concat(key, "}}"), 'g'), String(data[key]));
    });
    return html;
}
/**
 * Retorna o ID do template no SendGrid (se configurado)
 */
function getSendGridTemplateId(templateId) {
    var _a;
    var templateIds = (_a = {},
        _a[EmailTemplate.APPOINTMENT_CONFIRMATION] = 'd-xxxxx',
        _a[EmailTemplate.APPOINTMENT_REMINDER] = 'd-xxxxx',
        _a[EmailTemplate.APPOINTMENT_CANCELLED] = 'd-xxxxx',
        _a[EmailTemplate.APPOINTMENT_RESCHEDULED] = 'd-xxxxx',
        _a[EmailTemplate.WELCOME] = 'd-xxxxx',
        _a[EmailTemplate.PASSWORD_RESET] = 'd-xxxxx',
        _a[EmailTemplate.PAYMENT_CONFIRMATION] = 'd-xxxxx',
        _a[EmailTemplate.VOUCHER_PURCHASED] = 'd-xxxxx',
        _a[EmailTemplate.EVOLUTION_SHARED] = 'd-xxxxx',
        _a[EmailTemplate.EXERCISE_PLAN_ASSIGNED] = 'd-xxxxx',
        _a);
    return templateIds[templateId];
}
