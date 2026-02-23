"use strict";
/**
 * Patient Progress Analysis Flow (Genkit)
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
exports.analyzePatientProgressFlow = void 0;
var genkit_1 = require("genkit");
var config_1 = require("../config");
/**
 * Analysis flow to determine if patient is progressing well
 */
exports.analyzePatientProgressFlow = config_1.ai.defineFlow({
    name: 'analyzePatientProgress',
    inputSchema: genkit_1.z.object({
        patientName: genkit_1.z.string(),
        diagnosis: genkit_1.z.string(),
        lastEvolutions: genkit_1.z.array(genkit_1.z.string()), // Last 3 evolutions
        goals: genkit_1.z.array(genkit_1.z.string()), // Patient goals
    }),
    outputSchema: genkit_1.z.object({
        status: genkit_1.z.enum(['evoluindo', 'estagnado', 'regredindo']),
        reasoning: genkit_1.z.string(),
        suggestion: genkit_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prompt = "\n      Atue como um Supervisor Cl\u00EDnico de Fisioterapia.\n      \n      Paciente: ".concat(input.patientName, "\n      Diagn\u00F3stico: ").concat(input.diagnosis, "\n      Metas: ").concat(input.goals.join(', '), "\n      \n      \u00DAltimas Evolu\u00E7\u00F5es (da mais antiga para a mais recente):\n      ").concat(input.lastEvolutions.map(function (e, i) { return "".concat(i + 1, ". ").concat(e); }).join('\n'), "\n      \n      Analise se o paciente est\u00E1 progredindo em dire\u00E7\u00E3o \u00E0s metas.\n      Seja cr\u00EDtico. Identifique estagna\u00E7\u00E3o.\n      \n      Retorne um JSON com:\n      - status: 'evoluindo' | 'estagnado' | 'regredindo'\n      - reasoning: explica\u00E7\u00E3o detalhada\n      - suggestion: sugest\u00E3o cl\u00EDnica para a pr\u00F3xima sess\u00E3o\n    ");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        output: {
                            format: 'json',
                            schema: genkit_1.z.object({
                                status: genkit_1.z.enum(['evoluindo', 'estagnado', 'regredindo']),
                                reasoning: genkit_1.z.string(),
                                suggestion: genkit_1.z.string(),
                            }),
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output) {
                    throw new Error('Falha ao gerar análise de IA');
                }
                return [2 /*return*/, output];
        }
    });
}); });
