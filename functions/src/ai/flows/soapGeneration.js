"use strict";
/**
 * SOAP Note Generation Flow (Genkit)
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
exports.soapEnhancementFlow = exports.soapGenerationFlow = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
var SoapGenerationInputSchema = genkit_1.z.object({
    patientContext: genkit_1.z.object({
        patientName: genkit_1.z.string(),
        condition: genkit_1.z.string(),
        sessionNumber: genkit_1.z.number(),
    }),
    subjective: genkit_1.z.string().optional(),
    objective: genkit_1.z.string().optional(),
    assistantNeeded: genkit_1.z.enum(['assessment', 'plan', 'both', 'full']),
});
var SoapNoteOutputSchema = genkit_1.z.object({
    subjective: genkit_1.z.string().optional(),
    objective: genkit_1.z.string().optional(),
    assessment: genkit_1.z.string(),
    plan: genkit_1.z.string(),
    generatedSections: genkit_1.z.array(genkit_1.z.string()),
    confidence: genkit_1.z.number().min(0).max(1),
});
exports.soapGenerationFlow = config_1.ai.defineFlow({
    name: 'soapGeneration',
    inputSchema: SoapGenerationInputSchema,
    outputSchema: SoapNoteOutputSchema,
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var patientContext, subjective, objective, assistantNeeded, prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                patientContext = input.patientContext, subjective = input.subjective, objective = input.objective, assistantNeeded = input.assistantNeeded;
                prompt = "Como fisioterapeuta experiente, complete a nota SOAP para o seguinte paciente:\n\nCONTEXTO DO PACIENTE:\n- Nome: ".concat(patientContext.patientName, "\n- Condi\u00E7\u00E3o: ").concat(patientContext.condition, "\n- Sess\u00E3o #").concat(patientContext.sessionNumber, "\n\n");
                if (subjective) {
                    prompt += "SUBJETIVO (S) - J\u00E1 fornecido:\n".concat(subjective, "\n\n");
                }
                if (objective) {
                    prompt += "OBJETIVO (O) - J\u00E1 fornecido:\n".concat(objective, "\n\n");
                }
                switch (assistantNeeded) {
                    case 'assessment':
                        prompt += "TAREFA: Gere apenas a se\u00E7\u00E3o AVALIA\u00C7\u00C3O (A) baseada nos dados S e O acima.";
                        break;
                    case 'plan':
                        prompt += "TAREFA: Gere apenas a se\u00E7\u00E3o PLANO (P) baseada nos dados S, O e A acima.";
                        break;
                    case 'both':
                        prompt += "TAREFA: Gere as se\u00E7\u00F5es AVALIA\u00C7\u00C3O (A) e PLANO (P) baseadas nos dados S e O acima.";
                        break;
                    case 'full':
                        prompt += "TAREFA: Gere uma nota SOAP completa (S, O, A, P). Use os dados fornecidos e complete o que falta.";
                        break;
                }
                prompt += "\n\nDIRETRIZES:\n1. Use terminologia profissional de fisioterapia\n2. Seja espec\u00EDfico e objetivo\n3. Baseie-se em evid\u00EAncias cl\u00EDnicas\n4. Inclua metas mensur\u00E1veis no Plano\n5. Mantenha tom profissional mas emp\u00E1tico\n\nFORMATO DE SA\u00CDDA:\nRetorne um JSON com as se\u00E7\u00F5es geradas e um score de confian\u00E7a (0-1).";
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        config: {
                            temperature: 0.4,
                            maxOutputTokens: 1500,
                        },
                        output: {
                            format: 'json',
                            schema: SoapNoteOutputSchema,
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to generate SOAP note');
                }
                return [2 /*return*/, output];
        }
    });
}); });
exports.soapEnhancementFlow = config_1.ai.defineFlow({
    name: 'soapEnhancement',
    inputSchema: genkit_1.z.object({
        existingSOAP: genkit_1.z.object({
            subjective: genkit_1.z.string(),
            objective: genkit_1.z.string(),
            assessment: genkit_1.z.string(),
            plan: genkit_1.z.string(),
        }),
        enhancementType: genkit_1.z.enum(['clarity', 'detail', 'professional', 'evidence']),
    }),
    outputSchema: genkit_1.z.object({
        enhanced: genkit_1.z.object({
            subjective: genkit_1.z.string(),
            objective: genkit_1.z.string(),
            assessment: genkit_1.z.string(),
            plan: genkit_1.z.string(),
        }),
        improvements: genkit_1.z.array(genkit_1.z.string()),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var enhancementPrompts, prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                enhancementPrompts = {
                    clarity: 'Melhore a clareza e organização',
                    detail: 'Adicione mais detalhes clínicos relevantes',
                    professional: 'Ajuste para tom mais profissional',
                    evidence: 'Adicione referências a evidências científicas',
                };
                prompt = "".concat(enhancementPrompts[input.enhancementType], " da seguinte nota SOAP:\n\nSUBJETIVO:\n").concat(input.existingSOAP.subjective, "\n\nOBJETIVO:\n").concat(input.existingSOAP.objective, "\n\nAVALIA\u00C7\u00C3O:\n").concat(input.existingSOAP.assessment, "\n\nPLANO:\n").concat(input.existingSOAP.plan, "\n\nRetorne a nota SOAP aprimorada e uma lista das melhorias feitas.");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        config: {
                            temperature: 0.3,
                            maxOutputTokens: 2000,
                        },
                        output: {
                            format: 'json',
                            schema: genkit_1.z.object({
                                enhanced: genkit_1.z.object({
                                    subjective: genkit_1.z.string(),
                                    objective: genkit_1.z.string(),
                                    assessment: genkit_1.z.string(),
                                    plan: genkit_1.z.string(),
                                }),
                                improvements: genkit_1.z.array(genkit_1.z.string()),
                            }),
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to enhance SOAP note');
                }
                return [2 /*return*/, output];
        }
    });
}); });
