"use strict";
/**
 * Resend Email Templates and Service
 *
 * Centralized email service using Resend for all transactional emails
 *
 * @module communications/resend-templates
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
exports.getBirthdayTemplate = exports.getVoucherExpiringTemplate = exports.getPaymentFailedTemplate = exports.getVoucherConfirmationTemplate = exports.getAppointmentReminderTemplate = exports.getAppointmentConfirmationTemplate = exports.getWeeklySummaryTemplate = exports.getDailyReportTemplate = void 0;
exports.sendEmail = sendEmail;
exports.sendDailyReportEmail = sendDailyReportEmail;
exports.sendWeeklySummaryEmail = sendWeeklySummaryEmail;
exports.sendAppointmentConfirmationEmail = sendAppointmentConfirmationEmail;
exports.sendAppointmentReminderEmail = sendAppointmentReminderEmail;
exports.sendVoucherConfirmationEmail = sendVoucherConfirmationEmail;
exports.sendPaymentFailedEmail = sendPaymentFailedEmail;
exports.sendVoucherExpiringEmail = sendVoucherExpiringEmail;
exports.sendBirthdayEmail = sendBirthdayEmail;
// Resend instance
var resend_1 = require("resend");
var init_1 = require("../init");
var logger = require("firebase-functions/logger");
var resendInstance = null;
var getResend = function () {
    if (!resendInstance) {
        var apiKey = init_1.RESEND_API_KEY_SECRET.value();
        if (!apiKey) {
            throw new Error('RESEND_API_KEY not configured in Secret Manager');
        }
        resendInstance = new resend_1.Resend(apiKey);
    }
    return resendInstance;
};
// Default from email
var FROM_EMAIL = 'FisioFlow <contato@moocafisio.com.br>';
// ============================================================================
// EMAIL TEMPLATES
// ============================================================================
/**
 * Template for daily report email
 */
var getDailyReportTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Relat\u00F3rio Di\u00E1rio - ".concat(data.organizationName, "</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .header h1 { margin: 0; font-size: 24px; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }\n    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }\n    .stat-value { font-size: 32px; font-weight: bold; color: #7c3aed; }\n    .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }\n    .section { margin: 30px 0; }\n    .section-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }\n    .status-list { list-style: none; padding: 0; }\n    .status-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }\n    .status-item:last-child { border-bottom: none; }\n    .status-label { color: #6b7280; }\n    .status-count { font-weight: 600; color: #1f2937; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n    .positive { color: #10b981; }\n    .warning { color: #f59e0b; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1>\uD83D\uDCCA Relat\u00F3rio Di\u00E1rio</h1>\n      <p style=\"margin: 5px 0 0 0; opacity: 0.9;\">").concat(data.organizationName, "</p>\n    </div>\n    <div class=\"content\">\n      <p style=\"text-align: center; color: #6b7280; margin-bottom: 20px;\">\n        <strong>Data:</strong> ").concat(formatDate(data.date), "\n      </p>\n\n      <div class=\"stats-grid\">\n        <div class=\"stat-card\">\n          <div class=\"stat-value\">").concat(data.totalSessions, "</div>\n          <div class=\"stat-label\">Sess\u00F5es Realizadas</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\">").concat(data.totalAppointments, "</div>\n          <div class=\"stat-label\">Agendamentos</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value positive\">").concat(data.completedSessions, "</div>\n          <div class=\"stat-label\">Finalizadas</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value warning\">").concat(data.draftSessions, "</div>\n          <div class=\"stat-label\">Em Rascunho</div>\n        </div>\n      </div>\n\n      <div class=\"section\">\n        <h3 class=\"section-title\">Status dos Agendamentos</h3>\n        <ul class=\"status-list\">\n          ").concat(Object.entries(data.appointmentsByStatus).map(function (_a) {
    var status = _a[0], count = _a[1];
    return "\n            <li class=\"status-item\">\n              <span class=\"status-label\">".concat(formatStatus(status), "</span>\n              <span class=\"status-count\">").concat(count, "</span>\n            </li>\n          ");
}).join(''), "\n        </ul>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.organizationName, ". Todos os direitos reservados.</p>\n        <p style=\"margin-top: 10px;\">\n          <a href=\"https://fisioflow-migration.web.app\" style=\"color: #7c3aed; text-decoration: none;\">Acessar FisioFlow</a>\n        </p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getDailyReportTemplate = getDailyReportTemplate;
/**
 * Template for weekly summary email
 */
var getWeeklySummaryTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Resumo Semanal - ".concat(data.organizationName, "</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .header h1 { margin: 0; font-size: 24px; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }\n    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }\n    .stat-value { font-size: 32px; font-weight: bold; color: #7c3aed; }\n    .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }\n    .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }\n    .highlight-box h3 { margin: 0 0 10px 0; color: #92400e; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1>\uD83D\uDCC8 Resumo Semanal</h1>\n      <p style=\"margin: 5px 0 0 0; opacity: 0.9;\">").concat(data.organizationName, "</p>\n    </div>\n    <div class=\"content\">\n      <p style=\"text-align: center; color: #6b7280; margin-bottom: 20px;\">\n        <strong>Semana:</strong> ").concat(formatDate(data.weekStart), " a ").concat(formatDate(data.weekEnd), "\n      </p>\n\n      <div class=\"highlight-box\">\n        <h3>\uD83C\uDFC6 Destaque da Semana</h3>\n        <p style=\"margin: 0; font-size: 18px; color: #92400e;\">\n          ").concat(data.completedSessions, " sess\u00F5es finalizadas\n        </p>\n      </div>\n\n      <div class=\"stats-grid\">\n        <div class=\"stat-card\">\n          <div class=\"stat-value\">").concat(data.totalSessions, "</div>\n          <div class=\"stat-label\">Sess\u00F5es Totais</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\">").concat(data.totalAppointments, "</div>\n          <div class=\"stat-label\">Agendamentos</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #10b981;\">").concat(data.completedAppointments, "</div>\n          <div class=\"stat-label\">Compareceram</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-value\" style=\"color: #ef4444;\">").concat(data.missedAppointments, "</div>\n          <div class=\"stat-label\">Faltaram</div>\n        </div>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.organizationName, ". Todos os direitos reservados.</p>\n        <p style=\"margin-top: 10px;\">\n          <a href=\"https://fisioflow-migration.web.app\" style=\"color: #7c3aed; text-decoration: none;\">Acessar FisioFlow</a>\n        </p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getWeeklySummaryTemplate = getWeeklySummaryTemplate;
/**
 * Template for appointment confirmation
 */
var getAppointmentConfirmationTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Agendamento Confirmado</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .appointment-card { background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #10b981; margin: 20px 0; }\n    .appointment-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }\n    .appointment-row:last-child { border-bottom: none; }\n    .label { color: #6b7280; font-weight: 500; }\n    .value { font-weight: 600; color: #1f2937; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0; font-size: 24px;\">\u2705 Agendamento Confirmado</h1>\n    </div>\n    <div class=\"content\">\n      <p style=\"font-size: 16px; color: #374151;\">Ol\u00E1, <strong>".concat(data.patientName, "</strong>!</p>\n      <p style=\"color: #6b7280;\">Seu agendamento foi confirmado com sucesso. Seguem os detalhes:</p>\n\n      <div class=\"appointment-card\">\n        <div class=\"appointment-row\">\n          <span class=\"label\">\uD83D\uDCC5 Data</span>\n          <span class=\"value\">").concat(formatDate(data.date), "</span>\n        </div>\n        <div class=\"appointment-row\">\n          <span class=\"label\">\u23F0 Hor\u00E1rio</span>\n          <span class=\"value\">").concat(data.time, "</span>\n        </div>\n        <div class=\"appointment-row\">\n          <span class=\"label\">\uD83D\uDC68\u200D\u2695\uFE0F Terapeuta</span>\n          <span class=\"value\">").concat(data.therapistName, "</span>\n        </div>\n        <div class=\"appointment-row\">\n          <span class=\"label\">\uD83C\uDFE5 Cl\u00EDnica</span>\n          <span class=\"value\">").concat(data.clinicName, "</span>\n        </div>\n        ").concat(data.clinicAddress ? "\n        <div class=\"appointment-row\">\n          <span class=\"label\">\uD83D\uDCCD Endere\u00E7o</span>\n          <span class=\"value\">".concat(data.clinicAddress, "</span>\n        </div>\n        ") : '', "\n      </div>\n\n      <p style=\"color: #6b7280; font-size: 14px;\">Por favor, chegue com 15 minutos de anteced\u00EAncia.</p>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.clinicName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getAppointmentConfirmationTemplate = getAppointmentConfirmationTemplate;
/**
 * Template for appointment reminder
 */
var getAppointmentReminderTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Lembrete de Agendamento</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .reminder-card { background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 20px 0; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0; font-size: 24px;\">\u23F0 Lembrete de Agendamento</h1>\n    </div>\n    <div class=\"content\">\n      <p style=\"font-size: 16px; color: #374151;\">Ol\u00E1, <strong>".concat(data.patientName, "</strong>!</p>\n      <p style=\"color: #6b7280;\">Voc\u00EA tem uma sess\u00E3o de fisioterapia agendada para <strong>amanh\u00E3</strong>:</p>\n\n      <div class=\"reminder-card\">\n        <p style=\"margin: 0 0 10px 0; color: #6b7280;\">\uD83D\uDCC5 <strong>Data:</strong> ").concat(formatDate(data.date), "</p>\n        <p style=\"margin: 10px 0; color: #6b7280;\">\u23F0 <strong>Hor\u00E1rio:</strong> ").concat(data.time, "</p>\n        <p style=\"margin: 10px 0; color: #6b7280;\">\uD83D\uDC68\u200D\u2695\uFE0F <strong>Com:</strong> ").concat(data.therapistName, "</p>\n        <p style=\"margin: 10px 0 0 0; color: #6b7280;\">\uD83C\uDFE5 <strong>Local:</strong> ").concat(data.clinicName, "</p>\n      </div>\n\n      <p style=\"color: #6b7280; font-size: 14px;\">N\u00E3o se esque\u00E7a! Caso precise remarcar, entre em contato conosco.</p>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.clinicName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getAppointmentReminderTemplate = getAppointmentReminderTemplate;
/**
 * Template for voucher purchase confirmation
 */
var getVoucherConfirmationTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Compra Confirmada - Voucher</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .voucher-card { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 20px 0; position: relative; overflow: hidden; }\n    .voucher-card::before { content: '\uD83C\uDF9F\uFE0F'; position: absolute; right: -10px; bottom: -20px; font-size: 100px; opacity: 0.1; }\n    .voucher-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #b45309; }\n    .voucher-row:last-child { border-bottom: none; }\n    .voucher-label { color: #92400e; font-weight: 500; }\n    .voucher-value { font-weight: 700; color: #78350f; }\n    .total-amount { font-size: 32px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0; font-size: 24px;\">\u2705 Compra Confirmada!</h1>\n      <p style=\"margin: 5px 0 0 0; opacity: 0.9;\">".concat(data.organizationName, "</p>\n    </div>\n    <div class=\"content\">\n      <p style=\"font-size: 16px; color: #374151;\">Ol\u00E1, <strong>").concat(data.customerName, "</strong>!</p>\n      <p style=\"color: #6b7280;\">Seu voucher foi adquirido com sucesso. Confira os detalhes:</p>\n\n      <div class=\"voucher-card\">\n        <h2 style=\"margin: 0 0 15px 0; color: #78350f; text-align: center;\">\uD83C\uDFAB ").concat(data.voucherName, "</h2>\n        <div class=\"voucher-row\">\n          <span class=\"voucher-label\">Sess\u00F5es</span>\n          <span class=\"voucher-value\">").concat(data.sessionsTotal === -1 ? 'Ilimitado' : data.sessionsTotal, "</span>\n        </div>\n        <div class=\"voucher-row\">\n          <span class=\"voucher-label\">Validade</span>\n          <span class=\"voucher-value\">").concat(formatDate(data.expirationDate), "</span>\n        </div>\n      </div>\n\n      <div class=\"total-amount\">\n        ").concat(data.amountPaid, "\n      </div>\n\n      <p style=\"text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;\">\n        Voc\u00EA j\u00E1 pode usar seu voucher para agendar sess\u00F5es!\n      </p>\n\n      <div style=\"text-align: center; margin-top: 20px;\">\n        <a href=\"https://fisioflow-migration.web.app\" style=\"display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;\">Agendar Sess\u00E3o</a>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.organizationName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getVoucherConfirmationTemplate = getVoucherConfirmationTemplate;
/**
 * Template for payment failed notification
 */
var getPaymentFailedTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Pagamento Falhou</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .alert-box { background: #fef2f2; border-left: 5px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0; font-size: 24px;\">\u26A0\uFE0F Pagamento N\u00E3o Processado</h1>\n    </div>\n    <div class=\"content\">\n      <p style=\"font-size: 16px; color: #374151;\">Ol\u00E1, <strong>".concat(data.customerName, "</strong>!</p>\n      <p style=\"color: #6b7280;\">Infelizmente, n\u00E3o foi poss\u00EDvel processar seu pagamento:</p>\n\n      <div class=\"alert-box\">\n        <p style=\"margin: 0 0 10px 0; color: #991b1b;\"><strong>Voucher:</strong> ").concat(data.voucherName, "</p>\n        <p style=\"margin: 10px 0; color: #991b1b;\"><strong>Valor:</strong> ").concat(data.amount, "</p>\n        ").concat(data.errorMessage ? "<p style=\"margin: 10px 0 0 0; color: #dc2626; font-size: 14px;\"><strong>Motivo:</strong> ".concat(data.errorMessage, "</p>") : '', "\n      </div>\n\n      <p style=\"color: #6b7280;\">Por favor, tente novamente ou entre em contato conosco para ajuda.</p>\n\n      <div style=\"text-align: center; margin-top: 20px;\">\n        <a href=\"https://fisioflow-migration.web.app/checkout\" style=\"display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;\">Tentar Novamente</a>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.organizationName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getPaymentFailedTemplate = getPaymentFailedTemplate;
/**
 * Template for voucher expiration reminder
 */
var getVoucherExpiringTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Seu Voucher Est\u00E1 Expirando</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .warning-box { background: #fef3c7; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }\n    .sessions-highlight { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1 style=\"margin: 0; font-size: 24px;\">\u26A0\uFE0F Seu Voucher Est\u00E1 Expirando</h1>\n    </div>\n    <div class=\"content\">\n      <p style=\"font-size: 16px; color: #374151;\">Ol\u00E1, <strong>".concat(data.customerName, "</strong>!</p>\n      <p style=\"color: #6b7280;\">Seu voucher vai expirar em <strong>").concat(data.daysUntilExpiration, " dias</strong>. Aproveite suas sess\u00F5es restantes!</p>\n\n      <div class=\"warning-box\">\n        <p style=\"margin: 0 0 15px 0; text-align: center; color: #92400e;\">").concat(data.voucherName, "</p>\n        <div class=\"sessions-highlight\">").concat(data.sessionsRemaining, "</div>\n        <p style=\"margin: 0; text-align: center; color: #92400e; font-size: 14px;\">sess\u00F5es restantes</p>\n      </div>\n\n      <div style=\"text-align: center; margin-top: 20px;\">\n        <p style=\"color: #6b7280; margin-bottom: 10px;\">Expira em: <strong>").concat(formatDate(data.expirationDate), "</strong></p>\n        <a href=\"https://fisioflow-migration.web.app\" style=\"display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;\">Agendar Agora</a>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.organizationName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getVoucherExpiringTemplate = getVoucherExpiringTemplate;
/**
 * Template for birthday greeting
 */
var getBirthdayTemplate = function (data) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Feliz Anivers\u00E1rio!</title>\n  <style>\n    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb923c 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }\n    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }\n    .birthday-emoji { font-size: 80px; margin-bottom: 10px; }\n    .message { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px dashed #f472b6; }\n    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <div class=\"birthday-emoji\">\uD83C\uDF82</div>\n      <h1 style=\"margin: 0; font-size: 32px;\">Feliz Anivers\u00E1rio!</h1>\n      <p style=\"margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;\">".concat(data.patientName, "</p>\n    </div>\n    <div class=\"content\">\n      <div class=\"message\">\n        <p style=\"font-size: 18px; color: #374151; margin: 0 0 15px 0;\">\n          Que este novo ciclo traga muita sa\u00FAde, paz e realiza\u00E7\u00E3o! \uD83C\uDF1F\n        </p>\n        <p style=\"color: #6b7280; margin: 0;\">\n          \u00C9 um privilegio poder fazer parte da sua jornada de recupera\u00E7\u00E3o e bem-estar.\n        </p>\n        <p style=\"margin: 15px 0 0 0; color: #924331; font-weight: 500;\">\n          Com carinho,<br><strong>").concat(data.therapistName, "</strong><br>\n          <span style=\"font-size: 14px; color: #6b7280;\">").concat(data.clinicName, "</span>\n        </p>\n      </div>\n\n      <div class=\"footer\">\n        <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(data.clinicName, ". Todos os direitos reservados.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n"); };
exports.getBirthdayTemplate = getBirthdayTemplate;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Format date to Brazilian Portuguese format
 */
function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
/**
 * Format appointment status for display
 */
function formatStatus(status) {
    var statusMap = {
        'agendado': 'Agendados',
        'concluido': 'Concluídos',
        'cancelado': 'Cancelados',
        'faltou': 'Faltas',
        'pendente': 'Pendentes',
        'confirmed': 'Confirmados',
        'completed': 'Concluídos',
        'cancelled': 'Cancelados',
    };
    return statusMap[status] || status;
}
/**
 * Send email using Resend
 */
function sendEmail(options) {
    return __awaiter(this, void 0, void 0, function () {
        var resend, result, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    resend = getResend();
                    return [4 /*yield*/, resend.emails.send({
                            from: options.from || FROM_EMAIL,
                            to: Array.isArray(options.to) ? options.to : [options.to],
                            subject: options.subject,
                            html: options.html,
                        })];
                case 1:
                    result = _c.sent();
                    if (result.error) {
                        logger.error('[Resend] Error sending email:', result.error);
                        return [2 /*return*/, { success: false, error: result.error.message }];
                    }
                    logger.info('[Resend] Email sent successfully:', { id: (_a = result.data) === null || _a === void 0 ? void 0 : _a.id, to: options.to });
                    return [2 /*return*/, { success: true, id: (_b = result.data) === null || _b === void 0 ? void 0 : _b.id }];
                case 2:
                    error_1 = _c.sent();
                    logger.error('[Resend] Exception sending email:', error_1);
                    return [2 /*return*/, { success: false, error: error_1.message }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Send daily report email
 */
function sendDailyReportEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: "\uD83D\uDCCA Relat\u00F3rio Di\u00E1rio - ".concat(data.organizationName, " (").concat(data.date, ")"),
                    html: (0, exports.getDailyReportTemplate)(data),
                })];
        });
    });
}
/**
 * Send weekly summary email
 */
function sendWeeklySummaryEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: "\uD83D\uDCC8 Resumo Semanal - ".concat(data.organizationName),
                    html: (0, exports.getWeeklySummaryTemplate)(data),
                })];
        });
    });
}
/**
 * Send appointment confirmation email
 */
function sendAppointmentConfirmationEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '✅ Agendamento Confirmado',
                    html: (0, exports.getAppointmentConfirmationTemplate)(data),
                })];
        });
    });
}
/**
 * Send appointment reminder email
 */
function sendAppointmentReminderEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '⏰ Lembrete: Sua sessão é amanhã!',
                    html: (0, exports.getAppointmentReminderTemplate)(data),
                })];
        });
    });
}
/**
 * Send voucher confirmation email
 */
function sendVoucherConfirmationEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '✅ Compra Confirmada - Seu Voucher',
                    html: (0, exports.getVoucherConfirmationTemplate)(data),
                })];
        });
    });
}
/**
 * Send payment failed email
 */
function sendPaymentFailedEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '⚠️ Pagamento Não Processado',
                    html: (0, exports.getPaymentFailedTemplate)(data),
                })];
        });
    });
}
/**
 * Send voucher expiring email
 */
function sendVoucherExpiringEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '⚠️ Seu Voucher Está Expirando',
                    html: (0, exports.getVoucherExpiringTemplate)(data),
                })];
        });
    });
}
/**
 * Send birthday greeting email
 */
function sendBirthdayEmail(to, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendEmail({
                    to: to,
                    subject: '🎂 Feliz Aniversário!',
                    html: (0, exports.getBirthdayTemplate)(data),
                })];
        });
    });
}
