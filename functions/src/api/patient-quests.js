"use strict";
/**
 * Callables for gamification / patient quests (checkPatientAppointments, getLastPainMapDate).
 * Used by the frontend quest-generator via httpsCallable.
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
exports.getLastPainMapDate = exports.checkPatientAppointments = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
/**
 * Check if patient has appointments in the given date range.
 * Used by quest-generator for "Comparecer à Sessão" quest.
 */
exports.checkPatientAppointments = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, startDate, endDate, pool, result, error_1, message;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!((_b = request.auth) === null || _b === void 0 ? void 0 : _b.token)) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _d.sent();
                _a = (_c = request.data) !== null && _c !== void 0 ? _c : {}, patientId = _a.patientId, startDate = _a.startDate, endDate = _a.endDate;
                if (!patientId || !startDate || !endDate) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId, startDate e endDate são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT 1 FROM appointments\n         WHERE patient_id = $1 AND organization_id = $2\n           AND date >= $3 AND date <= $4\n         LIMIT 1", [patientId, auth.organizationId, startDate, endDate])];
            case 3:
                result = _d.sent();
                return [2 /*return*/, { hasAppointments: result.rows.length > 0 }];
            case 4:
                error_1 = _d.sent();
                logger_1.logger.error('checkPatientAppointments:', error_1);
                message = error_1 instanceof Error ? error_1.message : 'Erro ao verificar agendamentos';
                throw new https_1.HttpsError('internal', message);
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Get the last pain record date for a patient (pain map).
 * Used by quest-generator for pain map quests.
 */
exports.getLastPainMapDate = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, result, row, error_2, message;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token)) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _c.sent();
                patientId = ((_b = request.data) !== null && _b !== void 0 ? _b : {}).patientId;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                return [4 /*yield*/, pool.query("SELECT record_date FROM patient_pain_records\n         WHERE patient_id = $1 AND organization_id = $2\n         ORDER BY record_date DESC\n         LIMIT 1", [patientId, auth.organizationId])];
            case 3:
                result = _c.sent();
                row = result.rows[0];
                return [2 /*return*/, (row === null || row === void 0 ? void 0 : row.record_date) != null ? { lastDate: String(row.record_date) } : {}];
            case 4:
                error_2 = _c.sent();
                logger_1.logger.error('getLastPainMapDate:', error_2);
                message = error_2 instanceof Error ? error_2.message : 'Erro ao buscar última data do mapa de dor';
                throw new https_1.HttpsError('internal', message);
            case 5: return [2 /*return*/];
        }
    });
}); });
