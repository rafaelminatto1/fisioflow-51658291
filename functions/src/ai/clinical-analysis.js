"use strict";
/**
 * Cloud Function: Clinical Decision Support Analysis
 *
 * Provides evidence-based clinical analysis, red flag identification,
 * and treatment recommendations using Gemini Pro with optional Google Search grounding.
 *
 * @route ai/clinicalAnalysis
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
exports.clinicalAnalysis = exports.clinicalAnalysisHandler = void 0;
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
    maxRequestsPerHour: 25,
    maxRequestsPerDay: 100,
};
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var clinicalAnalysisHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var startTime, userId, auth, rateLimitStatus, data, patientDoc, patient, soapSnapshot, previousSessions, age, sessionNumber, caseData, aiResult, duration, modelName, error_1, duration;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
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
                rateLimitStatus = _c.sent();
                if (rateLimitStatus.isLimited) {
                    logger.warn("[ClinicalAnalysis] Rate limit exceeded for user ".concat(userId));
                    throw new https_1.HttpsError('resource-exhausted', "Rate limit exceeded. Try again later.", {
                        resetAt: rateLimitStatus.resetAt.toISOString(),
                        remaining: rateLimitStatus.remaining,
                    });
                }
                data = request.data;
                if (!data.patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId is required');
                }
                if (!data.currentSOAP) {
                    throw new https_1.HttpsError('invalid-argument', 'currentSOAP is required');
                }
                _c.label = 2;
            case 2:
                _c.trys.push([2, 7, , 9]);
                logger.info("[ClinicalAnalysis] Processing request for patient ".concat(data.patientId));
                return [4 /*yield*/, firestore
                        .collection('patients')
                        .doc(data.patientId)
                        .get()];
            case 3:
                patientDoc = _c.sent();
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
                soapSnapshot = _c.sent();
                previousSessions = soapSnapshot.docs.map(function (doc) { return doc.data(); });
                age = calculateAge((patient === null || patient === void 0 ? void 0 : patient.birth_date) || '');
                sessionNumber = previousSessions.length + 1;
                caseData = {
                    patient: {
                        id: (patient === null || patient === void 0 ? void 0 : patient.id) || data.patientId,
                        name: (patient === null || patient === void 0 ? void 0 : patient.name) || 'Unknown',
                        age: age,
                        gender: (patient === null || patient === void 0 ? void 0 : patient.gender) || 'unknown',
                        mainCondition: (patient === null || patient === void 0 ? void 0 : patient.main_condition) || 'N/A',
                        medicalHistory: (patient === null || patient === void 0 ? void 0 : patient.medical_history) || 'N/A',
                    },
                    currentSOAP: data.currentSOAP,
                    previousSessions: previousSessions.map(function (soap) { return ({
                        sessionNumber: soap.session_number,
                        subjective: soap.subjective,
                        assessment: soap.assessment,
                        plan: soap.plan,
                    }); }),
                    sessionNumber: sessionNumber,
                    treatmentDurationWeeks: data.treatmentDurationWeeks,
                };
                return [4 /*yield*/, generateClinicalAnalysis(caseData, (_a = data.useGrounding) !== null && _a !== void 0 ? _a : false, (_b = data.redFlagCheckOnly) !== null && _b !== void 0 ? _b : false)];
            case 5:
                aiResult = _c.sent();
                if (!aiResult.success) {
                    throw new https_1.HttpsError('internal', aiResult.error || 'Clinical analysis failed');
                }
                duration = Date.now() - startTime;
                modelName = data.redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'TREATMENT_PLANNING',
                        model: modelName,
                        inputTokens: aiResult.usage.promptTokens,
                        outputTokens: aiResult.usage.completionTokens,
                        duration: duration,
                        success: true,
                    })];
            case 6:
                _c.sent();
                return [2 /*return*/, {
                        success: true,
                        data: aiResult.data,
                        usage: aiResult.usage,
                        groundingUsed: aiResult.groundingUsed,
                    }];
            case 7:
                error_1 = _c.sent();
                duration = Date.now() - startTime;
                return [4 /*yield*/, recordUsage({
                        userId: userId,
                        feature: 'TREATMENT_PLANNING',
                        model: 'gemini-2.5-pro',
                        inputTokens: 0,
                        outputTokens: 0,
                        duration: duration,
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    })];
            case 8:
                _c.sent();
                if (error_1 instanceof https_1.HttpsError) {
                    throw error_1;
                }
                logger.error('[ClinicalAnalysis] Error:', error_1);
                throw new https_1.HttpsError('internal', error_1 instanceof Error ? error_1.message : 'Failed to generate clinical analysis');
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.clinicalAnalysisHandler = clinicalAnalysisHandler;
exports.clinicalAnalysis = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 300, // 5 minutes for AI generation
}, exports.clinicalAnalysisHandler);
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Generate clinical analysis using Gemini Pro
 */
