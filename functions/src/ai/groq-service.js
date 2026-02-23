"use strict";
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
exports.aiFastProcessing = exports.aiFastProcessingHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var params_1 = require("firebase-functions/params");
var groq_sdk_1 = require("groq-sdk");
var logger = require("firebase-functions/logger");
var GROQ_API_KEY = (0, params_1.defineString)('GROQ_API_KEY');
var groq;
var getGroq = function () {
    if (!groq) {
        var key = GROQ_API_KEY.value();
        if (!key)
            throw new Error('GROQ_API_KEY not configured');
        groq = new groq_sdk_1.default({ apiKey: key });
    }
    return groq;
};
/**
 * Processamento ultra-rápido de texto (Correção, Formatação, Extração)
 */
var aiFastProcessingHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, text, mode, client, systemPrompt, completion, result, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = request.data, text = _a.text, mode = _a.mode;
                if (!text) {
                    throw new https_1.HttpsError('invalid-argument', 'Text is required');
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                client = getGroq();
                systemPrompt = '';
                switch (mode) {
                    case 'fix_grammar':
                        systemPrompt = "Voc\u00EA \u00E9 um assistente m\u00E9dico especialista em fisioterapia. \n        Sua tarefa \u00E9 corrigir a gram\u00E1tica, expandir abrevia\u00E7\u00F5es m\u00E9dicas comuns (ex: ADM -> Amplitude de Movimento, MMII -> Membros Inferiores) e tornar o texto mais profissional para um prontu\u00E1rio.\n        Mantenha o tom t\u00E9cnico. N\u00E3o adicione informa\u00E7\u00F5es que n\u00E3o existem no texto original. Responda APENAS com o texto corrigido.";
                        break;
                    case 'summarize':
                        systemPrompt = 'Resuma o seguinte texto clínico em tópicos (bullet points) concisos. Responda APENAS com os tópicos.';
                        break;
                    default:
                        systemPrompt = 'Melhore o seguinte texto.';
                }
                return [4 /*yield*/, client.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text },
                        ],
                        model: 'llama3-70b-8192', // Modelo rápido e inteligente
                        temperature: 0.3, // Baixa temperatura para ser mais determinístico/técnico
                        max_tokens: 1024,
                    })];
            case 2:
                completion = _d.sent();
                result = ((_c = (_b = completion.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
                return [2 /*return*/, {
                        result: result.trim(),
                        model: 'llama3-70b-8192-groq'
                    }];
            case 3:
                error_1 = _d.sent();
                logger.error('Groq AI Error', error_1);
                throw new https_1.HttpsError('internal', 'AI processing failed: ' + error_1.message);
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.aiFastProcessingHandler = aiFastProcessingHandler;
exports.aiFastProcessing = (0, https_1.onCall)({ region: 'southamerica-east1' }, exports.aiFastProcessingHandler);
