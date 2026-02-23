"use strict";
/**
 * Unified Patient Service
 * Consolida todas as operações de pacientes em um único serviço Cloud Functions Gen 2.
 * Reduz custos de instâncias ativas e simplifica a manutenção.
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
exports.patientService = exports.patientServiceHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var patients_1 = require("./patients");
var cors_1 = require("../lib/cors");
var logger_1 = require("../lib/logger");
/**
 * Handler unificado para chamadas HTTP (POST)
 * O frontend deve chamar este endpoint com a propriedade "action" no body.
 * Ex: { "action": "list", "search": "Joao" }
 */
exports.patientServiceHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 15, // Aumentado ligeiramente para suportar mais tráfego unificado
    cpu: 1,
    concurrency: 80,
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var action;
    var _a, _b;
    return __generator(this, function (_c) {
        // Set CORS headers manually to ensure they work
        (0, cors_1.setCorsHeaders)(res, req);
        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return [2 /*return*/];
        }
        action = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.action) || ((_b = req.query) === null || _b === void 0 ? void 0 : _b.action);
        if (action === 'ping') {
            res.status(200).send('pong');
            return [2 /*return*/];
        }
        logger_1.logger.info("[PatientService] Executing action: ".concat(action));
        switch (action) {
            case 'list':
                return [2 /*return*/, (0, patients_1.listPatientsHttp)(req, res)];
            case 'get':
                return [2 /*return*/, (0, patients_1.getPatientHttp)(req, res)];
            case 'create':
                return [2 /*return*/, (0, patients_1.createPatientHttp)(req, res)];
            case 'update':
                return [2 /*return*/, (0, patients_1.updatePatientHttp)(req, res)];
            case 'delete':
                return [2 /*return*/, (0, patients_1.deletePatientHttp)(req, res)];
            case 'stats':
                return [2 /*return*/, (0, patients_1.getPatientStatsHttp)(req, res)];
            default:
                res.status(400).json({
                    error: "A\u00E7\u00E3o inv\u00E1lida: ".concat(action, ". Use: list, get, create, update, delete, stats.")
                });
        }
        return [2 /*return*/];
    });
}); });
/**
 * Handler unificado para chamadas Callable (Firebase SDK)
 */
exports.patientService = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var action, _a, listPatientsHandler, getPatientHandler, createPatientHandler, updatePatientHandler, deletePatientHandler, getPatientStatsHandler;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                action = (_b = request.data) === null || _b === void 0 ? void 0 : _b.action;
                if (!action) {
                    throw new https_1.HttpsError('invalid-argument', 'Propriedade "action" é obrigatória.');
                }
                if (action === 'ping') {
                    return [2 /*return*/, { status: 'ok', service: 'patientService' }];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./patients'); })];
            case 1:
                _a = _c.sent(), listPatientsHandler = _a.listPatientsHandler, getPatientHandler = _a.getPatientHandler, createPatientHandler = _a.createPatientHandler, updatePatientHandler = _a.updatePatientHandler, deletePatientHandler = _a.deletePatientHandler, getPatientStatsHandler = _a.getPatientStatsHandler;
                switch (action) {
                    case 'list': return [2 /*return*/, listPatientsHandler(request)];
                    case 'get': return [2 /*return*/, getPatientHandler(request)];
                    case 'create': return [2 /*return*/, createPatientHandler(request)];
                    case 'update': return [2 /*return*/, updatePatientHandler(request)];
                    case 'delete': return [2 /*return*/, deletePatientHandler(request)];
                    case 'stats': return [2 /*return*/, getPatientStatsHandler(request)];
                    default:
                        throw new https_1.HttpsError('invalid-argument', "A\u00E7\u00E3o desconhecida: ".concat(action));
                }
                return [2 /*return*/];
        }
    });
}); });
