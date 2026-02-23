"use strict";
/**
 * Cloud Function: SOAP Note Generation
 *
 * Generates structured SOAP notes from consultation text or audio transcription
 * using Gemini Pro for high clinical accuracy.
 *
 * @route ai/soapGeneration
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
exports.soapGeneration = exports.soapGenerationHandler = void 0;
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
    maxRequestsPerHour: 30,
    maxRequestsPerDay: 150,
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
var soapGenerationHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, userId, auth, rateLimitStatus, data, patientDoc, patient, soapSnapshot, previousSOAP, age, patientContext_1, consultationText_1, transcription, transcriptionResult, cacheParams, aiResult, duration, error_1, duration;
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
                    logger.warn("[SOAPGeneration] Rate limit exceeded for user ".concat(userId));
                    throw new https_1.HttpsError('resource-exhausted', "Rate limit exceeded. Try again later.", {
                        resetAt: rateLimitStatus.resetAt.toISOString(),
                        remaining: rateLimitStatus.remaining,
                    });
                }
                data = request.data;
                if (!data.patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId is required');
                }
                if (!data.consultationText && !data.audioData) {
                    throw new https_1.HttpsError('invalid-argument', 'consultationText or audioData is required');
                }
                if (!data.sessionNumber) {
                    throw new https_1.HttpsError('invalid-argument', 'sessionNumber is required');
                }
                _a.label = 2;
            case 2:
                _a.trys.push([2, 9, , 11]);
                logger.info("[SOAPGeneration] Processing request for patient ".concat(data.patientId));
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
                        .limit(3)
                        .get()];
            case 4:
                soapSnapshot = _a.sent();
                previousSOAP = soapSnapshot.docs.map(function (doc) { return doc.data(); });
                age = calculateAge((patient === null || patient === void 0 ? void 0 : patient.birth_date) || '');
                patientContext_1 = {
                    patient: {
                        id: (patient === null || patient === void 0 ? void 0 : patient.id) || data.patientId,
                        name: (patient === null || patient === void 0 ? void 0 : patient.name) || 'Unknown',
                        age: age,
                        gender: (patient === null || patient === void 0 ? void 0 : patient.gender) || 'unknown',
                        mainCondition: (patient === null || patient === void 0 ? void 0 : patient.main_condition) || 'N/A',
                        medicalHistory: (patient === null || patient === void 0 ? void 0 : patient.medical_history) || 'N/A',
                    },
                    previousSOAP: previousSOAP.map(function (soap) { return ({
                        sessionNumber: soap.session_number,
                        subjective: soap.subjective,
                        objective: soap.objective,
                        assessment: soap.assessment,
                        plan: soap.plan,
                    }); }),
                    sessionNumber: data.sessionNumber,
                    sessionType: data.sessionType || 'follow-up',
                    language: 'pt',
                };
                consultationText_1 = data.consultationText;
                transcription = consultationText_1;
                if (!data.audioData) return [3 /*break*/, 6];
                logger.info('[SOAPGeneration] Transcribing audio...');
                return [4 /*yield*/, transcribeAudio(data.audioData, data.audioMimeType)];
            case 5:
                transcriptionResult = _a.sent();
                if (!transcriptionResult.success) {
                    throw new https_1.HttpsError('internal', "Audio transcription failed: ".concat(transcriptionResult.error));
                }
                transcription = transcriptionResult.transcription;
                consultationText_1 = transcription;
                _a.label = 6;
            case 6:
                cacheParams = {
                    patientId: data.patientId,
                    sessionNumber: data.sessionNumber,
                    sessionType: data.sessionType,
                    consultationText: consultationText_1.substring(0, 500), // First 500 chars for cache key
                };
                return [4 /*yield*/, (0, idempotency_1.withIdempotency)('SOAP_GENERATION', userId, cacheParams, function () { return generateSOAPNote(consultationText_1, patientContext_1); }, { cacheTtl: 5 * 60 * 1000 } // 5 minute cache
                    )];
            case 7:
                aiResult = _a.sent();
                if (!aiResult.success) {
                    throw new https_1.HttpsError('internal', aiResult.error || 'SOAP generation failed');
                }
                // Add transcription if requested
                if (data.includeTranscription) {
                    aiResult.data.transcription = transcription;
                }
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'CLINICAL_ANALYSIS',
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
                        feature: 'CLINICAL_ANALYSIS',
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
                logger.error('[SOAPGeneration] Error:', error_1);
                throw new https_1.HttpsError('internal', error_1 instanceof Error ? error_1.message : 'Failed to generate SOAP note');
            case 11: return [2 /*return*/];
        }
    });
}); };
exports.soapGenerationHandler = soapGenerationHandler;
exports.soapGeneration = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 300, // 5 minutes for AI generation
}, exports.soapGenerationHandler);
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate SOAP note using Gemini Pro
 */
