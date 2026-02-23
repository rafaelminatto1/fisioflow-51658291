"use strict";
/**
 * Cloud Function: Exercise Suggestion
 *
 * Provides AI-powered exercise recommendations based on patient profile,
 * clinical notes, and treatment goals using Gemini Flash-Lite for cost efficiency.
 *
 * @route ai/exerciseSuggestion
 * @method onCall
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
exports.exerciseSuggestion = exports.exerciseSuggestionHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger = require("firebase-functions/logger");
var idempotency_1 = require("../lib/idempotency");
var firestore = admin.firestore();
// Firebase Functions v2 CORS - explicitly list allowed origins
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================
var RATE_LIMITS = {
    maxRequestsPerHour: 20,
    maxRequestsPerDay: 100,
};
// ============================================================================
// AI CLIENT CACHE
// ============================================================================
var cachedVertexAI = null;
function getVertexAI() {
    return __awaiter(this, void 0, void 0, function () {
        var VertexAI;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!cachedVertexAI) return [3 /*break*/, 2];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@google-cloud/vertexai'); })];
                case 1:
                    VertexAI = (_a.sent()).VertexAI;
                    cachedVertexAI = new VertexAI({
                        project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
                    });
                    _a.label = 2;
                case 2: return [2 /*return*/, cachedVertexAI];
            }
        });
    });
}
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var exerciseSuggestionHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, userId, auth, rateLimitStatus, data, patientDoc, patient, soapSnapshot, soapHistory, age, context_1, cacheParams, aiResult, duration, error_1, duration;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                startTime = Date.now();
                // Authentication check
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentication required');
                }
                userId = request.auth.uid;
                auth = request.auth;
                return [4 /*yield*/, checkRateLimit(userId)];
            case 1:
                rateLimitStatus = _a.sent();
                if (rateLimitStatus.isLimited) {
                    logger.warn("[ExerciseSuggestion] Rate limit exceeded for user ".concat(userId));
                    throw new https_1.HttpsError('resource-exhausted', "Rate limit exceeded. Try again later.", {
                        resetAt: rateLimitStatus.resetAt.toISOString(),
                        remaining: rateLimitStatus.remaining,
                    });
                }
                data = request.data;
                if (!data.patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId is required');
                }
                if (!data.goals || data.goals.length === 0) {
                    throw new https_1.HttpsError('invalid-argument', 'goals array is required');
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 7, , 9]);
                logger.info("[ExerciseSuggestion] Processing request for patient ".concat(data.patientId));
                return [4 /*yield*/, firestore
                        .collection('patients')
                        .doc(data.patientId)
                        .get()];
            case 3:
                patientDoc = _a.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Patient not found');
                }
                patient = patientDoc.data();
                // Verify user has access to this patient
                if ((patient === null || patient === void 0 ? void 0 : patient.organization_id) !== auth.token.organization_id) {
                    throw new https_1.HttpsError('permission-denied', 'Access denied to this patient');
                }
                return [4 /*yield*/, firestore
                        .collection('patients')
                        .doc(data.patientId)
                        .collection('soap_records')
                        .orderBy('createdAt', 'desc')
                        .limit(5)
                        .get()];
            case 4:
                soapSnapshot = _a.sent();
                soapHistory = soapSnapshot.docs.map(function (doc) { return doc.data(); });
                age = calculateAge(patient.birth_date);
                context_1 = {
                    patient: {
                        id: patient.id,
                        name: patient.name,
                        age: age,
                        gender: patient.gender,
                        mainCondition: patient.main_condition,
                    },
                    soapHistory: soapHistory.map(function (soap) { return ({
                        sessionNumber: soap.session_number,
                        subjective: soap.subjective,
                        objective: soap.objective,
                        assessment: soap.assessment,
                        plan: soap.plan,
                    }); }),
                    painMap: data.painMap || {},
                    goals: data.goals,
                    availableEquipment: data.availableEquipment,
                    treatmentPhase: data.treatmentPhase || determineTreatmentPhase(soapHistory.length),
                    sessionCount: soapHistory.length,
                };
                cacheParams = {
                    patientId: data.patientId,
                    goals: data.goals,
                    availableEquipment: data.availableEquipment,
                    treatmentPhase: data.treatmentPhase,
                    painMap: data.painMap,
                    sessionCount: context_1.sessionCount,
                };
                return [4 /*yield*/, (0, idempotency_1.withIdempotency)('EXERCISE_RECOMMENDATION', userId, cacheParams, function () { return generateExerciseSuggestions(context_1); }, { cacheTtl: 5 * 60 * 1000 } // 5 minute cache
                    )];
            case 5:
                aiResult = _a.sent();
                if (!aiResult.success) {
                    throw new https_1.HttpsError('internal', aiResult.error || 'AI generation failed');
                }
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'EXERCISE_RECOMMENDATION',
                        model: 'gemini-2.5-flash-lite',
                        inputTokens: aiResult.usage.promptTokens,
                        outputTokens: aiResult.usage.completionTokens,
                        duration: duration,
                        success: true,
                    })];
            case 6:
                _a.sent();
                return [2 /*return*/, {
                        success: true,
                        data: aiResult.data,
                        usage: aiResult.usage,
                    }];
            case 7:
                error_1 = _a.sent();
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'EXERCISE_RECOMMENDATION',
                        model: 'gemini-2.5-flash-lite',
                        inputTokens: 0,
                        outputTokens: 0,
                        duration: duration,
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    })];
            case 8:
                _a.sent();
                if (error_1 instanceof https_1.HttpsError) {
                    throw error_1;
                }
                logger.error('[ExerciseSuggestion] Error:', error_1);
                throw new https_1.HttpsError('internal', error_1 instanceof Error ? error_1.message : 'Failed to generate exercise suggestions');
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.exerciseSuggestionHandler = exerciseSuggestionHandler;
exports.exerciseSuggestion = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 300, // 5 minutes for AI generation
}, exports.exerciseSuggestionHandler);
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate exercise suggestions using Gemini Flash-Lite
 */
