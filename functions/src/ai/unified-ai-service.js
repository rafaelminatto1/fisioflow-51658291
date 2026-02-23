"use strict";
/**
 * AI Service Unificado - Fase 2 de Otimização
 *
 * Consolida múltiplas funções AI em um único serviço
 * Reduz de 13 funções separadas para 1 função unificada
 * Economia: ~R$ 15-20/mês em custos de infraestrutura
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiServiceHttp = exports.aiServiceHttpHandler = exports.aiService = exports.aiServiceHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var cors_1 = require("../lib/cors");
var function_config_1 = require("../lib/function-config");
// ============================================================================
// AI HANDLERS IMPORT
// ============================================================================
// Handlers de flow-wrappers
var exerciseGeneratorHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var exerciseGeneratorHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                exerciseGeneratorHandler = (_a.sent()).exerciseGeneratorHandler;
                return [2 /*return*/, exerciseGeneratorHandler(request)];
        }
    });
}); };
var clinicalAnalysisHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var clinicalAnalysisHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                clinicalAnalysisHandler = (_a.sent()).clinicalAnalysisHandler;
                return [2 /*return*/, clinicalAnalysisHandler(request)];
        }
    });
}); };
var exerciseSuggestionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var exerciseSuggestionHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                exerciseSuggestionHandler = (_a.sent()).exerciseSuggestionHandler;
                return [2 /*return*/, exerciseSuggestionHandler(request)];
        }
    });
}); };
var soapGenerationHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var soapGenerationHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                soapGenerationHandler = (_a.sent()).soapGenerationHandler;
                return [2 /*return*/, soapGenerationHandler(request)];
        }
    });
}); };
var analyzeProgressHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var analyzeProgressHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                analyzeProgressHandler = (_a.sent()).analyzeProgressHandler;
                return [2 /*return*/, analyzeProgressHandler(request)];
        }
    });
}); };
var patientSummaryHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var patientSummaryHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flow-wrappers'); })];
            case 1:
                patientSummaryHandler = (_a.sent()).patientSummaryHandler;
                return [2 /*return*/, patientSummaryHandler(request)];
        }
    });
}); };
// Handlers de movement-analysis
var movementAnalysisHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var movementAnalysisHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./movement-analysis'); })];
            case 1:
                movementAnalysisHandler = (_a.sent()).movementAnalysisHandler;
                return [2 /*return*/, movementAnalysisHandler(request)];
        }
    });
}); };
// Handlers de clinical-chat
var aiClinicalChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiClinicalChatHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./clinical-chat'); })];
            case 1:
                aiClinicalChatHandler = (_a.sent()).aiClinicalChatHandler;
                return [2 /*return*/, aiClinicalChatHandler(request)];
        }
    });
}); };
var aiExerciseRecommendationChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiExerciseRecommendationChatHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./clinical-chat'); })];
            case 1:
                aiExerciseRecommendationChatHandler = (_a.sent()).aiExerciseRecommendationChatHandler;
                return [2 /*return*/, aiExerciseRecommendationChatHandler(request)];
        }
    });
}); };
var aiSoapNoteChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiSoapNoteChatHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./clinical-chat'); })];
            case 1:
                aiSoapNoteChatHandler = (_a.sent()).aiSoapNoteChatHandler;
                return [2 /*return*/, aiSoapNoteChatHandler(request)];
        }
    });
}); };
var aiGetSuggestionsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiGetSuggestionsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./clinical-chat'); })];
            case 1:
                aiGetSuggestionsHandler = (_a.sent()).aiGetSuggestionsHandler;
                return [2 /*return*/, aiGetSuggestionsHandler(request)];
        }
    });
}); };
// Handlers de groq-service
var aiFastProcessingHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiFastProcessingHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./groq-service'); })];
            case 1:
                aiFastProcessingHandler = (_a.sent()).aiFastProcessingHandler;
                return [2 /*return*/, aiFastProcessingHandler(request)];
        }
    });
}); };
// Handlers de semantic-search
var semanticSearchHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var semanticSearchHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./semantic-search'); })];
            case 1:
                semanticSearchHandler = (_a.sent()).semanticSearchHandler;
                return [2 /*return*/, semanticSearchHandler(request)];
        }
    });
}); };
// Handlers de marketing-ai
var marketingTemplateHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var marketingTemplateHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./marketing-ai'); })];
            case 1:
                marketingTemplateHandler = (_a.sent()).marketingTemplateHandler;
                return [2 /*return*/, marketingTemplateHandler(request)];
        }
    });
}); };
// ============================================================================
// UNIFIED AI SERVICE (Callable)
// ============================================================================
/**
 * AI Service Unificado - Callable
 *
 * Uma única função que roteia para todos os handlers AI baseado na ação
 * Reduz infraestrutura de 13 serviços Cloud Run para 1
 */
var aiServiceHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, action, params, _b, multimodalAnalysisFlow, suggestOptimalSlotFlow, predictNoShowFlow, optimizeCapacityFlow, waitlistPrioritizationFlow, getPatientAppointmentHistory, getPatientPreferences, checkSlotCapacity;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, action = _a.action, params = __rest(_a, ["action"]);
                if (!action) {
                    throw new Error('action é obrigatório');
                }
                _b = action;
                switch (_b) {
                    case 'semanticSearch': return [3 /*break*/, 1];
                    case 'generateExercisePlan': return [3 /*break*/, 2];
                    case 'clinicalAnalysis': return [3 /*break*/, 3];
                    case 'exerciseSuggestion': return [3 /*break*/, 4];
                    case 'soapGeneration': return [3 /*break*/, 5];
                    case 'analyzeProgress': return [3 /*break*/, 6];
                    case 'patientExecutiveSummary': return [3 /*break*/, 7];
                    case 'multimodalAnalysis': return [3 /*break*/, 8];
                    case 'movementAnalysis': return [3 /*break*/, 10];
                    case 'clinicalChat': return [3 /*break*/, 11];
                    case 'exerciseRecommendationChat': return [3 /*break*/, 12];
                    case 'soapNoteChat': return [3 /*break*/, 13];
                    case 'getSuggestions': return [3 /*break*/, 14];
                    case 'fastProcessing': return [3 /*break*/, 15];
                    case 'generateMarketingTemplate': return [3 /*break*/, 16];
                    case 'suggestOptimalSlot': return [3 /*break*/, 17];
                    case 'predictNoShow': return [3 /*break*/, 19];
                    case 'optimizeCapacity': return [3 /*break*/, 21];
                    case 'waitlistPrioritization': return [3 /*break*/, 23];
                    case 'getPatientAppointmentHistory': return [3 /*break*/, 25];
                    case 'getPatientPreferences': return [3 /*break*/, 27];
                    case 'checkSlotCapacity': return [3 /*break*/, 29];
                }
                return [3 /*break*/, 31];
            case 1: return [2 /*return*/, semanticSearchHandler({ data: params })];
            case 2: return [2 /*return*/, exerciseGeneratorHandler({ data: params })];
            case 3: return [2 /*return*/, clinicalAnalysisHandler({ data: params })];
            case 4: return [2 /*return*/, exerciseSuggestionHandler({ data: params })];
            case 5: return [2 /*return*/, soapGenerationHandler({ data: params })];
            case 6: return [2 /*return*/, analyzeProgressHandler({ data: params })];
            case 7: return [2 /*return*/, patientSummaryHandler({ data: params })];
            case 8: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows'); })];
            case 9:
                multimodalAnalysisFlow = (_c.sent()).multimodalAnalysisFlow;
                return [2 /*return*/, multimodalAnalysisFlow(params)];
            case 10: return [2 /*return*/, movementAnalysisHandler({ data: params })];
            case 11: return [2 /*return*/, aiClinicalChatHandler({ data: params })];
            case 12: return [2 /*return*/, aiExerciseRecommendationChatHandler({ data: params })];
            case 13: return [2 /*return*/, aiSoapNoteChatHandler({ data: params })];
            case 14: return [2 /*return*/, aiGetSuggestionsHandler({ data: params })];
            case 15: return [2 /*return*/, aiFastProcessingHandler({ data: params })];
            case 16: return [2 /*return*/, marketingTemplateHandler({ data: params })];
            case 17: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 18:
                suggestOptimalSlotFlow = (_c.sent()).suggestOptimalSlotFlow;
                return [2 /*return*/, suggestOptimalSlotFlow(params)];
            case 19: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 20:
                predictNoShowFlow = (_c.sent()).predictNoShowFlow;
                return [2 /*return*/, predictNoShowFlow(params)];
            case 21: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 22:
                optimizeCapacityFlow = (_c.sent()).optimizeCapacityFlow;
                return [2 /*return*/, optimizeCapacityFlow(params)];
            case 23: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 24:
                waitlistPrioritizationFlow = (_c.sent()).waitlistPrioritizationFlow;
                return [2 /*return*/, waitlistPrioritizationFlow(params)];
            case 25: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 26:
                getPatientAppointmentHistory = (_c.sent()).getPatientAppointmentHistory;
                return [2 /*return*/, getPatientAppointmentHistory(params)];
            case 27: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 28:
                getPatientPreferences = (_c.sent()).getPatientPreferences;
                return [2 /*return*/, getPatientPreferences(params)];
            case 29: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows/scheduling'); })];
            case 30:
                checkSlotCapacity = (_c.sent()).checkSlotCapacity;
                return [2 /*return*/, checkSlotCapacity(params)];
            case 31: throw new Error("A\u00E7\u00E3o desconhecida: ".concat(action));
        }
    });
}); };
exports.aiServiceHandler = aiServiceHandler;
exports.aiService = (0, https_1.onCall)(function_config_1.AI_FUNCTION, exports.aiServiceHandler);
// ============================================================================
// UNIFIED AI SERVICE (HTTP)
// ============================================================================
/**
 * AI Service Unificado - HTTP
 *
 * Versão HTTP para chamadas fetch do frontend com suporte a CORS
 */
var aiServiceHttpHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, action, params, mockRequest, result, _a, flow, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // CORS
                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 35, , 36]);
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                action = body.action, params = __rest(body, ["action"]);
                if (!action) {
                    res.status(400).json({ error: 'action é obrigatório' });
                    return [2 /*return*/];
                }
                mockRequest = {
                    data: params,
                    auth: req.user, // Se disponível via middleware
                };
                result = void 0;
                _a = action;
                switch (_a) {
                    case 'semanticSearch': return [3 /*break*/, 2];
                    case 'generateExercisePlan': return [3 /*break*/, 4];
                    case 'clinicalAnalysis': return [3 /*break*/, 6];
                    case 'exerciseSuggestion': return [3 /*break*/, 8];
                    case 'soapGeneration': return [3 /*break*/, 10];
                    case 'analyzeProgress': return [3 /*break*/, 12];
                    case 'patientExecutiveSummary': return [3 /*break*/, 14];
                    case 'multimodalAnalysis': return [3 /*break*/, 16];
                    case 'movementAnalysis': return [3 /*break*/, 19];
                    case 'clinicalChat': return [3 /*break*/, 21];
                    case 'exerciseRecommendationChat': return [3 /*break*/, 23];
                    case 'soapNoteChat': return [3 /*break*/, 25];
                    case 'getSuggestions': return [3 /*break*/, 27];
                    case 'fastProcessing': return [3 /*break*/, 29];
                    case 'generateMarketingTemplate': return [3 /*break*/, 31];
                }
                return [3 /*break*/, 33];
            case 2: return [4 /*yield*/, semanticSearchHandler(mockRequest)];
            case 3:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 4: return [4 /*yield*/, exerciseGeneratorHandler(mockRequest)];
            case 5:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 6: return [4 /*yield*/, clinicalAnalysisHandler(mockRequest)];
            case 7:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 8: return [4 /*yield*/, exerciseSuggestionHandler(mockRequest)];
            case 9:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 10: return [4 /*yield*/, soapGenerationHandler(mockRequest)];
            case 11:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 12: return [4 /*yield*/, analyzeProgressHandler(mockRequest)];
            case 13:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 14: return [4 /*yield*/, patientSummaryHandler(mockRequest)];
            case 15:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 16: return [4 /*yield*/, Promise.resolve().then(function () { return require('./flows'); })];
            case 17:
                flow = (_b.sent()).multimodalAnalysisFlow;
                return [4 /*yield*/, flow(params)];
            case 18:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 19: return [4 /*yield*/, movementAnalysisHandler(mockRequest)];
            case 20:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 21: return [4 /*yield*/, aiClinicalChatHandler(mockRequest)];
            case 22:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 23: return [4 /*yield*/, aiExerciseRecommendationChatHandler(mockRequest)];
            case 24:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 25: return [4 /*yield*/, aiSoapNoteChatHandler(mockRequest)];
            case 26:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 27: return [4 /*yield*/, aiGetSuggestionsHandler(mockRequest)];
            case 28:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 29: return [4 /*yield*/, aiFastProcessingHandler(mockRequest)];
            case 30:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 31: return [4 /*yield*/, marketingTemplateHandler(mockRequest)];
            case 32:
                result = _b.sent();
                return [3 /*break*/, 34];
            case 33:
                res.status(400).json({ error: "A\u00E7\u00E3o desconhecida: ".concat(action) });
                return [2 /*return*/];
            case 34:
                res.json({ success: true, data: result });
                return [3 /*break*/, 36];
            case 35:
                error_1 = _b.sent();
                console.error('[aiServiceHttp] Error:', error_1);
                res.status(500).json({ error: error_1.message || 'Erro interno' });
                return [3 /*break*/, 36];
            case 36: return [2 /*return*/];
        }
    });
}); };
exports.aiServiceHttpHandler = aiServiceHttpHandler;
exports.aiServiceHttp = (0, https_1.onRequest)(__assign(__assign({}, function_config_1.AI_FUNCTION), (0, function_config_1.withCors)(function_config_1.AI_FUNCTION, cors_1.CORS_ORIGINS)), exports.aiServiceHttpHandler);
