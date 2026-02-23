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
exports.analyzeMovementVideo = exports.analyzeMovementVideoHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var config_1 = require("../ai/config");
var genkit_1 = require("genkit");
var function_config_1 = require("../lib/function-config");
/**
 * Cloud Function para análise de vídeo de movimento usando Gemini 1.5 Pro.
 * Recebe a URL de um vídeo no Cloud Storage e retorna análise biomecânica.
 */
var analyzeMovementVideoHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, videoUrl, exerciseName, promptText, response, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, videoUrl = _a.videoUrl, exerciseName = _a.exerciseName;
                if (!videoUrl) {
                    throw new Error('videoUrl é obrigatório');
                }
                promptText = "\n    Voc\u00EA \u00E9 um especialista em biomec\u00E2nica e fisioterapia.\n    Analise este v\u00EDdeo do exerc\u00EDcio \"".concat(exerciseName || 'movimento corporal', "\".\n    \n    Forne\u00E7a um relat\u00F3rio estruturado contendo:\n    1. Contagem de repeti\u00E7\u00F5es (se aplic\u00E1vel).\n    2. Qualidade da execu\u00E7\u00E3o (0 a 10).\n    3. Principais erros biomec\u00E2nicos observados (ex: valgo din\u00E2mico, perda de lordose).\n    4. Sugest\u00F5es de corre\u00E7\u00E3o para o paciente.\n\n    Se o v\u00EDdeo n\u00E3o mostrar um exerc\u00EDcio claro, informe isso.\n  ");
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Pro,
                        prompt: [
                            { text: promptText },
                            { media: { url: videoUrl, contentType: 'video/mp4' } }
                        ],
                        output: {
                            schema: genkit_1.z.object({
                                reps: genkit_1.z.number().describe("Número de repetições contadas"),
                                score: genkit_1.z.number().min(0).max(10).describe("Nota de qualidade técnica de 0 a 10"),
                                errors: genkit_1.z.array(genkit_1.z.string()).describe("Lista de erros biomecânicos identificados"),
                                feedback: genkit_1.z.string().describe("Feedback construtivo e direto para o paciente"),
                                isValidExercise: genkit_1.z.boolean().describe("Se foi possível identificar um exercício válido no vídeo")
                            })
                        }
                    })];
            case 2:
                response = _b.sent();
                return [2 /*return*/, {
                        success: true,
                        analysis: response.output
                    }];
            case 3:
                error_1 = _b.sent();
                console.error("Erro na análise de vídeo:", error_1);
                throw new Error("Falha na an\u00E1lise de v\u00EDdeo: ".concat(error_1.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.analyzeMovementVideoHandler = analyzeMovementVideoHandler;
exports.analyzeMovementVideo = (0, https_1.onCall)(function_config_1.AI_FUNCTION, exports.analyzeMovementVideoHandler);
