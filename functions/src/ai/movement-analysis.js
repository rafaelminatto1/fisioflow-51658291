"use strict";
/**
 * Cloud Function: Movement Analysis
 *
 * Analyzes exercise movement from video using Gemini Pro's multimodal
 * capabilities to compare patient form against demo videos and provide
 * quality scoring with feedback.
 *
 * @route ai/movementAnalysis
 * @method onCall
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
exports.movementAnalysis = exports.movementAnalysisHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger = require("firebase-functions/logger");
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
    maxRequestsPerHour: 10,
    maxRequestsPerDay: 50,
};
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var movementAnalysisHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, userId, auth, rateLimitStatus, data, patientDoc, patient, demoVideoUrl, aiResult, duration, error_1, duration;
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
                    logger.warn("[MovementAnalysis] Rate limit exceeded for user ".concat(userId));
                    throw new https_1.HttpsError('resource-exhausted', "Rate limit exceeded. Video processing is resource-intensive.", {
                        resetAt: rateLimitStatus.resetAt.toISOString(),
                        remaining: rateLimitStatus.remaining,
                    });
                }
                data = request.data;
                if (!data.patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId is required');
                }
                if (!data.exerciseId) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseId is required');
                }
                if (!data.exerciseName) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseName is required');
                }
                if (!data.patientVideoUrl) {
                    throw new https_1.HttpsError('invalid-argument', 'patientVideoUrl is required');
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 9, , 11]);
                logger.info("[MovementAnalysis] Processing request for exercise ".concat(data.exerciseId));
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
                demoVideoUrl = data.demoVideoUrl;
                if (!!demoVideoUrl) return [3 /*break*/, 5];
                return [4 /*yield*/, getDefaultDemoVideo(data.exerciseId)];
            case 4:
                demoVideoUrl = _a.sent();
                _a.label = 5;
            case 5: return [4 /*yield*/, analyzeMovement(__assign(__assign({}, data), { demoVideoUrl: demoVideoUrl }))];
            case 6:
                aiResult = _a.sent();
                if (!aiResult.success) {
                    throw new https_1.HttpsError('internal', aiResult.error || 'Movement analysis failed');
                }
                // Save analysis result to Firestore
                return [4 /*yield*/, saveAnalysisResult(__assign(__assign({}, aiResult.data), { analysisDate: new Date().toISOString(), processingTime: Date.now() - startTime }))];
            case 7:
                // Save analysis result to Firestore
                _a.sent();
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'PROGRESS_ANALYSIS',
                        model: 'gemini-2.5-pro',
                        inputTokens: aiResult.usage.promptTokens,
                        outputTokens: aiResult.usage.completionTokens,
                        duration: duration,
                        success: true,
                    })];
            case 8:
                _a.sent();
                return [2 /*return*/, {
                        success: true,
                        data: aiResult.data,
                        usage: aiResult.usage,
                    }];
            case 9:
                error_1 = _a.sent();
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'PROGRESS_ANALYSIS',
                        model: 'gemini-2.5-pro',
                        inputTokens: 0,
                        outputTokens: 0,
                        duration: duration,
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    })];
            case 10:
                _a.sent();
                if (error_1 instanceof https_1.HttpsError) {
                    throw error_1;
                }
                logger.error('[MovementAnalysis] Error:', error_1);
                throw new https_1.HttpsError('internal', error_1 instanceof Error ? error_1.message : 'Failed to analyze movement');
            case 11: return [2 /*return*/];
        }
    });
}); };
exports.movementAnalysisHandler = movementAnalysisHandler;
exports.movementAnalysis = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '2GiB',
    cpu: 1,
    maxInstances: 1,
}, exports.movementAnalysisHandler);
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Analyze movement using Gemini Pro's multimodal capabilities
 */
