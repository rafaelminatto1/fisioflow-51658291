"use strict";
/**
 * API Endpoint: /api/v1/evaluate
 * Endpoint genérico para avaliações via HTTP
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
exports.apiEvaluate = exports.apiEvaluateHandler = void 0;
/**
 * Endpoint HTTP para avaliações
 * Suporta GET (listar/buscar) e POST (criar)
 */
/**
 * Handler HTTP para avaliações
 */
var https_1 = require("firebase-functions/v2/https");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
var apiEvaluateHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var method, query, body, patientId, templateId, assessmentId, assessmentId;
    return __generator(this, function (_a) {
        // CORS headers
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return [2 /*return*/];
        }
        try {
            method = req.method, query = req.query, body = req.body;
            // Router básico baseado no método
            if (method === 'GET') {
                patientId = query.patientId, templateId = query.templateId, assessmentId = query.assessmentId;
                if (assessmentId) {
                    res.json({
                        message: 'Buscar assessment específico',
                        assessmentId: assessmentId,
                        note: 'Implementar chamada à getAssessment',
                    });
                    return [2 /*return*/];
                }
                if (patientId) {
                    res.json({
                        message: 'Listar assessments do paciente',
                        patientId: patientId,
                        note: 'Implementar chamada à listAssessments',
                    });
                    return [2 /*return*/];
                }
                if (templateId) {
                    res.json({
                        message: 'Buscar template de avaliação',
                        templateId: templateId,
                        note: 'Implementar chamada à getAssessmentTemplate',
                    });
                    return [2 /*return*/];
                }
                // Listar todos os templates
                res.json({
                    message: 'Listar todos os templates de avaliação',
                    note: 'Implementar chamada à listAssessmentTemplates',
                });
                return [2 /*return*/];
            }
            if (method === 'POST') {
                // Criar nova avaliação
                res.json({
                    message: 'Criar nova avaliação',
                    data: body,
                    note: 'Implementar chamada à createAssessment',
                });
                return [2 /*return*/];
            }
            if (method === 'PUT') {
                assessmentId = query.assessmentId;
                res.json({
                    message: 'Atualizar avaliação',
                    assessmentId: assessmentId,
                    data: body,
                    note: 'Implementar chamada à updateAssessment',
                });
                return [2 /*return*/];
            }
            res.status(405).json({ error: 'Method not allowed' });
            return [2 /*return*/];
        }
        catch (error) {
            logger_1.logger.error('Erro em apiEvaluate:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error',
            });
        }
        return [2 /*return*/];
    });
}); };
exports.apiEvaluateHandler = apiEvaluateHandler;
exports.apiEvaluate = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.apiEvaluateHandler);