function generateSOAPNote(consultationText, patientContext) {
    return __awaiter(this, void 0, void 0, function () {
        var VertexAI, vertexAI, generativeModel, prompt_1, result, candidates, responseText, cleanedJson, soapData, promptTokens, completionTokens, estimatedCost, error_2;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('@google-cloud/vertexai'); })];
                case 1:
                    VertexAI = (_f.sent()).VertexAI;
                    vertexAI = new VertexAI({
                        project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
                    });
                    generativeModel = vertexAI.getGenerativeModel({
                        model: 'gemini-2.5-pro',
                    });
                    prompt_1 = buildSOAPPrompt(consultationText, patientContext);
                    return [4 /*yield*/, generativeModel.generateContent({
                            contents: [{
                                    role: 'user',
                                    parts: [{ text: prompt_1 }]
                                }],
                            generationConfig: {
                                temperature: 0.3,
                                maxOutputTokens: 8192,
                            },
                            systemInstruction: "You are an expert physical therapist clinical documentation assistant for Brazilian healthcare.\n\nGenerate structured, professional SOAP notes in Portuguese from consultation transcripts.\n\nSOAP Format Guidelines:\n- **Subjective (S)**: Patient's reported symptoms, complaints, and concerns. Include pain levels (0-10), functional limitations, and progress since last session.\n- **Objective (O)**: Measurable findings from physical examination. Include inspection, palpation, range of motion, strength, special tests, posture, and gait analysis.\n- **Assessment (A)**: Clinical evaluation including diagnosis, prognosis, and response to treatment. Use professional terminology.\n- **Plan (P)**: Evidence-based treatment plan with specific goals, interventions, frequency, and home exercises.\n\nQuality Standards:\n- Use professional Portuguese physical therapy terminology\n- Be concise but complete\n- Focus on function and outcomes\n- Include measurable goals when possible\n- Note any red flags or contraindications\n- Align with Brazilian physical therapy best practices\n- Include ICD-10 codes when relevant\n\nReturn ONLY valid JSON with this structure:\n{\n  \"soap\": {\n    \"subjective\": \"...\",\n    \"objective\": { ... },\n    \"assessment\": \"...\",\n    \"plan\": { ... }\n  },\n  \"keyFindings\": [\"...\", \"...\"],\n  \"recommendations\": [\"...\", \"...\"],\n  \"redFlags\": [\"...\", \"...\"],\n  \"suggestedCodes\": [\"...\", \"...\"]\n}",
                        })];
                case 2:
                    result = _f.sent();
                    candidates = (_a = result.response) === null || _a === void 0 ? void 0 : _a.candidates;
                    if (!candidates || candidates.length === 0) {
                        throw new Error('No response candidates from AI model');
                    }
                    responseText = (_e = (_d = (_c = (_b = candidates[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                    if (!responseText) {
                        throw new Error('No text in AI response');
                    }
                    cleanedJson = cleanJsonResponse(responseText);
                    soapData = JSON.parse(cleanedJson);
                    promptTokens = Math.ceil(prompt_1.length / 4);
                    completionTokens = Math.ceil(responseText.length / 4);
                    estimatedCost = (promptTokens / 1000000) * 1.25 +
                        (completionTokens / 1000000) * 5.00;
                    return [2 /*return*/, {
                            success: true,
                            data: soapData,
                            usage: {
                                promptTokens: promptTokens,
                                completionTokens: completionTokens,
                                totalTokens: promptTokens + completionTokens,
                                estimatedCost: estimatedCost,
                            },
                        }];
                case 3:
                    error_2 = _f.sent();
                    logger.error('[SOAPGeneration] AI generation error:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'SOAP generation failed',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Transcribe audio using Gemini Pro
 */
function transcribeAudio(audioData_1) {
    return __awaiter(this, arguments, void 0, function (audioData, mimeType) {
        var vertexAI, generativeModel, result, transcriptionCandidates, transcriptionText, error_3;
        var _a, _b, _c, _d, _e;
        if (mimeType === void 0) { mimeType = 'audio/mp3'; }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, getVertexAI()];
                case 1:
                    vertexAI = _f.sent();
                    generativeModel = vertexAI.getGenerativeModel({
                        model: 'gemini-2.5-pro',
                    });
                    return [4 /*yield*/, generativeModel.generateContent({
                            contents: [{
                                    role: 'user',
                                    parts: [{
                                            inlineData: {
                                                mimeType: mimeType,
                                                data: audioData,
                                            },
                                        }],
                                }],
                            generationConfig: {
                                temperature: 0.2,
                                maxOutputTokens: 4096,
                            },
                            systemInstruction: 'Transcreva esta consulta de fisioterapia para português brasileiro. Inclua todas as falas do paciente e do terapeuta. Mantenha terminologia médica precisa.',
                        })];
                case 2:
                    result = _f.sent();
                    transcriptionCandidates = (_a = result.response) === null || _a === void 0 ? void 0 : _a.candidates;
                    if (!transcriptionCandidates || transcriptionCandidates.length === 0) {
                        throw new Error('No transcription response from AI model');
                    }
                    transcriptionText = (_e = (_d = (_c = (_b = transcriptionCandidates[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
                    if (!transcriptionText) {
                        throw new Error('No text in transcription response');
                    }
                    return [2 /*return*/, {
                            success: true,
                            transcription: transcriptionText,
                        }];
                case 3:
                    error_3 = _f.sent();
                    logger.error('[SOAPGeneration] Transcription error:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3 instanceof Error ? error_3.message : 'Transcription failed',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Build SOAP generation prompt
 */
function buildSOAPPrompt(consultationText, context) {
    var patient = context.patient, previousSOAP = context.previousSOAP, sessionNumber = context.sessionNumber, sessionType = context.sessionType;
    var sessionTypeLabels = {
        initial: 'Consulta Inicial',
        'follow-up': 'Consulta de Retorno',
        reassessment: 'Reavaliação',
        discharge: 'Alta',
    };
    var sessionTypeLabel = sessionTypeLabels[sessionType || 'follow-up'] || sessionTypeLabels['follow-up'];
    // Format previous SOAP history
    var historyText = previousSOAP && previousSOAP.length > 0
        ? "\n\n## Hist\u00F3rico de Sess\u00F5es Anteriores\n\n".concat(previousSOAP.slice(-2).map(function (soap) {
            var _a, _b;
            return "\nSess\u00E3o ".concat(soap.sessionNumber, ":\n- S: ").concat((_a = soap.subjective) === null || _a === void 0 ? void 0 : _a.substring(0, 200), "...\n- A: ").concat((_b = soap.assessment) === null || _b === void 0 ? void 0 : _b.substring(0, 200), "...\n");
        }).join('\n'), "\n")
        : '';
    return "\n## Contexto da Consulta\n\n**Tipo de Sess\u00E3o:** ".concat(sessionTypeLabel, "\n**N\u00FAmero da Sess\u00E3o:** ").concat(sessionNumber, "\n\n**Dados do Paciente:**\n- Nome: ").concat(patient.name, "\n- Idade: ").concat(patient.age, " anos\n- G\u00EAnero: ").concat(patient.gender, "\n- Condi\u00E7\u00E3o Principal: ").concat(patient.mainCondition, "\n- Hist\u00F3rico M\u00E9dico: ").concat(patient.medicalHistory || 'N/A', "\n").concat(historyText, "\n\n## Transcri\u00E7\u00E3o da Consulta\n\n").concat(consultationText, "\n\n## Solicita\u00E7\u00E3o\n\nGere uma nota SOAP estruturada e completa em portugu\u00EAs brasileiro com base na transcri\u00E7\u00E3o acima.\n\nInclua:\n1. **Subjective**: Queixas e relatos do paciente com n\u00EDvel de dor (0-10)\n2. **Objective**: Exame f\u00EDsico detalhado (inspe\u00E7\u00E3o, palpa\u00E7\u00E3o, testes de movimento, testes especiais)\n3. **Assessment**: Avalia\u00E7\u00E3o cl\u00EDnica, diagn\u00F3stico funcional e progn\u00F3stico\n4. **Plan**: Plano de tratamento com objetivos espec\u00EDficos, interven\u00E7\u00F5es, frequ\u00EAncia e exerc\u00EDcios domiciliares\n\nAdicione tamb\u00E9m:\n- Principais achados cl\u00EDnicos da sess\u00E3o\n- Recomenda\u00E7\u00F5es para pr\u00F3xima sess\u00E3o\n- Sinais de alerta (red flags) se houver\n- C\u00F3digos CID-10 sugeridos\n\nRetorne APENAS JSON v\u00E1lido sem blocos de c\u00F3digo markdown.");
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
                            .where('feature', '==', 'CLINICAL_ANALYSIS')
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
                            .where('feature', '==', 'CLINICAL_ANALYSIS')
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
        var id, error_4;
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
                    error_4 = _a.sent();
                    logger.error('[SOAPGeneration] Failed to record usage:', error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