function generateClinicalAnalysis(caseData, useGrounding, redFlagCheckOnly) {
    return __awaiter(this, void 0, void 0, function () {
        var VertexAI, vertexAI, generativeModel, temperature, maxTokens, prompt_1, systemInstruction, options, result, candidates, responseText, cleanedJson, analysisData, promptTokens, completionTokens, costPerMillionInput, costPerMillionOutput, estimatedCost, error_2;
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
                        model: redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
                    });
                    temperature = redFlagCheckOnly ? 0.1 : 0.2;
                    maxTokens = redFlagCheckOnly ? 2048 : 8192;
                    prompt_1 = buildClinicalPrompt(caseData, redFlagCheckOnly);
                    systemInstruction = redFlagCheckOnly
                        ? "You are an expert clinical decision support system for physical therapy.\n\nAnalyze the patient case and identify ONLY red flags that require attention.\n\nRed Flag Categories:\n- **Cardiovascular**: Chest pain, dyspnea, abnormal vital signs, edema\n- **Neurological**: Progressive weakness, sensory changes, gait disturbances\n- **Systemic**: Fever, unexplained weight loss, night pain\n- **Musculoskeletal**: Fracture signs, severe pain, loss of function\n\nReturn ONLY valid JSON with red flags array containing:\n- description: description of the red flag\n- urgency: \"immediate\" | \"urgent\" | \"monitor\" | \"informational\"\n- action: recommended action\n- justification: clinical reasoning\n- category: \"cardiovascular\" | \"neurological\" | \"musculoskeletal\" | \"systemic\" | \"other\""
                        : "You are an expert clinical decision support system for physical therapy practice in Brazil.\n\nCore Principles:\n1. **Safety First**: Always flag potential red flags requiring medical attention\n2. **Evidence-Based**: Base recommendations on current research and clinical guidelines\n3. **Brazilian Standards**: Consider Brazilian physical therapy guidelines and healthcare context\n4. **Professional Judgment**: Support, never replace, clinical judgment\n5. **Clear Communication**: Use clear, professional Portuguese\n\nEvidence Levels:\n- **Strong**: Multiple high-quality RCTs, systematic reviews, meta-analyses\n- **Moderate**: Some RCTs, well-designed cohort studies\n- **Limited**: Case series, expert consensus, low-quality studies\n- **Expert Opinion**: Clinical experience, no direct research\n\n".concat(useGrounding ? "\nGoogle Search Integration:\nWhen analyzing cases, search for:\n1. Latest research on the patient's condition\n2. Current clinical guidelines (Brazilian and international)\n3. Evidence for recommended interventions\n4. Contraindications or precautions\n5. Red flags specific to the condition\n\nInclude search queries used in the response.\n" : '', "\n\nReturn ONLY valid JSON matching the provided schema.");
                    options = {
                        model: redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
                        prompt: prompt_1,
                        temperature: temperature,
                        maxOutputTokens: maxTokens,
                        systemInstruction: systemInstruction,
                    };
                    // Add grounding tools if enabled
                    if (useGrounding && !redFlagCheckOnly) {
                        options.tools = [{ googleSearch: {} }];
                    }
                    return [4 /*yield*/, generativeModel.generateContent(options)];
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
                    analysisData = JSON.parse(cleanedJson);
                    promptTokens = Math.ceil(prompt_1.length / 4);
                    completionTokens = Math.ceil(responseText.length / 4);
                    costPerMillionInput = redFlagCheckOnly ? 0.075 : 1.25;
                    costPerMillionOutput = redFlagCheckOnly ? 0.30 : 5.00;
                    estimatedCost = (promptTokens / 1000000) * costPerMillionInput +
                        (completionTokens / 1000000) * costPerMillionOutput;
                    return [2 /*return*/, {
                            success: true,
                            data: redFlagCheckOnly ? { redFlags: analysisData.redFlags || analysisData } : analysisData,
                            usage: {
                                promptTokens: promptTokens,
                                completionTokens: completionTokens,
                                totalTokens: promptTokens + completionTokens,
                                estimatedCost: estimatedCost,
                            },
                            groundingUsed: useGrounding && !redFlagCheckOnly,
                        }];
                case 3:
                    error_2 = _f.sent();
                    logger.error('[ClinicalAnalysis] AI generation error:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'Clinical analysis failed',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Build clinical analysis prompt
 */
function buildClinicalPrompt(caseData, redFlagCheckOnly) {
    var patient = caseData.patient, currentSOAP = caseData.currentSOAP, previousSessions = caseData.previousSessions, sessionNumber = caseData.sessionNumber, treatmentDurationWeeks = caseData.treatmentDurationWeeks;
    // Format previous sessions
    var historyText = previousSessions && previousSessions.length > 0
        ? "\n\n## Hist\u00F3rico de Tratamento\n\nSess\u00F5es Anteriores: ".concat(previousSessions.length, "\n").concat(previousSessions.slice(-3).map(function (s) {
            var _a, _b;
            return "\nSess\u00E3o ".concat(s.sessionNumber, ":\n- Queixa: ").concat((_a = s.subjective) === null || _a === void 0 ? void 0 : _a.substring(0, 150), "...\n- Avalia\u00E7\u00E3o: ").concat((_b = s.assessment) === null || _b === void 0 ? void 0 : _b.substring(0, 150), "...\n");
        }).join('\n'), "\n")
        : '';
    // Format vital signs
    var vitalSignsText = currentSOAP.vitalSigns
        ? "\n**Sinais Vitais:**\n".concat(Object.entries(currentSOAP.vitalSigns)
            .filter(function (_a) {
            var _ = _a[0], v = _a[1];
            return v !== undefined;
        })
            .map(function (_a) {
            var k = _a[0], v = _a[1];
            return "- ".concat(k, ": ").concat(v);
        })
            .join('\n'), "\n")
        : '';
    // Format functional tests
    var functionalTestsText = currentSOAP.functionalTests
        ? "\n**Testes Funcionais:**\n".concat(JSON.stringify(currentSOAP.functionalTests, null, 2), "\n")
        : '';
    if (redFlagCheckOnly) {
        return "\n## Caso do Paciente\n\n**Dados do Paciente:**\n- Nome: ".concat(patient.name, "\n- Idade: ").concat(patient.age, " anos\n- G\u00EAnero: ").concat(patient.gender, "\n- Condi\u00E7\u00E3o Principal: ").concat(patient.mainCondition, "\n- Hist\u00F3rico M\u00E9dico: ").concat(patient.medicalHistory || 'N/A', "\n\n**SOAP Atual:**\n").concat(vitalSignsText, "\n- Subjetivo: ").concat(currentSOAP.subjective || 'Não informado', "\n- Objetivo: ").concat(typeof currentSOAP.objective === 'object'
            ? JSON.stringify(currentSOAP.objective, null, 2)
            : currentSOAP.objective || 'Não realizado', "\n- Avalia\u00E7\u00E3o: ").concat(currentSOAP.assessment || 'Não realizada', "\n\n").concat(historyText, "\n\n## Solicita\u00E7\u00E3o\n\nAnalise APENAS sinais de alerta (red flags) que requerem aten\u00E7\u00E3o.\n\nRetorne JSON com array de red flags contendo:\n- description: descri\u00E7\u00E3o do sinal de alerta\n- urgency: \"immediate\" | \"urgent\" | \"monitor\" | \"informational\"\n- action: a\u00E7\u00E3o recomendada\n- justification: justificativa cl\u00EDnica\n- category: \"cardiovascular\" | \"neurological\" | \"musculoskeletal\" | \"systemic\" | \"other\"\n\nRetorne APENAS JSON v\u00E1lido.");
    }
    return "\n## Caso Cl\u00EDnico para An\u00E1lise\n\n### Dados do Paciente\n- **Nome:** ".concat(patient.name, "\n- **Idade:** ").concat(patient.age, " anos\n- **G\u00EAnero:** ").concat(patient.gender, "\n- **Condi\u00E7\u00E3o Principal:** ").concat(patient.mainCondition, "\n- **Hist\u00F3rico M\u00E9dico:** ").concat(patient.medicalHistory || 'N/A', "\n\n### Consulta Atual\n- **N\u00FAmero da Sess\u00E3o:** ").concat(sessionNumber, "\n- **Dura\u00E7\u00E3o do Tratamento:** ").concat(treatmentDurationWeeks || 'N/A', " semanas\n").concat(vitalSignsText, "\n").concat(functionalTestsText, "\n\n### SOAP Atual\n**Subjetivo (Queixa do Paciente):**\n").concat(currentSOAP.subjective || 'Não informado', "\n\n**Objetivo (Exame F\u00EDsico):**\n").concat(typeof currentSOAP.objective === 'object'
        ? JSON.stringify(currentSOAP.objective, null, 2)
        : currentSOAP.objective || 'Não realizado', "\n\n**Avalia\u00E7\u00E3o Cl\u00EDnica:**\n").concat(currentSOAP.assessment || 'Não realizada', "\n\n**Plano de Tratamento:**\n").concat(typeof currentSOAP.plan === 'object'
        ? JSON.stringify(currentSOAP.plan, null, 2)
        : currentSOAP.plan || 'Não definido', "\n").concat(historyText, "\n\n## An\u00E1lise Solicitada\n\nForne\u00E7a uma an\u00E1lise completa incluindo:\n\n1. **Red Flags:** Identifique sinais de alerta que requerem aten\u00E7\u00E3o imediata, urgente, ou monitoramento\n2. **Recomenda\u00E7\u00F5es de Tratamento:** Interven\u00E7\u00F5es baseadas em evid\u00EAncias com n\u00EDvel de evid\u00EAncia\n3. **Progn\u00F3stico:** Indicadores progn\u00F3sticos com confian\u00E7a e fatores influentes\n4. **Avalia\u00E7\u00F5es Recomendadas:** Testes ou avalia\u00E7\u00F5es adicionais a considerar\n5. **Resumo do Caso:** S\u00EDntese cl\u00EDnica concisa\n6. **Considera\u00E7\u00F5es Chave:** Pontos importantes para tratamento\n7. **Diagn\u00F3sticos Diferenciais:** Condi\u00E7\u00F5es a considerar (se aplic\u00E1vel)\n\nRetorne APENAS JSON v\u00E1lido sem blocos de c\u00F3digo markdown.");
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
                            .where('feature', '==', 'TREATMENT_PLANNING')
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
                            .where('feature', '==', 'TREATMENT_PLANNING')
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
                    logger.error('[ClinicalAnalysis] Failed to record usage:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
