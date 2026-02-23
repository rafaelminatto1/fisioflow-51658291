"use strict";
/**
 * Clinical Analysis Flow (Genkit)
 *
 * Modernized version using Genkit patterns with ai.defineFlow()
 * Replaces direct Vertex AI SDK calls with Genkit abstractions
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
exports.comprehensiveClinicalFlow = exports.clinicalAnalysisFlow = exports.redFlagCheckFlow = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
// ============================================================================
// SCHEMAS
// ============================================================================
var ClinicalAnalysisInputSchema = genkit_1.z.object({
    patientId: genkit_1.z.string(),
    currentSOAP: genkit_1.z.object({
        subjective: genkit_1.z.string().optional(),
        objective: genkit_1.z.unknown().optional(),
        assessment: genkit_1.z.string().optional(),
        plan: genkit_1.z.unknown().optional(),
        vitalSigns: genkit_1.z.record(genkit_1.z.unknown()).optional(),
        functionalTests: genkit_1.z.record(genkit_1.z.unknown()).optional(),
    }),
    useGrounding: genkit_1.z.boolean().optional().default(false),
    treatmentDurationWeeks: genkit_1.z.number().optional(),
    redFlagCheckOnly: genkit_1.z.boolean().optional().default(false),
});
var ClinicalAnalysisOutputSchema = genkit_1.z.object({
    analysis: genkit_1.z.object({
        clinicalImpression: genkit_1.z.string(),
        differentialDiagnosis: genkit_1.z.array(genkit_1.z.string()),
        recommendedTests: genkit_1.z.array(genkit_1.z.string()),
        treatmentRecommendations: genkit_1.z.array(genkit_1.z.string()),
        prognosisIndicators: genkit_1.z.object({
            expectedRecoveryTime: genkit_1.z.string(),
            functionalGoals: genkit_1.z.array(genkit_1.z.string()),
            riskFactors: genkit_1.z.array(genkit_1.z.string()),
        }),
        evidenceLevel: genkit_1.z.string(),
    }),
    redFlags: genkit_1.z.array(genkit_1.z.object({
        flag: genkit_1.z.string(),
        severity: genkit_1.z.enum(['low', 'medium', 'high', 'critical']),
        recommendation: genkit_1.z.string(),
    })),
    confidence: genkit_1.z.number().min(0).max(1),
});
// ============================================================================
// FLOWS
// ============================================================================
/**
 * Red Flag Check Flow
 * Fast check for critical warning signs using Flash model
 */
exports.redFlagCheckFlow = config_1.ai.defineFlow({
    name: 'redFlagCheck',
    inputSchema: ClinicalAnalysisInputSchema,
    outputSchema: genkit_1.z.object({
        hasRedFlags: genkit_1.z.boolean(),
        redFlags: genkit_1.z.array(genkit_1.z.object({
            flag: genkit_1.z.string(),
            severity: genkit_1.z.enum(['low', 'medium', 'high', 'critical']),
            recommendation: genkit_1.z.string(),
        })),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prompt = "Como especialista em fisioterapia no Brasil, analise os seguintes dados do paciente para identificar RED FLAGS (sinais de alerta):\n\nDADOS SUBJETIVOS:\n".concat(input.currentSOAP.subjective || 'Não informado', "\n\nDADOS OBJETIVOS:\n").concat(JSON.stringify(input.currentSOAP.objective || {}, null, 2), "\n\nAVALIA\u00C7\u00C3O:\n").concat(input.currentSOAP.assessment || 'Não informado', "\n\nIdentifique qualquer sinal de alerta que requeira aten\u00E7\u00E3o m\u00E9dica imediata ou investiga\u00E7\u00E3o adicional.\n\nRetorne um JSON com:\n- hasRedFlags: boolean\n- redFlags: array de objetos com { flag, severity, recommendation }\n\nSeveridades: low, medium, high, critical");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        config: {
                            temperature: 0.1,
                            maxOutputTokens: 1500,
                        },
                        output: {
                            format: 'json',
                            schema: genkit_1.z.object({
                                hasRedFlags: genkit_1.z.boolean(),
                                redFlags: genkit_1.z.array(genkit_1.z.object({
                                    flag: genkit_1.z.string(),
                                    severity: genkit_1.z.enum(['low', 'medium', 'high', 'critical']),
                                    recommendation: genkit_1.z.string(),
                                })),
                            }),
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to check red flags');
                }
                return [2 /*return*/, output];
        }
    });
}); });
/**
 * Comprehensive Clinical Analysis Flow
 * Detailed analysis using Pro model with optional grounding
 */
exports.clinicalAnalysisFlow = config_1.ai.defineFlow({
    name: 'clinicalAnalysis',
    inputSchema: ClinicalAnalysisInputSchema,
    outputSchema: ClinicalAnalysisOutputSchema,
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prompt = "Como fisioterapeuta especialista no Brasil, realize uma an\u00E1lise cl\u00EDnica completa baseada nos seguintes dados:\n\nPACIENTE ID: ".concat(input.patientId, "\n\nDADOS SUBJETIVOS (Queixa do paciente):\n").concat(input.currentSOAP.subjective || 'Não informado', "\n\nDADOS OBJETIVOS (Exame f\u00EDsico):\n").concat(JSON.stringify(input.currentSOAP.objective || {}, null, 2), "\n\nSINAIS VITAIS:\n").concat(JSON.stringify(input.currentSOAP.vitalSigns || {}, null, 2), "\n\nTESTES FUNCIONAIS:\n").concat(JSON.stringify(input.currentSOAP.functionalTests || {}, null, 2), "\n\nAVALIA\u00C7\u00C3O PR\u00C9VIA:\n").concat(input.currentSOAP.assessment || 'Não informado', "\n\n").concat(input.treatmentDurationWeeks ? "DURA\u00C7\u00C3O DO TRATAMENTO: ".concat(input.treatmentDurationWeeks, " semanas") : '', "\n\nDIRETRIZES:\n1. Use evid\u00EAncias cient\u00EDficas atualizadas (contexto brasileiro)\n2. Considere diagn\u00F3sticos diferenciais\n3. Sugira testes complementares se necess\u00E1rio\n4. Forne\u00E7a recomenda\u00E7\u00F5es de tratamento baseadas em evid\u00EAncia\n5. Indique n\u00EDvel de evid\u00EAncia (A, B, C, D)\n6. Identifique fatores de risco e progn\u00F3stico\n\nRetorne an\u00E1lise estruturada em JSON conforme o schema.");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Pro,
                        prompt: prompt,
                        config: {
                            temperature: 0.3,
                            maxOutputTokens: 3000,
                        },
                        output: {
                            format: 'json',
                            schema: ClinicalAnalysisOutputSchema,
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to generate clinical analysis');
                }
                return [2 /*return*/, output];
        }
    });
}); });
/**
 * Combined Flow: Red Flag Check + Full Analysis
 * Optimized workflow that uses Flash for screening, Pro for analysis
 */
exports.comprehensiveClinicalFlow = config_1.ai.defineFlow({
    name: 'comprehensiveClinical',
    inputSchema: ClinicalAnalysisInputSchema,
    outputSchema: ClinicalAnalysisOutputSchema,
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var redFlagResult, analysisResult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.redFlagCheckFlow)(input)];
            case 1:
                redFlagResult = _a.sent();
                return [4 /*yield*/, (0, exports.clinicalAnalysisFlow)(input)];
            case 2:
                analysisResult = _a.sent();
                return [2 /*return*/, __assign(__assign({}, analysisResult), { redFlags: redFlagResult.redFlags })];
        }
    });
}); });
