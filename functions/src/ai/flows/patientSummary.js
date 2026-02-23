"use strict";
/**
 * Patient Executive Summary Flow (Genkit)
 *
 * Gera um resumo executivo do histórico completo do paciente.
 * Versão Otimizada com Prompt Avançado.
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
exports.patientExecutiveSummaryFlow = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
exports.patientExecutiveSummaryFlow = config_1.ai.defineFlow({
    name: 'patientExecutiveSummary',
    inputSchema: genkit_1.z.object({
        patientName: genkit_1.z.string(),
        condition: genkit_1.z.string(),
        history: genkit_1.z.array(genkit_1.z.object({
            date: genkit_1.z.string(),
            subjective: genkit_1.z.string().optional(),
            objective: genkit_1.z.string().optional(),
            assessment: genkit_1.z.string().optional(),
            plan: genkit_1.z.string().optional(),
            exercises: genkit_1.z.array(genkit_1.z.string()).optional(),
        })),
        goals: genkit_1.z.array(genkit_1.z.string()).optional(),
    }),
    outputSchema: genkit_1.z.object({
        summary: genkit_1.z.string().describe("Resumo narrativo conciso do progresso (2-3 frases)"),
        trends: genkit_1.z.array(genkit_1.z.object({
            metric: genkit_1.z.string(),
            observation: genkit_1.z.string(),
            sentiment: genkit_1.z.enum(['positive', 'neutral', 'negative']),
        })).describe("Lista de tendências observadas (ex: dor, amplitude de movimento)"),
        clinicalAdvice: genkit_1.z.string().describe("Recomendação clínica acionável"),
        keyRisks: genkit_1.z.array(genkit_1.z.string()).describe("Lista de riscos ou alertas"),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var historyText, recentHistory, prompt, output;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                historyText = "Nenhum histórico disponível.";
                if (input.history && input.history.length > 0) {
                    recentHistory = input.history.slice(0, 10);
                    historyText = recentHistory.map(function (h) {
                        var _a;
                        return "Sess\u00E3o (".concat(h.date, "):\n   - Subjetivo: ").concat(h.subjective || '-', "\n   - Objetivo: ").concat(h.objective || '-', "\n   - Exerc\u00EDcios: ").concat(((_a = h.exercises) === null || _a === void 0 ? void 0 : _a.join(', ')) || '-');
                    }).join('\n\n');
                }
                prompt = "\nRole: Fisioterapeuta S\u00EAnior Especialista em An\u00E1lise de Dados Cl\u00EDnicos.\nTask: Gerar um resumo executivo de alta qualidade para o fisioterapeuta respons\u00E1vel.\n\nPatient Context:\n- Nome: ".concat(input.patientName, "\n- Condi\u00E7\u00E3o Principal: ").concat(input.condition, "\n- Metas: ").concat(((_a = input.goals) === null || _a === void 0 ? void 0 : _a.length) ? input.goals.join(', ') : 'Não definidas', "\n\nClinical History (\u00DAltimas sess\u00F5es):\n").concat(historyText, "\n\nInstructions:\n1. SUMMARY: Escreva um par\u00E1grafo curto (2-3 frases) sintetizando o estado atual do paciente e a progress\u00E3o recente. Seja direto.\n2. TRENDS: Identifique padr\u00F5es claros nos dados (ex: \"Dor diminuiu 50% nas \u00FAltimas 3 semanas\", \"ADM de flex\u00E3o estagnada em 90\u00BA\"). Classifique o sentimento.\n3. ADVICE: Sugira o pr\u00F3ximo passo cl\u00EDnico l\u00F3gico (ex: \"Progredir carga em cadeia cin\u00E9tica fechada\", \"Reavaliar t\u00E9cnica de agachamento\").\n4. RISKS: Cite riscos potenciais baseados no hist\u00F3rico (ex: \"Relato de dor tardia sugere sobrecarga\", \"Baixa ades\u00E3o aos exerc\u00EDcios domiciliares\").\n\nOutput Format: JSON estrito conforme schema.\nLanguage: Portuguese (Brasil).\n");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        output: {
                            format: 'json',
                            schema: genkit_1.z.object({
                                summary: genkit_1.z.string(),
                                trends: genkit_1.z.array(genkit_1.z.object({
                                    metric: genkit_1.z.string(),
                                    observation: genkit_1.z.string(),
                                    sentiment: genkit_1.z.enum(['positive', 'neutral', 'negative']),
                                })),
                                clinicalAdvice: genkit_1.z.string(),
                                keyRisks: genkit_1.z.array(genkit_1.z.string()),
                            }),
                        },
                    })];
            case 1:
                output = (_b.sent()).output;
                if (!output) {
                    throw new Error('Falha ao gerar resumo executivo. Tente novamente.');
                }
                return [2 /*return*/, output];
        }
    });
}); });
