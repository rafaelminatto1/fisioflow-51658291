"use strict";
/**
 * Multimodal Analysis Flow (Genkit)
 * Uses Gemini 1.5 Pro to analyze clinical images and videos
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.multimodalAnalysisFlow = exports.MultimodalAnalysisOutputSchema = exports.MultimodalAnalysisInputSchema = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
exports.MultimodalAnalysisInputSchema = genkit_1.z.object({
    patientId: genkit_1.z.string(),
    type: genkit_1.z.enum(['posture', 'exam', 'movement', 'wound']),
    mediaUrl: genkit_1.z.string().url(), // Can be a Cloud Storage signed URL or public URL
    contentType: genkit_1.z.string().optional().default('image/jpeg'),
    notes: genkit_1.z.string().optional(),
});
exports.MultimodalAnalysisOutputSchema = genkit_1.z.object({
    findings: genkit_1.z.array(genkit_1.z.string()),
    severity: genkit_1.z.enum(['low', 'moderate', 'high', 'urgent']),
    clinicalSummary: genkit_1.z.string(),
    suggestions: genkit_1.z.array(genkit_1.z.string()),
    disclaimer: genkit_1.z.string(),
});
exports.multimodalAnalysisFlow = config_1.ai.defineFlow({
    name: 'multimodalAnalysis',
    inputSchema: exports.MultimodalAnalysisInputSchema,
    outputSchema: exports.MultimodalAnalysisOutputSchema,
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var type, mediaUrl, contentType, notes, systemPrompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                type = input.type, mediaUrl = input.mediaUrl, contentType = input.contentType, notes = input.notes;
                systemPrompt = '';
                switch (type) {
                    case 'posture':
                        systemPrompt = 'Você é um especialista em biomecânica e fisioterapia. Analise esta foto de postura procurando por desvios como escoliose, hipercifose, inclinação pélvica ou assimetrias de ombro.';
                        break;
                    case 'exam':
                        systemPrompt = 'Você é um radiologista e fisioterapeuta. Analise este exame (raio-x, ressonância ou laudo) e identifique achados clínicos relevantes para a reabilitação física.';
                        break;
                    case 'movement':
                        systemPrompt = 'Você é especialista em análise de movimento. Analise este vídeo ou sequência de fotos de um exercício e identifique erros de execução, compensações ou limitações de amplitude.';
                        break;
                    default:
                        systemPrompt = 'Analise esta imagem clínica e forneça achados relevantes para fisioterapia.';
                }
                systemPrompt += "\n\nNotas adicionais do terapeuta: ".concat(notes || 'Nenhuma');
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Pro,
                        prompt: [
                            { text: systemPrompt },
                            { media: { url: mediaUrl, contentType: contentType } }
                        ],
                        config: {
                            temperature: 0.2, // Low temperature for clinical accuracy
                        },
                        output: {
                            format: 'json',
                            schema: exports.MultimodalAnalysisOutputSchema,
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Falha ao processar análise multimodal');
                }
                return [2 /*return*/, __assign(__assign({}, output), { disclaimer: 'ESTA É UMA ANÁLISE AUXILIAR GERADA POR IA. O diagnóstico final deve ser feito por um profissional de saúde qualificado.' })];
        }
    });
}); });
