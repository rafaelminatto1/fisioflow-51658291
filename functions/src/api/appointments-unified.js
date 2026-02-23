"use strict";
/**
 * Unified Appointment Service
 * Consolida todas as operações de agendamentos.
 * Melhora eficiência de custo e performance.
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
exports.appointmentService = exports.appointmentServiceHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var cors_1 = require("../lib/cors");
var logger_1 = require("../lib/logger");
var appointments_1 = require("./appointments");
/**
 * HTTP Appointment Service
 */
exports.appointmentServiceHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 15,
    cpu: 1,
    concurrency: 80,
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var action, _a, fixAppointmentIndexHandler;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                // Set CORS headers manually to ensure they work
                (0, cors_1.setCorsHeaders)(res, req);
                // Handle preflight OPTIONS requests
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                action = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.action) || ((_c = req.query) === null || _c === void 0 ? void 0 : _c.action);
                if (action === 'ping') {
                    res.status(200).send('pong');
                    return [2 /*return*/];
                }
                logger_1.logger.info("[AppointmentService] Action: ".concat(action));
                _a = action;
                switch (_a) {
                    case 'list': return [3 /*break*/, 1];
                    case 'get': return [3 /*break*/, 2];
                    case 'create': return [3 /*break*/, 3];
                    case 'update': return [3 /*break*/, 4];
                    case 'cancel': return [3 /*break*/, 5];
                    case 'checkConflict': return [3 /*break*/, 6];
                    case 'fixIndices': return [3 /*break*/, 7];
                }
                return [3 /*break*/, 9];
            case 1: return [2 /*return*/, (0, appointments_1.listAppointmentsHttp)(req, res)];
            case 2: return [2 /*return*/, (0, appointments_1.getAppointmentHttp)(req, res)];
            case 3: return [2 /*return*/, (0, appointments_1.createAppointmentHttp)(req, res)];
            case 4: return [2 /*return*/, (0, appointments_1.updateAppointmentHttp)(req, res)];
            case 5: return [2 /*return*/, (0, appointments_1.cancelAppointmentHttp)(req, res)];
            case 6: return [2 /*return*/, (0, appointments_1.checkTimeConflictHttp)(req, res)];
            case 7: return [4 /*yield*/, Promise.resolve().then(function () { return require('../migrations/fix-appointment-index'); })];
            case 8:
                fixAppointmentIndexHandler = (_d.sent()).fixAppointmentIndexHandler;
                return [2 /*return*/, fixAppointmentIndexHandler(req, res)];
            case 9:
                res.status(400).json({ error: 'Ação de agendamento inválida.' });
                _d.label = 10;
            case 10: return [2 /*return*/];
        }
    });
}); });
/**
 * Callable Appointment Service
 */
exports.appointmentService = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var action, _a, listAppointmentsHandler, getAppointmentHandler, createAppointmentHandler, updateAppointmentHandler, cancelAppointmentHandler, checkTimeConflictHandler;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                action = (_b = request.data) === null || _b === void 0 ? void 0 : _b.action;
                if (action === 'ping') {
                    return [2 /*return*/, { status: 'ok', service: 'appointmentService' }];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./appointments'); })];
            case 1:
                _a = _c.sent(), listAppointmentsHandler = _a.listAppointmentsHandler, getAppointmentHandler = _a.getAppointmentHandler, createAppointmentHandler = _a.createAppointmentHandler, updateAppointmentHandler = _a.updateAppointmentHandler, cancelAppointmentHandler = _a.cancelAppointmentHandler, checkTimeConflictHandler = _a.checkTimeConflictHandler;
                switch (action) {
                    case 'list': return [2 /*return*/, listAppointmentsHandler(request)];
                    case 'get': return [2 /*return*/, getAppointmentHandler(request)];
                    case 'create': return [2 /*return*/, createAppointmentHandler(request)];
                    case 'update': return [2 /*return*/, updateAppointmentHandler(request)];
                    case 'cancel': return [2 /*return*/, cancelAppointmentHandler(request)];
                    case 'checkConflict': return [2 /*return*/, checkTimeConflictHandler(request)];
                    default:
                        throw new https_1.HttpsError('invalid-argument', 'Ação inválida.');
                }
                return [2 /*return*/];
        }
    });
}); });