function generateExerciseSuggestions(context) {
    return __awaiter(this, void 0, void 0, function () {
        var vertexAI, generativeModel, prompt_1, systemInstruction, result, candidates, responseText, cleanedJson, exerciseData, promptTokens, completionTokens, estimatedCost, error_2;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, getVertexAI()];
                case 1:
                    vertexAI = _e.sent();
                    generativeModel = vertexAI.getGenerativeModel({
                        model: 'gemini-2.5-flash-lite',
                    });
                    prompt_1 = buildExercisePrompt(context);
                    systemInstruction = "You are an expert physical therapist AI assistant specializing in exercise prescription for Brazilian patients.\n\nRecommend 3-10 appropriate exercises based on the patient's profile, considering:\n- Current pain presentation\n- Treatment goals\n- Available equipment\n- Treatment phase\n- Clinical history\n\nFor each exercise, provide:\n- Name and category\n- Difficulty level\n- Clinical rationale\n- Target area\n- Goals addressed\n- Sets, reps, duration\n- Progression criteria\n- Precautions if needed\n\nReturn ONLY valid JSON matching this structure:\n{\n  \"exercises\": [...],\n  \"programRationale\": \"...\",\n  \"expectedOutcomes\": [\"...\", \"...\"],\n  \"progressionCriteria\": [\"...\", \"...\"],\n  \"redFlags\": [\"...\", \"...\"],\n  \"alternatives\": [{ \"name\": \"...\", \"rationale\": \"...\" }],\n  \"estimatedDuration\": minutes\n}";
                    return [4 /*yield*/, generativeModel.generateContent({
                            contents: [{ role: 'user', parts: [{ text: prompt_1 }] }],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 4096,
                            },
                            systemInstruction: {
                                role: 'system',
                                parts: [{ text: systemInstruction }],
                            },
                        })];
                case 2:
                    result = _e.sent();
                    candidates = (_a = result.response) === null || _a === void 0 ? void 0 : _a.candidates;
                    responseText = candidates && ((_d = (_c = (_b = candidates[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts[0]) === null || _d === void 0 ? void 0 : _d.text)
                        ? candidates[0].content.parts[0].text
                        : '';
                    if (!responseText) {
                        throw new https_1.HttpsError('internal', 'Failed to get AI response');
                    }
                    cleanedJson = cleanJsonResponse(responseText);
                    exerciseData = JSON.parse(cleanedJson);
                    promptTokens = Math.ceil(prompt_1.length / 4);
                    completionTokens = Math.ceil(responseText.length / 4);
                    estimatedCost = (promptTokens / 1000000) * 0.075 +
                        (completionTokens / 1000000) * 0.15;
                    return [2 /*return*/, {
                            success: true,
                            data: exerciseData,
                            usage: {
                                promptTokens: promptTokens,
                                completionTokens: completionTokens,
                                totalTokens: promptTokens + completionTokens,
                                estimatedCost: estimatedCost,
                            },
                        }];
                case 3:
                    error_2 = _e.sent();
                    logger.error('[ExerciseSuggestion] AI generation error:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'AI generation failed',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Build exercise recommendation prompt
 */
function buildExercisePrompt(context) {
    var patient = context.patient, soapHistory = context.soapHistory, painMap = context.painMap, goals = context.goals, availableEquipment = context.availableEquipment, treatmentPhase = context.treatmentPhase, sessionCount = context.sessionCount;
    // Format pain map
    var painMapText = Object.entries(painMap || {})
        .filter(function (_a) {
        var _ = _a[0], intensity = _a[1];
        return intensity > 0;
    })
        .map(function (_a) {
        var area = _a[0], intensity = _a[1];
        return "".concat(area, ": ").concat(intensity, "/10");
    })
        .join(', ') || 'No pain reported';
    // Format recent SOAP notes
    var recentSOAP = (soapHistory || []).slice(-3).map(function (soap) { return "\nSess\u00E3o ".concat(soap.sessionNumber, ":\n- Queixa: ").concat(soap.subjective || 'N/A', "\n- Avalia\u00E7\u00E3o: ").concat(soap.assessment || 'N/A', "\n- Plano: ").concat(typeof soap.plan === 'object' ? JSON.stringify(soap.plan) : soap.plan || 'N/A', "\n"); }).join('\n');
    return "\n## Perfil do Paciente\n\n**Dados Demogr\u00E1ficos:**\n- Nome: ".concat(patient.name, "\n- Idade: ").concat(patient.age, " anos\n- G\u00EAnero: ").concat(patient.gender, "\n- Condi\u00E7\u00E3o Principal: ").concat(patient.mainCondition, "\n\n**Apresenta\u00E7\u00E3o Atual de Dor:**\n").concat(painMapText, "\n\n**Hist\u00F3rico Cl\u00EDnico Recente:**\n").concat(recentSOAP || 'Sem histórico disponível', "\n\n**Objetivos do Tratamento:**\n").concat(goals.map(function (g) { return "- ".concat(g); }).join('\n'), "\n\n**Contexto do Tratamento:**\n- Fase Atual: ").concat(treatmentPhase, "\n- N\u00FAmero de Sess\u00F5es: ").concat(sessionCount, "\n- Equipamentos Dispon\u00EDveis: ").concat((availableEquipment === null || availableEquipment === void 0 ? void 0 : availableEquipment.join(', ')) || 'Nenhum / Equipamento básico', "\n\n## Solicita\u00E7\u00E3o\n\nRecomende um programa de exerc\u00EDcios apropriado que:\n1. Direcione as \u00E1reas de dor identificadas\n2. Considere as limita\u00E7\u00F5es do hist\u00F3rico cl\u00EDnico\n3. Ajude a alcan\u00E7ar os objetivos estabelecidos\n4. Use equipamentos dispon\u00EDveis ou nenhum equipamento\n5. Seja apropriado para a fase de tratamento atual\n6. Inclua crit\u00E9rios de progress\u00E3o clara\n\nRetorne APENAS JSON v\u00E1lido sem blocos de c\u00F3digo markdown.");
}
/**
 * Calculate patient age from birth date
 */
function calculateAge(birthDate) {
    var birth = new Date(birthDate);
    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    var monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}
/**
 * Determine treatment phase from session count
 */
function determineTreatmentPhase(sessionCount) {
    if (sessionCount <= 3)
        return 'initial';
    if (sessionCount <= 8)
        return 'progressive';
    if (sessionCount <= 15)
        return 'advanced';
    return 'maintenance';
}
/**
 * Clean JSON response by removing markdown code blocks
 */
function cleanJsonResponse(response) {
    var cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    return cleaned.trim();
}
/**
 * Check rate limit for user
 */
function checkRateLimit(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var now, hourAgo, dayAgo, hourSnapshot, hourCount, daySnapshot, dayCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = new Date();
                    hourAgo = new Date(now.getTime() - 3600000);
                    dayAgo = new Date(now.getTime() - 86400000);
                    return [4 /*yield*/, firestore
                            .collection('ai_usage_records')
                            .where('userId', '==', userId)
                            .where('feature', '==', 'EXERCISE_RECOMMENDATION')
                            .where('timestamp', '>=', hourAgo)
                            .get()];
                case 1:
                    hourSnapshot = _a.sent();
                    hourCount = hourSnapshot.size;
                    if (hourCount >= RATE_LIMITS.maxRequestsPerHour) {
                        return [2 /*return*/, {
                                isLimited: true,
                                remaining: 0,
                                limit: RATE_LIMITS.maxRequestsPerHour,
                                resetAt: new Date(hourAgo.getTime() + 3600000),
                                currentCount: hourCount,
                            }];
                    }
                    return [4 /*yield*/, firestore
                            .collection('ai_usage_records')
                            .where('userId', '==', userId)
                            .where('feature', '==', 'EXERCISE_RECOMMENDATION')
                            .where('timestamp', '>=', dayAgo)
                            .get()];
                case 2:
                    daySnapshot = _a.sent();
                    dayCount = daySnapshot.size;
                    return [2 /*return*/, {
                            isLimited: dayCount >= RATE_LIMITS.maxRequestsPerDay,
                            remaining: Math.max(0, RATE_LIMITS.maxRequestsPerDay - dayCount),
                            limit: RATE_LIMITS.maxRequestsPerDay,
                            resetAt: new Date(dayAgo.getTime() + 86400000),
                            currentCount: dayCount,
                        }];
            }
        });
    });
}
/**
 * Record AI usage
 */
function recordUsage(data) {
    return __awaiter(this, void 0, void 0, function () {
        var id, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    id = "usage_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
                    return [4 /*yield*/, firestore
                            .collection('ai_usage_records')
                            .doc(id)
                            .set({
                            id: id,
                            userId: data.userId,
                            feature: data.feature,
                            model: data.model,
                            inputTokens: data.inputTokens,
                            outputTokens: data.outputTokens,
                            totalTokens: data.inputTokens + data.outputTokens,
                            duration: data.duration,
                            success: data.success,
                            error: data.error,
                            timestamp: new Date().toISOString(),
                        })];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    logger.error('[ExerciseSuggestion] Failed to record usage:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
