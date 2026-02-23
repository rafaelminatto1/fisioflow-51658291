"use strict";
/**
 * Cloud Function Handler: Marketing Template Generation
 *
 * Generates marketing content (reviews, birthdays, social media captions)
 * using Gemini Pro via Vertex AI.
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
exports.marketingTemplateHandler = void 0;
var logger = require("firebase-functions/logger");
var https_1 = require("firebase-functions/v2/https");
// ============================================================================
// MAIN HANDLER
// ============================================================================
var marketingTemplateHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, prompt, _b, language, VertexAI, vertexAI, generativeModel, result, response, text, error_1;
    var _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _a = request.data, prompt = _a.prompt, _b = _a.language, language = _b === void 0 ? 'pt-BR' : _b;
                if (!prompt) {
                    throw new https_1.HttpsError('invalid-argument', 'O campo "prompt" é obrigatório.');
                }
                _h.label = 1;
            case 1:
                _h.trys.push([1, 4, , 5]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('@google-cloud/vertexai'); })];
            case 2:
                VertexAI = (_h.sent()).VertexAI;
                vertexAI = new VertexAI({
                    project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
                    location: 'us-central1', // Using US for better availability if needed, or southamerica-east1
                });
                generativeModel = vertexAI.getGenerativeModel({
                    model: 'gemini-1.5-flash', // Flash is better for marketing/text tasks (faster/cheaper)
                });
                return [4 /*yield*/, generativeModel.generateContent({
                        contents: [{ role: 'user', parts: [{ text: "Generate content in ".concat(language, ". Prompt: ").concat(prompt) }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1024,
                            responseMimeType: 'application/json',
                        },
                    })];
            case 3:
                result = _h.sent();
                response = result.response;
                text = (_g = (_f = (_e = (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text;
                if (!text) {
                    throw new Error('Não foi possível obter uma resposta da IA.');
                }
                try {
                    return [2 /*return*/, JSON.parse(text)];
                }
                catch (e) {
                    logger.warn('[MarketingAI] Response is not valid JSON, returning as plain text:', text);
                    return [2 /*return*/, { template: text, suggestions: [] }];
                }
                return [3 /*break*/, 5];
            case 4:
                error_1 = _h.sent();
                logger.error('[MarketingAI] Error generating content:', error_1);
                throw new https_1.HttpsError('internal', error_1.message || 'Erro ao gerar conteúdo de marketing.');
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.marketingTemplateHandler = marketingTemplateHandler;