function analyzeMovement(options) {
    return __awaiter(this, void 0, void 0, function () {
        var VertexAI, vertexAI, generativeModel, language, labels, prompt_1, videoInputs, result, candidates, responseText, cleanedJson, analysisData, patientVideoDuration, responseData, promptTokens, completionTokens, estimatedCost, error_2;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    _m.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@google-cloud/vertexai'); })];
                case 1:
                    VertexAI = (_m.sent()).VertexAI;
                    vertexAI = new VertexAI({
                        project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
                    });
                    generativeModel = vertexAI.getGenerativeModel({
                        model: 'gemini-2.5-pro',
                    });
                    language = options.language || 'pt-BR';
                    labels = language === 'pt-BR' ? {
                        posture: 'Postura',
                        rom: 'Amplitude de Movimento',
                        control: 'Controle Motor',
                        tempo: 'Tempo e Cadência',
                        breathing: 'Respiração',
                        summary: 'Resumo da Análise',
                        strengths: 'Pontos Fortes',
                        improvements: 'Pontos de Melhoria',
                        progression: 'Progressão Sugerida'
                    } : {
                        posture: 'Posture',
                        rom: 'Range of Motion',
                        control: 'Motor Control',
                        tempo: 'Tempo and Cadence',
                        breathing: 'Breathing',
                        summary: 'Analysis Summary',
                        strengths: 'Strengths',
                        improvements: 'Areas for Improvement',
                        progression: 'Suggested Progression'
                    };
                    prompt_1 = buildAnalysisPrompt(options, labels, language);
                    videoInputs = [
                        {
                            fileData: {
                                mimeType: 'video/*',
                                fileUri: options.patientVideoUrl,
                            },
                        },
                    ];
                    // Add demo video if available
                    if (options.demoVideoUrl) {
                        videoInputs.unshift({
                            fileData: {
                                mimeType: 'video/*',
                                fileUri: options.demoVideoUrl,
                            },
                        });
                    }
                    return [4 /*yield*/, generativeModel.generateContent({
                            contents: [{
                                    role: 'user',
                                    parts: [
                                        { inlineData: { mimeType: 'video/*', data: 'VIDEO_DATA_PLACEHOLDER' } },
                                        { text: prompt_1 }
                                    ]
                                }],
                            generationConfig: {
                                temperature: 0.3,
                                maxOutputTokens: 8192,
                            },
                            systemInstruction: "You are an expert biomechanics and physical therapy specialist analyzing exercise form.\n\nCompare patient's exercise execution against proper form and provide:\n1. Quality scores (0-100) for: overall, posture, ROM, control, tempo, breathing\n2. Specific deviations with timestamps, severity, body part, and corrections\n3. Safety concerns with type, severity, and recommendations\n4. Repetition count\n5. Summary, strengths, improvements, and progression suggestions\n\nReturn ONLY valid JSON matching the provided structure.",
                        })];
                case 2:
                    result = _m.sent();
                    candidates = (_a = result.response) === null || _a === void 0 ? void 0 : _a.candidates;
                    if (!candidates || candidates.length === 0) {
                        throw new Error('No response candidates from AI model');
                    }
                    responseText = (_e = (_d = (_c = (_b = candidates[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                    if (!responseText) {
                        throw new Error('No text in AI response');
                    }
                    cleanedJson = cleanJsonResponse(responseText);
                    analysisData = JSON.parse(cleanedJson);
                    patientVideoDuration = analysisData.duration || 0;
                    responseData = {
                        exerciseId: options.exerciseId,
                        exerciseName: options.exerciseName,
                        patientId: options.patientId,
                        analysisDate: new Date().toISOString(),
                        demoVideoUrl: options.demoVideoUrl,
                        patientVideoUrl: options.patientVideoUrl,
                        patientVideoDuration: patientVideoDuration,
                        formQuality: {
                            overall: ((_f = analysisData.formQuality) === null || _f === void 0 ? void 0 : _f.overall) || 0,
                            posture: ((_g = analysisData.formQuality) === null || _g === void 0 ? void 0 : _g.posture) || 0,
                            rangeOfMotion: ((_h = analysisData.formQuality) === null || _h === void 0 ? void 0 : _h.rangeOfMotion) || 0,
                            control: ((_j = analysisData.formQuality) === null || _j === void 0 ? void 0 : _j.control) || 0,
                            tempo: ((_k = analysisData.formQuality) === null || _k === void 0 ? void 0 : _k.tempo) || 0,
                            breathing: ((_l = analysisData.formQuality) === null || _l === void 0 ? void 0 : _l.breathing) || 0,
                        },
                        deviations: analysisData.deviations || [],
                        safetyConcerns: analysisData.safetyConcerns || [],
                        repetitions: analysisData.repetitions || 0,
                        summary: analysisData.summary || '',
                        strengths: analysisData.strengths || [],
                        improvements: analysisData.improvements || [],
                        progression: analysisData.progression || '',
                        modelUsed: 'gemini-2.5-pro',
                        confidence: analysisData.confidence || 0.8,
                        processingTime: 0, // Will be set when saving
                    };
                    promptTokens = Math.ceil(prompt_1.length / 4) + 1000;
                    completionTokens = Math.ceil(responseText.length / 4);
                    estimatedCost = (promptTokens / 1000000) * 1.25 +
                        (completionTokens / 1000000) * 5.00;
                    return [2 /*return*/, {
                            success: true,
                            data: responseData,
                            usage: {
                                promptTokens: promptTokens,
                                completionTokens: completionTokens,
                                totalTokens: promptTokens + completionTokens,
                                estimatedCost: estimatedCost,
                            },
                        }];
                case 3:
                    error_2 = _m.sent();
                    logger.error('[MovementAnalysis] AI analysis error:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'Movement analysis failed',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Build movement analysis prompt
 */
function buildAnalysisPrompt(options, labels, language) {
    var demoVideoText = options.demoVideoUrl
        ? "V\u00CDDEO DEMO (forma correta): ".concat(options.demoVideoUrl, "\n")
        : '';
    var focusAreasText = options.focusAreas
        ? "\u00C1REAS DE FOCO ESPECIAIS:\n".concat(options.focusAreas.map(function (area) { return "- ".concat(area); }).join('\n'), "\n")
        : '';
    if (language === 'pt-BR') {
        return "\nEXERC\u00CDCIO: ".concat(options.exerciseName, "\nREPETI\u00C7\u00D5ES ESPERADAS: ").concat(options.expectedReps || 'não especificado', "\n\n").concat(demoVideoText, "V\u00CDDEO DO PACIENTE (para an\u00E1lise): ").concat(options.patientVideoUrl, "\n\n").concat(focusAreasText, "\nTASK: Analise o v\u00EDdeo do paciente comparando com o demo e forne\u00E7a:\n\n1. PONTUA\u00C7\u00C3O DE QUALIDADE (0-100 para cada aspecto):\n   - Postura: alinhamento corporal geral\n   - Amplitude de Movimento: completude do movimento\n   - Controle Motor: estabilidade e controle muscular\n   - Tempo e Cad\u00EAncia: ritmo apropriado\n   - Respira\u00E7\u00E3o: coordena\u00E7\u00E3o respirat\u00F3ria\n\n2. DESVIOS IDENTIFICADOS (lista com timestamps em segundos):\n   - Timestamp espec\u00EDfico\n   - Problema detectado\n   - Severidade (low/medium/high/critical)\n   - Parte do corpo afetada\n   - Corre\u00E7\u00E3o sugerida\n\n3. PREOCUPA\u00C7\u00D5ES DE SEGURAN\u00C7A (se houver):\n   - Tipo: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator\n   - Severidade: warning ou danger\n   - Descri\u00E7\u00E3o detalhada\n   - Timestamp\n   - Recomenda\u00E7\u00E3o imediata\n\n4. CONTAGEM DE REPETI\u00C7\u00D5ES REALIZADAS\n\n5. FEEDBACK COMPLETO:\n   - ").concat(labels.summary, ": an\u00E1lise geral em 2-3 frases\n   - ").concat(labels.strengths, ": 3-5 pontos que o paciente fez bem\n   - ").concat(labels.improvements, ": 3-5 \u00E1reas para trabalhar\n   - ").concat(labels.progression, ": pr\u00F3xima progress\u00E3o ou regress\u00E3o adequada\n\nIMPORTANTE:\n- Seja espec\u00EDfico com timestamps (ex: \"00:15\", \"01:30\")\n- Priorize alertas de seguran\u00E7a acima de tudo\n- Use linguagem clara e encorajadora\n- Forne\u00E7a corre\u00E7\u00F5es acion\u00E1veis\n\nResponda em JSON v\u00E1lido com esta estrutura:\n{\n  \"formQuality\": {\n    \"overall\": number,\n    \"posture\": number,\n    \"rangeOfMotion\": number,\n    \"control\": number,\n    \"tempo\": number,\n    \"breathing\": number\n  },\n  \"deviations\": [{\n    \"timestamp\": number,\n    \"issue\": string,\n    \"severity\": \"low\"|\"medium\"|\"high\"|\"critical\",\n    \"bodyPart\": string,\n    \"correction\": string\n  }],\n  \"safetyConcerns\": [{\n    \"type\": string,\n    \"severity\": \"warning\"|\"danger\",\n    \"description\": string,\n    \"timestamp\": number,\n    \"recommendation\": string\n  }],\n  \"repetitions\": number,\n  \"summary\": string,\n  \"strengths\": string[],\n  \"improvements\": string[],\n  \"progression\": string,\n  \"confidence\": number\n}\n");
    }
    // English version
    return "\nEXERCISE: ".concat(options.exerciseName, "\nExpected reps: ").concat(options.expectedReps || 'not specified', "\n\n").concat(demoVideoText, "PATIENT VIDEO (to analyze): ").concat(options.patientVideoUrl, "\n\n").concat(focusAreasText, "\nTASK: Analyze the patient's video comparing with the demo and provide:\n\n1. QUALITY SCORES (0-100 for each aspect):\n   - Posture: overall body alignment\n   - Range of Motion: movement completeness\n   - Motor Control: stability and muscular control\n   - Tempo and Cadence: appropriate rhythm\n   - Breathing: breathing coordination\n\n2. IDENTIFIED DEVIATIONS (list with timestamps in seconds):\n   - Specific timestamp\n   - Problem detected\n   - Severity (low/medium/high/critical)\n   - Body part affected\n   - Suggested correction\n\n3. SAFETY CONCERNS (if any):\n   - Type: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator\n   - Severity: warning or danger\n   - Detailed description\n   - Timestamp\n   - Immediate recommendation\n\n4. REPETITION COUNT PERFORMED\n\n5. COMPLETE FEEDBACK:\n   - ").concat(labels.summary, ": general analysis in 2-3 sentences\n   - ").concat(labels.strengths, ": 3-5 things patient did well\n   - ").concat(labels.improvements, ": 3-5 areas to work on\n   - ").concat(labels.progression, ": appropriate next progression or regression\n\nIMPORTANT:\n- Be specific with timestamps (ex: \"00:15\", \"01:30\")\n- Prioritize safety alerts above all\n- Use clear, encouraging language\n- Provide actionable corrections\n\nRespond in valid JSON with this structure:\n{\n  \"formQuality\": {\n    \"overall\": number,\n    \"posture\": number,\n    \"rangeOfMotion\": number,\n    \"control\": number,\n    \"tempo\": number,\n    \"breathing\": number\n  },\n  \"deviations\": [{\n    \"timestamp\": number,\n    \"issue\": string,\n    \"severity\": \"low\"|\"medium\"|\"high\"|\"critical\",\n    \"bodyPart\": string,\n    \"correction\": string\n  }],\n  \"safetyConcerns\": [{\n    \"type\": string,\n    \"severity\": \"warning\"|\"danger\",\n    \"description\": string,\n    \"timestamp\": number,\n    \"recommendation\": string\n  }],\n  \"repetitions\": number,\n  \"summary\": string,\n  \"strengths\": string[],\n  \"improvements\": string[],\n  \"progression\": string,\n  \"confidence\": number\n}\n");
}
/**
 * Get default demo video URL for an exercise
 */
function getDefaultDemoVideo(exerciseId) {
    return __awaiter(this, void 0, void 0, function () {
        var demoDoc, data, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, firestore
                            .collection('exercise_demos')
                            .doc(exerciseId)
                            .get()];
                case 1:
                    demoDoc = _a.sent();
                    if (demoDoc.exists) {
                        data = demoDoc.data();
                        return [2 /*return*/, data === null || data === void 0 ? void 0 : data.videoUrl];
                    }
                    return [2 /*return*/, undefined];
                case 2:
                    error_3 = _a.sent();
                    logger.warn("[MovementAnalysis] Failed to get demo video for ".concat(exerciseId, ":"), error_3);
                    return [2 /*return*/, undefined];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Save analysis result to Firestore
 */
function saveAnalysisResult(result) {
    return __awaiter(this, void 0, void 0, function () {
        var analysisRef, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    analysisRef = firestore
                        .collection('patients')
                        .doc(result.patientId)
                        .collection('exercise_analyses')
                        .doc();
                    return [4 /*yield*/, analysisRef.set(__assign(__assign({}, result), { id: analysisRef.id, createdAt: new Date().toISOString() }))];
                case 1:
                    _a.sent();
                    logger.info("[MovementAnalysis] Saved analysis result ".concat(analysisRef.id));
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    logger.error('[MovementAnalysis] Failed to save analysis result:', error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
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
                            .where('feature', '==', 'PROGRESS_ANALYSIS')
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
                            .where('feature', '==', 'PROGRESS_ANALYSIS')
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
        var id, error_5;
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
                    error_5 = _a.sent();
                    logger.error('[MovementAnalysis] Failed to record usage:', error_5);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
