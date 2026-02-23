"use strict";
// Definir a chave secreta
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
exports.sendEmail = exports.sendEmailHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var params_1 = require("firebase-functions/params");
var resend_1 = require("resend");
var logger = require("firebase-functions/logger");
var RESEND_API_KEY = (0, params_1.defineString)('RESEND_API_KEY');
var RESEND_FROM_EMAIL = (0, params_1.defineString)('RESEND_FROM_EMAIL');
// Instância do Resend
var resend;
var getResend = function () {
    if (!resend) {
        var key = RESEND_API_KEY.value();
        if (!key)
            throw new Error('RESEND_API_KEY not configured');
        resend = new resend_1.Resend(key);
    }
    return resend;
};
var getWelcomeTemplate = function (name, clinicName) { return "\n<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body { font-family: sans-serif; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }\n    .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }\n    .button { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }\n    .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1>Bem-vindo \u00E0 ".concat(clinicName, "</h1>\n    </div>\n    <div class=\"content\">\n      <p>Ol\u00E1, <strong>").concat(name, "</strong>!</p>\n      <p>Estamos muito felizes em t\u00EA-lo(a) conosco. Seu cadastro no FisioFlow foi realizado com sucesso.</p>\n      <p>Voc\u00EA agora pode acessar o Portal do Paciente para ver seus agendamentos, exerc\u00EDcios e evolu\u00E7\u00E3o.</p>\n      <div style=\"text-align: center;\">\n        <a href=\"https://fisioflow-migration.web.app/portal\" class=\"button\">Acessar Portal</a>\n      </div>\n    </div>\n    <div class=\"footer\">\n      <p>\u00A9 ").concat(new Date().getFullYear(), " ").concat(clinicName, ". Todos os direitos reservados.</p>\n    </div>\n  </div>\n</body>\n</html>\n"); };
/**
 * Handler da lógica de envio (separado da infraestrutura)
 */
var sendEmailHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, to, subject, html, type, data, client, from, emailHtml, _b, result, error, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, to = _a.to, subject = _a.subject, html = _a.html, type = _a.type, data = _a.data;
                if (!to || !subject) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing "to" or "subject" fields');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                client = getResend();
                from = 'FisioFlow <onboarding@resend.dev>';
                // Tenta pegar o email configurado nos segredos/params
                try {
                    if (RESEND_FROM_EMAIL.value()) {
                        from = RESEND_FROM_EMAIL.value();
                    }
                }
                catch (e) {
                    // Ignora se não definido
                }
                emailHtml = html;
                if (type === 'welcome') {
                    emailHtml = getWelcomeTemplate((data === null || data === void 0 ? void 0 : data.name) || 'Paciente', (data === null || data === void 0 ? void 0 : data.clinicName) || 'FisioFlow');
                }
                if (!emailHtml) {
                    emailHtml = '<p>Mensagem enviada via FisioFlow.</p>';
                }
                return [4 /*yield*/, client.emails.send({
                        from: from,
                        to: to,
                        subject: subject,
                        html: emailHtml,
                    })];
            case 2:
                _b = _c.sent(), result = _b.data, error = _b.error;
                if (error) {
                    logger.error('Resend Error:', error);
                    throw new https_1.HttpsError('internal', error.message);
                }
                logger.info('Email sent successfully:', result);
                return [2 /*return*/, { success: true, id: result === null || result === void 0 ? void 0 : result.id }];
            case 3:
                error_1 = _c.sent();
                logger.error('Send Email Error', error_1);
                throw new https_1.HttpsError('internal', 'Failed to send email: ' + error_1.message);
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.sendEmailHandler = sendEmailHandler;
exports.sendEmail = (0, https_1.onCall)({ region: 'southamerica-east1' }, exports.sendEmailHandler);
