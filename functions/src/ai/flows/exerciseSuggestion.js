"use strict";
/**
 * Exercise Suggestion Flow (Genkit)
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exerciseProgressionFlow = exports.exerciseSuggestionFlow = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
var ExerciseSuggestionInputSchema = genkit_1.z.object({
    patientId: genkit_1.z.string(),
    goals: genkit_1.z.array(genkit_1.z.string()),
    availableEquipment: genkit_1.z.array(genkit_1.z.string()).optional().default([]),
    treatmentPhase: genkit_1.z.enum(['initial', 'progressive', 'advanced', 'maintenance']).optional().default('initial'),
    painMap: genkit_1.z.record(genkit_1.z.string(), genkit_1.z.number()).optional(),
    sessionCount: genkit_1.z.number().optional().default(0),
});
var ExerciseRecommendationSchema = genkit_1.z.object({
    exerciseId: genkit_1.z.string().optional(),
    name: genkit_1.z.string(),
    category: genkit_1.z.string(),
    difficulty: genkit_1.z.enum(['beginner', 'intermediate', 'advanced']),
    rationale: genkit_1.z.string(),
    targetArea: genkit_1.z.string(),
    goalsAddressed: genkit_1.z.array(genkit_1.z.string()),
    sets: genkit_1.z.number().optional(),
    reps: genkit_1.z.string().optional(),
    duration: genkit_1.z.number().optional(),
    frequency: genkit_1.z.string().optional(),
    precautions: genkit_1.z.array(genkit_1.z.string()).optional(),
    confidence: genkit_1.z.number().min(0).max(1),
    videoQuery: genkit_1.z.string().optional(),
});
var ExerciseProgramOutputSchema = genkit_1.z.object({
    exercises: genkit_1.z.array(ExerciseRecommendationSchema),
    programRationale: genkit_1.z.string(),
    expectedOutcomes: genkit_1.z.array(genkit_1.z.string()),
    progressionCriteria: genkit_1.z.array(genkit_1.z.string()),
    redFlags: genkit_1.z.array(genkit_1.z.string()).optional(),
    alternatives: genkit_1.z.array(ExerciseRecommendationSchema).optional(),
    estimatedDuration: genkit_1.z.number(),
});
exports.exerciseSuggestionFlow = config_1.ai.defineFlow({
    name: 'exerciseSuggestion',
    inputSchema: ExerciseSuggestionInputSchema,
    outputSchema: ExerciseProgramOutputSchema,
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var goals, availableEquipment, treatmentPhase, painMap, sessionCount, maxPainLevel, prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                goals = input.goals, availableEquipment = input.availableEquipment, treatmentPhase = input.treatmentPhase, painMap = input.painMap, sessionCount = input.sessionCount;
                maxPainLevel = painMap
                    ? Math.max.apply(Math, __spreadArray(__spreadArray([], Object.values(painMap).map(function (v) { return v; }), false), [0], false)) : 0;
                prompt = "Como fisioterapeuta especialista, crie um programa de exerc\u00EDcios personalizado:\n\nOBJETIVOS DO TRATAMENTO:\n".concat(goals.map(function (g, i) { return "".concat(i + 1, ". ").concat(g); }).join('\n'), "\n\nFASE DO TRATAMENTO: ").concat(treatmentPhase, "\nSESS\u00D5ES COMPLETADAS: ").concat(sessionCount, "\nN\u00CDVEL DE DOR ATUAL: ").concat(maxPainLevel, "/10\n").concat(painMap ? "MAPA DE DOR: ".concat(JSON.stringify(painMap)) : '', "\n\nEQUIPAMENTOS DISPON\u00CDVEIS:\n").concat(availableEquipment && availableEquipment.length > 0 ? availableEquipment.join(', ') : 'Apenas peso corporal', "\n\nDIRETRIZES:\n1. Adapte a dificuldade \u00E0 fase do tratamento\n2. Se dor > 7, priorize exerc\u00EDcios de baixo impacto\n3. Use apenas equipamentos dispon\u00EDveis\n4. Inclua progress\u00F5es claras\n5. Forne\u00E7a precau\u00E7\u00F5es de seguran\u00E7a\n6. Gere 5-8 exerc\u00EDcios complementares\n7. Para videoQuery, use termos em portugu\u00EAs ou ingl\u00EAs para busca no YouTube\n\nFASES:\n- initial: Exerc\u00EDcios suaves, foco em mobilidade e controle motor\n- progressive: Aumentar carga e complexidade gradualmente\n- advanced: Exerc\u00EDcios funcionais e espec\u00EDficos do esporte/atividade\n- maintenance: Manuten\u00E7\u00E3o de ganhos e preven\u00E7\u00E3o\n\nRetorne um programa estruturado em JSON.");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        config: {
                            temperature: 0.5,
                            maxOutputTokens: 3000,
                        },
                        output: {
                            format: 'json',
                            schema: ExerciseProgramOutputSchema,
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to generate exercise suggestions');
                }
                return [2 /*return*/, output];
        }
    });
}); });
exports.exerciseProgressionFlow = config_1.ai.defineFlow({
    name: 'exerciseProgression',
    inputSchema: genkit_1.z.object({
        currentExercise: genkit_1.z.object({
            name: genkit_1.z.string(),
            sets: genkit_1.z.number(),
            reps: genkit_1.z.string(),
            difficulty: genkit_1.z.enum(['beginner', 'intermediate', 'advanced']),
        }),
        patientProgress: genkit_1.z.object({
            painReduction: genkit_1.z.number().min(0).max(10),
            strengthGain: genkit_1.z.enum(['none', 'minimal', 'moderate', 'significant']),
            functionalImprovement: genkit_1.z.enum(['none', 'minimal', 'moderate', 'significant']),
        }),
    }),
    outputSchema: genkit_1.z.object({
        shouldProgress: genkit_1.z.boolean(),
        progressionOptions: genkit_1.z.array(genkit_1.z.object({
            name: genkit_1.z.string(),
            rationale: genkit_1.z.string(),
            sets: genkit_1.z.number(),
            reps: genkit_1.z.string(),
            difficulty: genkit_1.z.enum(['beginner', 'intermediate', 'advanced']),
            videoQuery: genkit_1.z.string(),
        })),
        maintenanceOption: genkit_1.z.object({
            recommendation: genkit_1.z.string(),
            adjustments: genkit_1.z.array(genkit_1.z.string()),
        }),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prompt = "Como fisioterapeuta, avalie se o paciente est\u00E1 pronto para progress\u00E3o:\n\nEXERC\u00CDCIO ATUAL:\n- Nome: ".concat(input.currentExercise.name, "\n- S\u00E9ries: ").concat(input.currentExercise.sets, "\n- Repeti\u00E7\u00F5es: ").concat(input.currentExercise.reps, "\n- Dificuldade: ").concat(input.currentExercise.difficulty, "\n\nPROGRESSO DO PACIENTE:\n- Redu\u00E7\u00E3o de dor: ").concat(input.patientProgress.painReduction, "/10\n- Ganho de for\u00E7a: ").concat(input.patientProgress.strengthGain, "\n- Melhora funcional: ").concat(input.patientProgress.functionalImprovement, "\n\nTAREFA:\n1. Determine se o paciente deve progredir\n2. Se sim, sugira 2-3 op\u00E7\u00F5es de progress\u00E3o\n3. Forne\u00E7a tamb\u00E9m uma op\u00E7\u00E3o de manuten\u00E7\u00E3o\n\nRetorne an\u00E1lise estruturada em JSON.");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        config: {
                            temperature: 0.4,
                            maxOutputTokens: 1500,
                        },
                        output: {
                            format: 'json',
                            schema: genkit_1.z.object({
                                shouldProgress: genkit_1.z.boolean(),
                                progressionOptions: genkit_1.z.array(genkit_1.z.object({
                                    name: genkit_1.z.string(),
                                    rationale: genkit_1.z.string(),
                                    sets: genkit_1.z.number(),
                                    reps: genkit_1.z.string(),
                                    difficulty: genkit_1.z.enum(['beginner', 'intermediate', 'advanced']),
                                    videoQuery: genkit_1.z.string(),
                                })),
                                maintenanceOption: genkit_1.z.object({
                                    recommendation: genkit_1.z.string(),
                                    adjustments: genkit_1.z.array(genkit_1.z.string()),
                                }),
                            }),
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Failed to generate progression recommendations');
                }
                return [2 /*return*/, output];
        }
    });
}); });
