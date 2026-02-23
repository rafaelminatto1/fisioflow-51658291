"use strict";
/**
 * AI Clinical Assistant Chat
 * Provides clinical insights and assistance using Vertex AI Gemini
 *
 * SAFETY FEATURES:
 * - PHI detection and redaction
 * - Content safety filtering
 * - Usage tracking and rate limiting
 * - Medical disclaimers
 * - Input sanitization
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.aiGetSuggestions = exports.aiGetSuggestionsHandler = exports.aiSoapNoteChat = exports.aiSoapNoteChatHandler = exports.aiExerciseRecommendationChat = exports.aiExerciseRecommendationChatHandler = exports.aiClinicalChat = exports.aiClinicalChatHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var vertexai_1 = require("@google-cloud/vertexai");
var admin = require("firebase-admin");
var logger_1 = require("../lib/logger");
var idempotency_1 = require("../lib/idempotency");
var patient_context_rag_1 = require("./rag/patient-context-rag");
var logger = (0, logger_1.getLogger)('ai-clinical-chat');
var db = admin.firestore();
var CLINICAL_CHAT_MODEL = process.env.CLINICAL_CHAT_MODEL || 'gemini-2.5-flash';
// Usage tracking for cost management
var MAX_DAILY_REQUESTS = 100;
var COST_PER_1K_TOKENS = 0.0001; // Estimated cost
var MAX_RECENT_EVOLUTIONS = 6;
var MAX_CONTEXT_MEDICAL_RETURNS = 4;
var MAX_CONTEXT_SURGERIES = 6;
var MAX_CONTEXT_PATHOLOGIES = 6;
var MAX_CONTEXT_GOALS = 6;
var MAX_CONTEXT_SOAP_RECORDS = 5;
var MAX_CONTEXT_MEASUREMENT_TRENDS = 8;
var MAX_CONTEXT_APPOINTMENTS = 90;
var MAX_CONTEXT_UPCOMING_APPOINTMENTS = 5;
var MAX_CONTEXT_PRESCRIPTIONS = 8;
var MAX_CONTEXT_EXAMS = 6;
var MAX_CONTEXT_DOCUMENTS = 8;
var EXERCISE_ADHERENCE_WINDOW_DAYS = 30;
// PHI (Protected Health Information) patterns for detection
var PHI_PATTERNS = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, // Email addresses
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN-like patterns
    /\b(?:Rua|Av|Avenida|Rua|Travessa|Alameda)\s+[\w\s]+,\s*\d+/gi, // Addresses (PT)
    /\b(?:Street|St|Avenue|Av|Road|Rd)\s+[\w\s]+,\s*\d+/gi, // Addresses (EN)
];
// Blocked content patterns
var BLOCKED_PATTERNS = [
    /(?:suicide|kill myself|end my life)/i,
    /(?:medical emergency|call 911|call 192)/i,
    /(?:prescribe|medication|dosage|mg pill)/i, // Prescription requests
];
// System prompt for clinical assistant
var CLINICAL_SYSTEM_PROMPT = "Voc\u00EA \u00E9 um assistente cl\u00EDnico de fisioterapia do FisioFlow, especializado em ajudar fisioterapeutas com:\n\n1. **An\u00E1lise de Pacientes**: Interpretar hist\u00F3rico cl\u00EDnico, avalia\u00E7\u00F5es e evolu\u00E7\u00F5es\n2. **Sugest\u00F5es de Exerc\u00EDcios**: Recomendar exerc\u00EDcios baseados em condi\u00E7\u00F5es e limita\u00E7\u00F5es\n3. **Planejamento de Tratamento**: Auxiliar na estrutura\u00E7\u00E3o de planos de tratamento\n4. **An\u00E1lise de Progresso**: Interpretar evolu\u00E7\u00E3o e sugerir ajustes\n\n**\u26A0\uFE0F AVISO LEGAL OBRIGAT\u00D3RIO:**\nEste assistente N\u00C3O substitui avalia\u00E7\u00E3o m\u00E9dica profissional. Sempre consulte um m\u00E9dico para:\n- Emerg\u00EAncias m\u00E9dicas\n- Condi\u00E7\u00F5es agudas ou graves\n- Prescri\u00E7\u00E3o de medicamentos\n- Procedimentos invasivos\n- Dor tor\u00E1cica, falta de ar, sintomas neurol\u00F3gicos\n\n**Restri\u00E7\u00F5es:**\n- N\u00C3O fa\u00E7a diagn\u00F3sticos definitivos\n- N\u00C3O prescreva medicamentos\n- N\u00C3O ignore protocolos de emerg\u00EAncia\n- SEMPRE recomende avalia\u00E7\u00E3o presencial quando apropriado\n\n**Formato de Resposta:**\nUse markdown. Inclua avisos quando relevante. Seja espec\u00EDfico e pr\u00E1tico.\n\n**Lembre-se:** Voc\u00EA \u00E9 um assistente de apoio, N\u00C3O um substituto para avalia\u00E7\u00E3o profissional.";
/**
 * Detect and redact PHI from text
 */
function detectAndRedactPHI(text) {
    var sanitized = text;
    var detectedTypes = [];
    // Check for PHI patterns
    if (PHI_PATTERNS[0].test(text))
        detectedTypes.push('phone');
    if (PHI_PATTERNS[1].test(text))
        detectedTypes.push('email');
    if (PHI_PATTERNS[2].test(text))
        detectedTypes.push('ssn-like');
    if (PHI_PATTERNS[3].test(text) || PHI_PATTERNS[4].test(text))
        detectedTypes.push('address');
    // Redact PHI
    PHI_PATTERNS.forEach(function (pattern) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return { sanitized: sanitized, hasPHI: detectedTypes.length > 0, detectedTypes: detectedTypes };
}
/**
 * Check for blocked content
 */
function checkBlockedContent(text) {
    for (var _i = 0, BLOCKED_PATTERNS_1 = BLOCKED_PATTERNS; _i < BLOCKED_PATTERNS_1.length; _i++) {
        var pattern = BLOCKED_PATTERNS_1[_i];
        if (pattern.test(text)) {
            return {
                blocked: true,
                reason: pattern.toString().includes('suicide') ? 'emergency-crisis' :
                    pattern.toString().includes('prescribe') ? 'prescription-request' :
                        'emergency-warning',
            };
        }
    }
    return { blocked: false };
}
/**
 * Check daily usage limit
 */
function checkUsageLimit(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var today, snapshot, count, remaining, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db
                            .collection('clinical_chat_logs')
                            .where('userId', '==', userId)
                            .where('timestamp', '>=', today)
                            .count()
                            .get()];
                case 2:
                    snapshot = _a.sent();
                    count = snapshot.data().count;
                    remaining = Math.max(0, MAX_DAILY_REQUESTS - count);
                    if (count >= MAX_DAILY_REQUESTS) {
                        return [2 /*return*/, { allowed: false }];
                    }
                    return [2 /*return*/, { allowed: true, remaining: remaining }];
                case 3:
                    error_1 = _a.sent();
                    // Fail-open to keep clinical assistant available even when a Firestore index is missing.
                    logger.warn('Usage limit check failed; allowing request without quota enforcement', {
                        userId: userId,
                        error: error_1.message,
                    });
                    return [2 /*return*/, { allowed: true, remaining: MAX_DAILY_REQUESTS }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sanitize input by limiting length and removing dangerous patterns
 */
function sanitizeInput(message) {
    if (!message || message.trim().length === 0) {
        return { valid: false, sanitized: '', error: 'Message is required' };
    }
    if (message.length > 5000) {
        return { valid: false, sanitized: '', error: 'Message too long (max 5000 characters)' };
    }
    // Check for blocked content
    var blockedCheck = checkBlockedContent(message);
    if (blockedCheck.blocked) {
        return {
            valid: false,
            sanitized: '',
            error: blockedCheck.reason === 'emergency-crisis' ?
                'Se você estiver em crise, ligue imediatamente para o CVV (188) ou emergência (192).' :
                blockedCheck.reason === 'prescription-request' ?
                    'Este assistente não pode prescrever medicamentos. Consulte um médico.' :
                    'Conteúdo não permitido nesta consulta.'
        };
    }
    return { valid: true, sanitized: message.trim() };
}
/**
 * Calculate estimated cost from token usage
 */
function estimateCost(inputTokens, outputTokens) {
    var totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * COST_PER_1K_TOKENS;
}
function toFiniteNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value))
        return undefined;
    if (!Number.isFinite(value))
        return undefined;
    return value;
}
function toNonNegativeInteger(value) {
    var numericValue = toFiniteNumber(value);
    if (numericValue === undefined || numericValue < 0)
        return undefined;
    return Math.floor(numericValue);
}
function toInteger(value) {
    var numericValue = toFiniteNumber(value);
    if (numericValue === undefined)
        return undefined;
    return Math.floor(numericValue);
}
function toNumberValue(value) {
    if (typeof value === 'number') {
        if (Number.isFinite(value))
            return value;
        return undefined;
    }
    if (typeof value === 'string') {
        var parsed = Number(value.replace(',', '.'));
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
}
function toBooleanValue(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true')
            return true;
        if (value.toLowerCase() === 'false')
            return false;
    }
    if (typeof value === 'number') {
        if (value === 1)
            return true;
        if (value === 0)
            return false;
    }
    return undefined;
}
function toStringValue(value) {
    if (typeof value !== 'string')
        return undefined;
    var normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}
function getFirstString(data, keys) {
    if (!data)
        return undefined;
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        var value = toStringValue(data[key]);
        if (value)
            return value;
    }
    return undefined;
}
function getFirstBoolean(data, keys) {
    if (!data)
        return undefined;
    for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
        var key = keys_2[_i];
        var value = toBooleanValue(data[key]);
        if (value !== undefined)
            return value;
    }
    return undefined;
}
function toTimestamp(value) {
    if (!value)
        return 0;
    var timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}
function composeDateTime(dateValue, timeValue) {
    if (!dateValue && !timeValue)
        return undefined;
    if (!dateValue)
        return timeValue;
    if (!timeValue)
        return dateValue;
    var dateOnly = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
    var timeOnly = timeValue.includes('T')
        ? (timeValue.split('T')[1] || timeValue)
        : timeValue;
    var normalizedTime = timeOnly.length === 5 ? "".concat(timeOnly, ":00") : timeOnly;
    return "".concat(dateOnly, "T").concat(normalizedTime);
}
function normalizeAppointmentStatus(value) {
    var normalized = value === null || value === void 0 ? void 0 : value.trim().toLowerCase();
    if (!normalized)
        return undefined;
    if (normalized === 'completed')
        return 'concluido';
    if (normalized === 'cancelled' || normalized === 'canceled')
        return 'cancelado';
    if (normalized === 'no_show' || normalized === 'no-show')
        return 'faltou';
    return normalized;
}
function isCompletedAppointmentStatus(status) {
    return status === 'concluido' || status === 'atendido';
}
function isNoShowAppointmentStatus(status) {
    return status === 'faltou' || status === 'falta' || status === 'paciente_faltou';
}
function isCancelledAppointmentStatus(status) {
    return status === 'cancelado' || status === 'remarcado' || status === 'reagendado';
}
function isUpcomingAppointmentStatus(status) {
    if (!status)
        return true;
    return !isCompletedAppointmentStatus(status)
        && !isNoShowAppointmentStatus(status)
        && !isCancelledAppointmentStatus(status);
}
function inferWeeklyFrequencyFromText(value) {
    if (!value)
        return undefined;
    var normalized = value.toLowerCase();
    if (normalized.includes('diar'))
        return 7;
    if (normalized.includes('quinzen'))
        return 0.5;
    if (normalized.includes('mensal'))
        return 0.25;
    var matchPerWeek = normalized.match(/(\d+(?:[.,]\d+)?)\s*x?\s*(?:\/|\s*)\s*(?:semana|semanal|week)/);
    if (matchPerWeek) {
        var parsed = Number(matchPerWeek[1].replace(',', '.'));
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
    }
    var genericMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
    if (genericMatch && (normalized.includes('semana') || normalized.includes('semanal'))) {
        var parsed = Number(genericMatch[1].replace(',', '.'));
        if (Number.isFinite(parsed) && parsed > 0)
            return parsed;
    }
    return undefined;
}
function truncateText(value, maxLength) {
    if (maxLength === void 0) { maxLength = 280; }
    if (value.length <= maxLength)
        return value;
    return "".concat(value.slice(0, maxLength - 3), "...");
}
function normalizeRecentEvolutions(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map(function (item) {
        if (!item || typeof item !== 'object')
            return null;
        var date = toStringValue(item.date);
        var notes = toStringValue(item.notes);
        if (!notes)
            return null;
        return {
            date: date || new Date().toISOString(),
            notes: truncateText(notes),
        };
    })
        .filter(function (item) { return !!item; })
        .slice(0, MAX_RECENT_EVOLUTIONS);
}
function getPatientNameFromDoc(data) {
    if (!data)
        return undefined;
    return toStringValue(data.name)
        || toStringValue(data.full_name)
        || toStringValue(data.patient_name);
}
function getConditionFromDoc(data) {
    if (!data)
        return undefined;
    var mainCondition = toStringValue(data.main_condition);
    if (mainCondition)
        return mainCondition;
    return toStringValue(data.condition)
        || toStringValue(data.primaryComplaint)
        || toStringValue(data.primary_complaint)
        || toStringValue(data.diagnosis)
        || toStringValue(data.mainDiagnosis)
        || toStringValue(data.main_diagnosis);
}
function getEventDate(record) {
    return (toStringValue(record.session_date)
        || toStringValue(record.created_at)
        || toStringValue(record.updated_at)
        || new Date().toISOString());
}
function getInsightDate(record) {
    return (toStringValue(record.created_at)
        || toStringValue(record.timestamp)
        || new Date().toISOString());
}
function buildSessionEventNotes(record) {
    var details = ['Resumo de sessao'];
    var painReduction = toFiniteNumber(record.pain_reduction);
    if (painReduction !== undefined)
        details.push("reducao de dor ".concat(painReduction));
    var satisfaction = toInteger(record.patient_satisfaction);
    if (satisfaction !== undefined)
        details.push("satisfacao ".concat(satisfaction, "/10"));
    var painBefore = toInteger(record.pain_level_before);
    if (painBefore !== undefined)
        details.push("dor antes ".concat(painBefore, "/10"));
    var painAfter = toInteger(record.pain_level_after);
    if (painAfter !== undefined)
        details.push("dor apos ".concat(painAfter, "/10"));
    return truncateText(details.join(', '));
}
function enrichClinicalContext(baseContext) {
    return __awaiter(this, void 0, void 0, function () {
        var patientId, enriched, loadMedicalReturns, patientDocPromise, sessionsCountPromise, recentSessionsPromise, recentInsightsPromise, medicalReturnsPromise, surgeriesPromise, pathologiesPromise, goalsPromise, soapRecordsPromise, measurementsPromise, appointmentsPromise, prescribedExercisesPromise, exerciseLogsPromise, patientExamsPromise, patientDocumentsPromise, _a, patientDoc, sessionsCountSnap, recentSessionsSnap, recentInsightsSnap, medicalReturnsSnap, surgeriesSnap, pathologiesSnap, goalsSnap, soapRecordsSnap, measurementsSnap, appointmentsSnap, prescribedExercisesSnap, exerciseLogsSnap, patientExamsSnap, patientDocumentsSnap, patientData, profileSummary, profileMainCondition, profileMedicalHistory, referringDoctorName, referringDoctorPhone, patientReturnDate, patientReportDone, patientReportSent, reportStatus, sentStatus, counted, counted, sessionEvents, insightEvents, medicalReturns, surgeries, activePathologies, activeGoals, soapRecords, measurementRows, groupedMeasurements_1, measurementTrends, appointmentRows, nowTimestamp_1, total, completed, noShow, cancelled, upcoming, lastCompleted, prescribedExercisesRaw, activePrescriptionsRaw, exerciseNameById_1, missingExerciseIds, uniqueMissingIds, activePrescriptions, exerciseLogs, now, windowStart_1, logsLast30Days, lastLogDate, inferredWeeklyLoad, expectedLogsInWindow, adherencePercentage, examsRaw, documents, examFileCountByExamId_1;
        var _this = this;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        return __generator(this, function (_s) {
            switch (_s.label) {
                case 0:
                    if (!baseContext.patientId)
                        return [2 /*return*/, baseContext];
                    patientId = baseContext.patientId;
                    enriched = __assign(__assign({}, baseContext), { recentEvolutions: normalizeRecentEvolutions(baseContext.recentEvolutions) });
                    loadMedicalReturns = function () { return __awaiter(_this, void 0, void 0, function () {
                        var error_2, errorCode;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db
                                            .collection('patient_medical_returns')
                                            .where('patient_id', '==', patientId)
                                            .orderBy('return_date', 'desc')
                                            .limit(MAX_CONTEXT_MEDICAL_RETURNS + 6)
                                            .get()];
                                case 1: return [2 /*return*/, _a.sent()];
                                case 2:
                                    error_2 = _a.sent();
                                    errorCode = error_2.code;
                                    if (errorCode === 'failed-precondition') {
                                        logger.warn('Missing Firestore index for patient_medical_returns in AI context. Using fallback query.', {
                                            patientId: patientId,
                                        });
                                        return [2 /*return*/, db
                                                .collection('patient_medical_returns')
                                                .where('patient_id', '==', patientId)
                                                .limit(MAX_CONTEXT_MEDICAL_RETURNS + 10)
                                                .get()];
                                    }
                                    throw error_2;
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); };
                    patientDocPromise = db.collection('patients').doc(patientId).get().catch(function (error) {
                        logger.warn('Failed to fetch patient document for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    sessionsCountPromise = (enriched.sessionCount === undefined
                        ? db.collection('patient_session_metrics').where('patient_id', '==', patientId).count().get()
                        : Promise.resolve(null)).catch(function (error) {
                        logger.warn('Failed to count sessions for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    recentSessionsPromise = (enriched.recentEvolutions && enriched.recentEvolutions.length > 0
                        ? Promise.resolve(null)
                        : db.collection('patient_session_metrics').where('patient_id', '==', patientId).limit(4).get()).catch(function (error) {
                        logger.warn('Failed to fetch recent sessions for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    recentInsightsPromise = (enriched.recentEvolutions && enriched.recentEvolutions.length > 0
                        ? Promise.resolve(null)
                        : db.collection('patient_insights').where('patient_id', '==', patientId).limit(3).get()).catch(function (error) {
                        logger.warn('Failed to fetch recent insights for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    medicalReturnsPromise = loadMedicalReturns().catch(function (error) {
                        logger.warn('Failed to fetch patient medical returns for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    surgeriesPromise = db
                        .collection('patient_surgeries')
                        .where('patient_id', '==', patientId)
                        .limit(MAX_CONTEXT_SURGERIES + 8)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch patient surgeries for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    pathologiesPromise = db
                        .collection('patient_pathologies')
                        .where('patient_id', '==', patientId)
                        .limit(MAX_CONTEXT_PATHOLOGIES + 8)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch patient pathologies for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    goalsPromise = db
                        .collection('patient_goals')
                        .where('patient_id', '==', patientId)
                        .limit(MAX_CONTEXT_GOALS + 8)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch patient goals for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    soapRecordsPromise = db
                        .collection('soap_records')
                        .where('patient_id', '==', patientId)
                        .limit(MAX_CONTEXT_SOAP_RECORDS + 12)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch SOAP records for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    measurementsPromise = db
                        .collection('evolution_measurements')
                        .where('patient_id', '==', patientId)
                        .limit(80)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch evolution measurements for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    appointmentsPromise = db
                        .collection('appointments')
                        .where('patient_id', '==', patientId)
                        .limit(MAX_CONTEXT_APPOINTMENTS)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch appointments for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    prescribedExercisesPromise = db
                        .collection('prescribed_exercises')
                        .where('patient_id', '==', patientId)
                        .limit(40)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch prescribed exercises for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    exerciseLogsPromise = db
                        .collection('exercise_logs')
                        .where('patient_id', '==', patientId)
                        .limit(220)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch exercise logs for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    patientExamsPromise = db
                        .collection('patient_exams')
                        .where('patient_id', '==', patientId)
                        .limit(30)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch patient exams for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    patientDocumentsPromise = db
                        .collection('patient_documents')
                        .where('patient_id', '==', patientId)
                        .limit(40)
                        .get()
                        .catch(function (error) {
                        logger.warn('Failed to fetch patient documents for context enrichment', {
                            patientId: patientId,
                            error: error.message,
                        });
                        return null;
                    });
                    return [4 /*yield*/, Promise.all([
                            patientDocPromise,
                            sessionsCountPromise,
                            recentSessionsPromise,
                            recentInsightsPromise,
                            medicalReturnsPromise,
                            surgeriesPromise,
                            pathologiesPromise,
                            goalsPromise,
                            soapRecordsPromise,
                            measurementsPromise,
                            appointmentsPromise,
                            prescribedExercisesPromise,
                            exerciseLogsPromise,
                            patientExamsPromise,
                            patientDocumentsPromise,
                        ])];
                case 1:
                    _a = _s.sent(), patientDoc = _a[0], sessionsCountSnap = _a[1], recentSessionsSnap = _a[2], recentInsightsSnap = _a[3], medicalReturnsSnap = _a[4], surgeriesSnap = _a[5], pathologiesSnap = _a[6], goalsSnap = _a[7], soapRecordsSnap = _a[8], measurementsSnap = _a[9], appointmentsSnap = _a[10], prescribedExercisesSnap = _a[11], exerciseLogsSnap = _a[12], patientExamsSnap = _a[13], patientDocumentsSnap = _a[14];
                    patientData = (patientDoc === null || patientDoc === void 0 ? void 0 : patientDoc.exists) ? patientDoc.data() : undefined;
                    if (!enriched.patientName) {
                        enriched.patientName = getPatientNameFromDoc(patientData);
                    }
                    if (!enriched.condition) {
                        enriched.condition = getConditionFromDoc(patientData);
                    }
                    profileSummary = [];
                    profileMainCondition = getFirstString(patientData, [
                        'main_condition',
                        'condition',
                        'primaryComplaint',
                        'primary_complaint',
                        'diagnosis',
                    ]);
                    profileMedicalHistory = getFirstString(patientData, ['medical_history', 'medicalHistory']);
                    referringDoctorName = getFirstString(patientData, ['referring_doctor_name', 'referringDoctorName']);
                    referringDoctorPhone = getFirstString(patientData, ['referring_doctor_phone', 'referringDoctorPhone']);
                    patientReturnDate = getFirstString(patientData, ['medical_return_date', 'medicalReturnDate']);
                    patientReportDone = getFirstBoolean(patientData, ['medical_report_done', 'medicalReportDone']);
                    patientReportSent = getFirstBoolean(patientData, ['medical_report_sent', 'medicalReportSent']);
                    if (profileMainCondition)
                        profileSummary.push("Condicao principal: ".concat(profileMainCondition));
                    if (profileMedicalHistory)
                        profileSummary.push("Historico clinico: ".concat(truncateText(profileMedicalHistory, 220)));
                    if (referringDoctorName) {
                        profileSummary.push("Medico assistente: ".concat(referringDoctorName).concat(referringDoctorPhone ? " (".concat(referringDoctorPhone, ")") : ''));
                    }
                    if (patientReturnDate)
                        profileSummary.push("Retorno medico previsto no perfil: ".concat(patientReturnDate));
                    if (patientReportDone !== undefined || patientReportSent !== undefined) {
                        reportStatus = patientReportDone ? 'feito' : 'pendente';
                        sentStatus = patientReportSent ? 'enviado' : 'nao enviado';
                        profileSummary.push("Relatorio medico: ".concat(reportStatus, "; envio: ").concat(sentStatus));
                    }
                    if (profileSummary.length > 0) {
                        enriched.patientProfileSummary = profileSummary.slice(0, 8);
                    }
                    if (enriched.sessionCount === undefined && sessionsCountSnap) {
                        counted = sessionsCountSnap.data().count;
                        if (typeof counted === 'number' && Number.isFinite(counted) && counted >= 0) {
                            enriched.sessionCount = counted;
                        }
                    }
                    if (enriched.sessionCount === undefined && soapRecordsSnap) {
                        counted = soapRecordsSnap.size;
                        if (typeof counted === 'number' && Number.isFinite(counted) && counted >= 0) {
                            enriched.sessionCount = counted;
                        }
                    }
                    if (!enriched.recentEvolutions || enriched.recentEvolutions.length === 0) {
                        sessionEvents = (_b = recentSessionsSnap === null || recentSessionsSnap === void 0 ? void 0 : recentSessionsSnap.docs.map(function (doc) {
                            var data = doc.data();
                            return {
                                date: getEventDate(data),
                                notes: buildSessionEventNotes(data),
                            };
                        })) !== null && _b !== void 0 ? _b : [];
                        insightEvents = (_c = recentInsightsSnap === null || recentInsightsSnap === void 0 ? void 0 : recentInsightsSnap.docs.map(function (doc) {
                            var data = doc.data();
                            var insightText = toStringValue(data.insight_text) || 'Insight clinico recente';
                            var insightType = toStringValue(data.insight_type);
                            var note = insightType
                                ? "Insight (".concat(insightType, "): ").concat(insightText)
                                : "Insight: ".concat(insightText);
                            return {
                                date: getInsightDate(data),
                                notes: truncateText(note),
                            };
                        })) !== null && _c !== void 0 ? _c : [];
                        enriched.recentEvolutions = __spreadArray(__spreadArray([], sessionEvents, true), insightEvents, true).filter(function (item) { return item.notes.length > 0; })
                            .sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime(); })
                            .slice(0, MAX_RECENT_EVOLUTIONS);
                    }
                    medicalReturns = ((_d = medicalReturnsSnap === null || medicalReturnsSnap === void 0 ? void 0 : medicalReturnsSnap.docs) !== null && _d !== void 0 ? _d : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        date: getFirstString(record, ['return_date', 'medical_return_date']),
                        doctorName: getFirstString(record, ['doctor_name', 'doctorName', 'referring_doctor_name']),
                        doctorPhone: getFirstString(record, ['doctor_phone', 'doctorPhone', 'referring_doctor_phone']),
                        period: getFirstString(record, ['return_period', 'period']),
                        reportDone: getFirstBoolean(record, ['report_done', 'medical_report_done']),
                        reportSent: getFirstBoolean(record, ['report_sent', 'medical_report_sent']),
                        notes: getFirstString(record, ['notes', 'observation', 'observations']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                    }); })
                        .filter(function (record) { return record.date || record.doctorName || record.notes; })
                        .sort(function (a, b) { return toTimestamp(b.date || b.createdAt) - toTimestamp(a.date || a.createdAt); })
                        .slice(0, MAX_CONTEXT_MEDICAL_RETURNS)
                        .map(function (_a) {
                        var createdAt = _a.createdAt, record = __rest(_a, ["createdAt"]);
                        return record;
                    });
                    if (medicalReturns.length === 0 && patientReturnDate) {
                        medicalReturns.push({
                            date: patientReturnDate,
                            doctorName: referringDoctorName,
                            doctorPhone: referringDoctorPhone,
                            period: undefined,
                            reportDone: patientReportDone,
                            reportSent: patientReportSent,
                            notes: 'Data de retorno registrada no perfil do paciente.',
                        });
                    }
                    if (medicalReturns.length > 0) {
                        enriched.medicalReturns = medicalReturns;
                    }
                    surgeries = ((_e = surgeriesSnap === null || surgeriesSnap === void 0 ? void 0 : surgeriesSnap.docs) !== null && _e !== void 0 ? _e : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        date: getFirstString(record, ['surgery_date', 'date']),
                        surgeryName: getFirstString(record, ['surgery_name', 'procedure', 'name', 'title']),
                        surgeryType: getFirstString(record, ['surgery_type', 'type']),
                        affectedSide: getFirstString(record, ['affected_side', 'side']),
                        surgeon: getFirstString(record, ['surgeon_name', 'surgeon']),
                        hospital: getFirstString(record, ['hospital', 'clinic_name']),
                        complications: getFirstString(record, ['complications']),
                        notes: getFirstString(record, ['notes']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                    }); })
                        .filter(function (record) { return record.surgeryName || record.date || record.notes; })
                        .sort(function (a, b) { return toTimestamp(b.date || b.createdAt) - toTimestamp(a.date || a.createdAt); })
                        .slice(0, MAX_CONTEXT_SURGERIES)
                        .map(function (_a) {
                        var createdAt = _a.createdAt, record = __rest(_a, ["createdAt"]);
                        return record;
                    });
                    if (surgeries.length > 0) {
                        enriched.surgeries = surgeries;
                    }
                    activePathologies = ((_f = pathologiesSnap === null || pathologiesSnap === void 0 ? void 0 : pathologiesSnap.docs) !== null && _f !== void 0 ? _f : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        name: getFirstString(record, ['pathology_name', 'name']) || '',
                        status: getFirstString(record, ['status']),
                        severity: getFirstString(record, ['severity']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                    }); })
                        .filter(function (record) { return record.name.length > 0; })
                        .filter(function (record) {
                        var normalized = (record.status || '').toLowerCase();
                        return (normalized.length === 0 ||
                            normalized === 'em_tratamento' ||
                            normalized === 'in_progress' ||
                            normalized === 'ativa' ||
                            normalized === 'ativo' ||
                            normalized === 'cronica' ||
                            normalized === 'chronic');
                    })
                        .sort(function (a, b) { return toTimestamp(b.createdAt) - toTimestamp(a.createdAt); })
                        .slice(0, MAX_CONTEXT_PATHOLOGIES)
                        .map(function (_a) {
                        var createdAt = _a.createdAt, record = __rest(_a, ["createdAt"]);
                        return record;
                    });
                    if (activePathologies.length > 0) {
                        enriched.activePathologies = activePathologies;
                    }
                    activeGoals = ((_g = goalsSnap === null || goalsSnap === void 0 ? void 0 : goalsSnap.docs) !== null && _g !== void 0 ? _g : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        title: getFirstString(record, ['goal_title', 'description', 'title']) || '',
                        status: getFirstString(record, ['status']),
                        priority: getFirstString(record, ['priority']),
                        targetDate: getFirstString(record, ['target_date', 'targetDate']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                    }); })
                        .filter(function (record) { return record.title.length > 0; })
                        .filter(function (record) {
                        var normalized = (record.status || '').toLowerCase();
                        return (normalized.length === 0 ||
                            normalized === 'em_andamento' ||
                            normalized === 'in_progress' ||
                            normalized === 'not_started' ||
                            normalized === 'ativo' ||
                            normalized === 'active');
                    })
                        .sort(function (a, b) { return toTimestamp(b.createdAt) - toTimestamp(a.createdAt); })
                        .slice(0, MAX_CONTEXT_GOALS)
                        .map(function (_a) {
                        var createdAt = _a.createdAt, record = __rest(_a, ["createdAt"]);
                        return record;
                    });
                    if (activeGoals.length > 0) {
                        enriched.activeGoals = activeGoals;
                    }
                    soapRecords = ((_h = soapRecordsSnap === null || soapRecordsSnap === void 0 ? void 0 : soapRecordsSnap.docs) !== null && _h !== void 0 ? _h : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) {
                        var date = getFirstString(record, ['record_date', 'session_date', 'created_at', 'updated_at'])
                            || composeDateTime(getFirstString(record, ['appointment_date', 'date']), getFirstString(record, ['start_time', 'appointment_time']));
                        return {
                            date: date,
                            sessionNumber: toInteger(record.session_number),
                            painLevel: toNumberValue(record.pain_level),
                            subjective: getFirstString(record, ['subjective']),
                            objective: getFirstString(record, ['objective']),
                            assessment: getFirstString(record, ['assessment']),
                            plan: getFirstString(record, ['plan']),
                        };
                    })
                        .filter(function (record) { return (!!record.date
                        || record.sessionNumber !== undefined
                        || record.painLevel !== undefined
                        || !!record.subjective
                        || !!record.objective
                        || !!record.assessment
                        || !!record.plan); })
                        .sort(function (a, b) { return toTimestamp(b.date) - toTimestamp(a.date); })
                        .slice(0, MAX_CONTEXT_SOAP_RECORDS)
                        .map(function (record) { return (__assign(__assign({}, record), { subjective: record.subjective ? truncateText(record.subjective, 180) : undefined, objective: record.objective ? truncateText(record.objective, 180) : undefined, assessment: record.assessment ? truncateText(record.assessment, 180) : undefined, plan: record.plan ? truncateText(record.plan, 180) : undefined })); });
                    if (soapRecords.length > 0) {
                        enriched.soapRecords = soapRecords;
                    }
                    measurementRows = ((_j = measurementsSnap === null || measurementsSnap === void 0 ? void 0 : measurementsSnap.docs) !== null && _j !== void 0 ? _j : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        name: getFirstString(record, ['measurement_name', 'test_name']) || '',
                        measurementType: getFirstString(record, ['measurement_type', 'test_type']),
                        value: toNumberValue(record.value),
                        unit: getFirstString(record, ['unit', 'measurement_unit']),
                        notes: getFirstString(record, ['notes']),
                        measuredAt: getFirstString(record, ['measured_at', 'measurement_date', 'created_at', 'updated_at']),
                    }); })
                        .filter(function (record) { return record.name.length > 0 && record.value !== undefined; })
                        .sort(function (a, b) { return toTimestamp(b.measuredAt) - toTimestamp(a.measuredAt); });
                    if (measurementRows.length > 0) {
                        groupedMeasurements_1 = new Map();
                        measurementRows.forEach(function (measurement) {
                            var key = "".concat(measurement.measurementType || 'tipo_nao_informado', "::").concat(measurement.name);
                            var group = groupedMeasurements_1.get(key) || [];
                            group.push(measurement);
                            groupedMeasurements_1.set(key, group);
                        });
                        measurementTrends = Array.from(groupedMeasurements_1.values())
                            .map(function (series) {
                            var latest = series[0];
                            var previous = series[1];
                            if (!latest || latest.value === undefined)
                                return null;
                            var delta = previous && previous.value !== undefined
                                ? latest.value - previous.value
                                : undefined;
                            return {
                                name: latest.name,
                                measurementType: latest.measurementType,
                                latestValue: latest.value,
                                previousValue: previous === null || previous === void 0 ? void 0 : previous.value,
                                delta: delta,
                                unit: latest.unit || (previous === null || previous === void 0 ? void 0 : previous.unit),
                                measuredAt: latest.measuredAt,
                                notes: latest.notes ? truncateText(latest.notes, 140) : undefined,
                            };
                        })
                            .filter(function (record) { return !!record; })
                            .sort(function (a, b) { return toTimestamp(b.measuredAt) - toTimestamp(a.measuredAt); })
                            .slice(0, MAX_CONTEXT_MEASUREMENT_TRENDS);
                        if (measurementTrends.length > 0) {
                            enriched.measurementTrends = measurementTrends;
                        }
                    }
                    appointmentRows = ((_k = appointmentsSnap === null || appointmentsSnap === void 0 ? void 0 : appointmentsSnap.docs) !== null && _k !== void 0 ? _k : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) {
                        var date = getFirstString(record, ['appointment_date', 'date', 'start_time', 'appointment_time']);
                        var time = getFirstString(record, ['appointment_time', 'start_time', 'time']);
                        var status = normalizeAppointmentStatus(getFirstString(record, ['status']));
                        var dateTime = composeDateTime(getFirstString(record, ['appointment_date', 'date']), getFirstString(record, ['appointment_time', 'start_time', 'time'])) || date;
                        return {
                            date: date,
                            time: time,
                            status: status,
                            type: getFirstString(record, ['type', 'session_type']),
                            notes: getFirstString(record, ['notes']),
                            dateTime: dateTime,
                        };
                    })
                        .filter(function (record) { return record.date || record.time || record.status || record.type; })
                        .sort(function (a, b) { return toTimestamp(b.dateTime) - toTimestamp(a.dateTime); });
                    if (appointmentRows.length > 0) {
                        nowTimestamp_1 = Date.now();
                        total = appointmentRows.length;
                        completed = appointmentRows.filter(function (item) { return isCompletedAppointmentStatus(item.status); }).length;
                        noShow = appointmentRows.filter(function (item) { return isNoShowAppointmentStatus(item.status); }).length;
                        cancelled = appointmentRows.filter(function (item) { return isCancelledAppointmentStatus(item.status); }).length;
                        upcoming = appointmentRows
                            .filter(function (item) { return isUpcomingAppointmentStatus(item.status); })
                            .filter(function (item) {
                            var timestamp = toTimestamp(item.dateTime);
                            return timestamp > 0 && timestamp >= nowTimestamp_1;
                        })
                            .sort(function (a, b) { return toTimestamp(a.dateTime) - toTimestamp(b.dateTime); })
                            .slice(0, MAX_CONTEXT_UPCOMING_APPOINTMENTS)
                            .map(function (_a) {
                            var date = _a.date, time = _a.time, status = _a.status, type = _a.type, notes = _a.notes;
                            return ({
                                date: date,
                                time: time,
                                status: status,
                                type: type,
                                notes: notes ? truncateText(notes, 120) : undefined,
                            });
                        });
                        lastCompleted = appointmentRows
                            .filter(function (item) { return isCompletedAppointmentStatus(item.status); })
                            .sort(function (a, b) { return toTimestamp(b.dateTime) - toTimestamp(a.dateTime); })[0];
                        enriched.appointmentsSummary = {
                            total: total,
                            completed: completed,
                            noShow: noShow,
                            cancelled: cancelled,
                            upcoming: upcoming,
                            lastCompleted: lastCompleted
                                ? {
                                    date: lastCompleted.date,
                                    time: lastCompleted.time,
                                    status: lastCompleted.status,
                                    type: lastCompleted.type,
                                }
                                : undefined,
                        };
                    }
                    prescribedExercisesRaw = ((_l = prescribedExercisesSnap === null || prescribedExercisesSnap === void 0 ? void 0 : prescribedExercisesSnap.docs) !== null && _l !== void 0 ? _l : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        exerciseId: getFirstString(record, ['exercise_id']),
                        exerciseName: getFirstString(record, ['exercise_name', 'name', 'title']),
                        frequency: getFirstString(record, ['frequency']),
                        sets: toInteger(record.sets),
                        reps: toInteger(record.reps),
                        durationSeconds: toInteger(record.duration_seconds),
                        notes: getFirstString(record, ['notes']),
                        isActive: getFirstBoolean(record, ['is_active']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                    }); });
                    activePrescriptionsRaw = prescribedExercisesRaw
                        .filter(function (record) { return record.isActive !== false; })
                        .sort(function (a, b) { return toTimestamp(b.createdAt) - toTimestamp(a.createdAt); })
                        .slice(0, MAX_CONTEXT_PRESCRIPTIONS);
                    if (!(activePrescriptionsRaw.length > 0 || ((_m = exerciseLogsSnap === null || exerciseLogsSnap === void 0 ? void 0 : exerciseLogsSnap.docs.length) !== null && _m !== void 0 ? _m : 0) > 0)) return [3 /*break*/, 4];
                    exerciseNameById_1 = new Map();
                    missingExerciseIds = activePrescriptionsRaw
                        .filter(function (record) { return !record.exerciseName && !!record.exerciseId; })
                        .map(function (record) { return record.exerciseId; });
                    uniqueMissingIds = Array.from(new Set(missingExerciseIds)).slice(0, 20);
                    if (!(uniqueMissingIds.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.all(uniqueMissingIds.map(function (exerciseId) { return __awaiter(_this, void 0, void 0, function () {
                            var exerciseDoc, data, name_1, error_3;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, db.collection('exercises').doc(exerciseId).get()];
                                    case 1:
                                        exerciseDoc = _a.sent();
                                        if (!exerciseDoc.exists)
                                            return [2 /*return*/];
                                        data = exerciseDoc.data();
                                        name_1 = getFirstString(data, ['name', 'title']);
                                        if (name_1)
                                            exerciseNameById_1.set(exerciseId, name_1);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_3 = _a.sent();
                                        logger.warn('Failed to resolve exercise name for context enrichment', {
                                            patientId: patientId,
                                            exerciseId: exerciseId,
                                            error: error_3.message,
                                        });
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 2:
                    _s.sent();
                    _s.label = 3;
                case 3:
                    activePrescriptions = activePrescriptionsRaw.map(function (record) { return ({
                        exerciseName: record.exerciseName || (record.exerciseId ? exerciseNameById_1.get(record.exerciseId) : undefined) || record.exerciseId,
                        frequency: record.frequency,
                        sets: record.sets,
                        reps: record.reps,
                        durationSeconds: record.durationSeconds,
                        notes: record.notes ? truncateText(record.notes, 120) : undefined,
                    }); });
                    exerciseLogs = ((_o = exerciseLogsSnap === null || exerciseLogsSnap === void 0 ? void 0 : exerciseLogsSnap.docs) !== null && _o !== void 0 ? _o : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        date: getFirstString(record, ['performed_at', 'complete_date', 'completed_at', 'timestamp', 'created_at']),
                    }); })
                        .filter(function (record) { return !!record.date; })
                        .sort(function (a, b) { return toTimestamp(b.date) - toTimestamp(a.date); });
                    now = Date.now();
                    windowStart_1 = now - (EXERCISE_ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
                    logsLast30Days = exerciseLogs.filter(function (log) { return toTimestamp(log.date) >= windowStart_1; }).length;
                    lastLogDate = (_p = exerciseLogs[0]) === null || _p === void 0 ? void 0 : _p.date;
                    inferredWeeklyLoad = activePrescriptions
                        .map(function (exercise) { return inferWeeklyFrequencyFromText(exercise.frequency); })
                        .filter(function (value) { return value !== undefined; })
                        .reduce(function (sum, value) { return sum + value; }, 0);
                    expectedLogsInWindow = inferredWeeklyLoad > 0
                        ? Math.max(4, Math.round((inferredWeeklyLoad * EXERCISE_ADHERENCE_WINDOW_DAYS) / 7))
                        : 12;
                    adherencePercentage = expectedLogsInWindow > 0
                        ? Math.min(100, Math.round((logsLast30Days / expectedLogsInWindow) * 100))
                        : undefined;
                    enriched.exerciseAdherence = {
                        activePrescriptions: activePrescriptions,
                        logsLast30Days: logsLast30Days,
                        adherencePercentage: adherencePercentage,
                        lastLogDate: lastLogDate,
                    };
                    _s.label = 4;
                case 4:
                    examsRaw = ((_q = patientExamsSnap === null || patientExamsSnap === void 0 ? void 0 : patientExamsSnap.docs) !== null && _q !== void 0 ? _q : [])
                        .map(function (doc) {
                        var data = doc.data();
                        return {
                            id: doc.id,
                            title: getFirstString(data, ['title', 'name']),
                            examType: getFirstString(data, ['exam_type', 'type']),
                            examDate: getFirstString(data, ['exam_date', 'date']),
                            description: getFirstString(data, ['description']),
                            createdAt: getFirstString(data, ['created_at', 'updated_at']),
                        };
                    })
                        .sort(function (a, b) { return toTimestamp(b.examDate || b.createdAt) - toTimestamp(a.examDate || a.createdAt); })
                        .slice(0, MAX_CONTEXT_EXAMS);
                    documents = ((_r = patientDocumentsSnap === null || patientDocumentsSnap === void 0 ? void 0 : patientDocumentsSnap.docs) !== null && _r !== void 0 ? _r : [])
                        .map(function (doc) { return doc.data(); })
                        .map(function (record) { return ({
                        fileName: getFirstString(record, ['file_name', 'title', 'name']),
                        category: getFirstString(record, ['category']),
                        createdAt: getFirstString(record, ['created_at', 'updated_at']),
                        description: getFirstString(record, ['description']),
                    }); })
                        .filter(function (record) { return record.fileName || record.category || record.description; })
                        .sort(function (a, b) { return toTimestamp(b.createdAt) - toTimestamp(a.createdAt); })
                        .slice(0, MAX_CONTEXT_DOCUMENTS)
                        .map(function (record) { return (__assign(__assign({}, record), { description: record.description ? truncateText(record.description, 120) : undefined })); });
                    if (!(examsRaw.length > 0 || documents.length > 0)) return [3 /*break*/, 7];
                    examFileCountByExamId_1 = new Map();
                    if (!(examsRaw.length > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, Promise.all(examsRaw.map(function (exam) { return __awaiter(_this, void 0, void 0, function () {
                            var filesSnap, error_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, db
                                                .collection('patient_exam_files')
                                                .where('exam_id', '==', exam.id)
                                                .limit(25)
                                                .get()];
                                    case 1:
                                        filesSnap = _a.sent();
                                        examFileCountByExamId_1.set(exam.id, filesSnap.size);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_4 = _a.sent();
                                        logger.warn('Failed to fetch exam files for context enrichment', {
                                            patientId: patientId,
                                            examId: exam.id,
                                            error: error_4.message,
                                        });
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 5:
                    _s.sent();
                    _s.label = 6;
                case 6:
                    enriched.examSummary = {
                        exams: examsRaw.map(function (exam) {
                            var _a;
                            return ({
                                title: exam.title,
                                examType: exam.examType,
                                examDate: exam.examDate,
                                description: exam.description ? truncateText(exam.description, 120) : undefined,
                                filesCount: (_a = examFileCountByExamId_1.get(exam.id)) !== null && _a !== void 0 ? _a : 0,
                            });
                        }),
                        documents: documents,
                    };
                    _s.label = 7;
                case 7:
                    if (!enriched.condition && enriched.patientName) {
                        enriched.condition = "Paciente: ".concat(enriched.patientName);
                    }
                    return [2 /*return*/, enriched];
            }
        });
    });
}
/**
 * Clinical chat with AI (with safety guardrails)
 */
var aiClinicalChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, payload, message, conversationHistory, rawContext, baseContext, context, requestOrganizationId, inputCheck, usageCheck, phiCheck, sanitizedMessage, ragContext, _a, contextPrompt_1, lastCompleted, dateLabel, timeLabel, typeLabel, vertexAI, generativeModel, sanitizedHistory, contents, result, response, usageMetadata, estimatedCost, error_5;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    return __generator(this, function (_1) {
        switch (_1.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                payload = data && typeof data === 'object'
                    ? data
                    : {};
                message = toStringValue(payload.message) || '';
                conversationHistory = Array.isArray(payload.conversationHistory)
                    ? payload.conversationHistory
                    : [];
                rawContext = payload.context && typeof payload.context === 'object'
                    ? payload.context
                    : undefined;
                baseContext = {
                    patientId: toStringValue(rawContext === null || rawContext === void 0 ? void 0 : rawContext.patientId),
                    patientName: toStringValue(rawContext === null || rawContext === void 0 ? void 0 : rawContext.patientName),
                    condition: toStringValue(rawContext === null || rawContext === void 0 ? void 0 : rawContext.condition),
                    sessionCount: toNonNegativeInteger(rawContext === null || rawContext === void 0 ? void 0 : rawContext.sessionCount),
                    recentEvolutions: normalizeRecentEvolutions(rawContext === null || rawContext === void 0 ? void 0 : rawContext.recentEvolutions),
                };
                return [4 /*yield*/, enrichClinicalContext(baseContext)];
            case 1:
                context = _1.sent();
                requestOrganizationId = toStringValue((_d = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.token) === null || _d === void 0 ? void 0 : _d.organizationId)
                    || toStringValue((_f = (_e = request.auth) === null || _e === void 0 ? void 0 : _e.token) === null || _f === void 0 ? void 0 : _f.organization_id);
                inputCheck = sanitizeInput(message);
                if (!inputCheck.valid) {
                    throw new https_1.HttpsError('invalid-argument', inputCheck.error || 'Invalid input');
                }
                return [4 /*yield*/, checkUsageLimit(userId)];
            case 2:
                usageCheck = _1.sent();
                if (!usageCheck.allowed) {
                    throw new https_1.HttpsError('resource-exhausted', "Daily limit reached (".concat(MAX_DAILY_REQUESTS, " requests). Try again tomorrow."));
                }
                phiCheck = detectAndRedactPHI(inputCheck.sanitized);
                sanitizedMessage = phiCheck.sanitized;
                if (phiCheck.hasPHI) {
                    logger.warn('PHI detected and redacted in clinical chat', {
                        userId: userId,
                        detectedTypes: phiCheck.detectedTypes,
                    });
                }
                _1.label = 3;
            case 3:
                _1.trys.push([3, 9, , 10]);
                if (!context.patientId) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, patient_context_rag_1.retrievePatientKnowledgeContext)({
                        patientId: context.patientId,
                        userId: userId,
                        question: sanitizedMessage,
                        organizationId: requestOrganizationId,
                        maxSnippets: 6,
                    })];
            case 4:
                _a = _1.sent();
                return [3 /*break*/, 6];
            case 5:
                _a = null;
                _1.label = 6;
            case 6:
                ragContext = _a;
                if (ragContext) {
                    if (!context.patientName && ragContext.patientName) {
                        context.patientName = ragContext.patientName;
                    }
                    if (!context.condition && ragContext.patientCondition) {
                        context.condition = ragContext.patientCondition;
                    }
                    if (context.sessionCount === undefined && ragContext.sessionCount !== undefined) {
                        context.sessionCount = ragContext.sessionCount;
                    }
                }
                logger.info('AI clinical chat request', {
                    userId: userId,
                    patientId: context === null || context === void 0 ? void 0 : context.patientId,
                    organizationId: (ragContext === null || ragContext === void 0 ? void 0 : ragContext.organizationId) || requestOrganizationId || null,
                    remainingRequests: usageCheck.remaining,
                    phiDetected: phiCheck.hasPHI,
                    ragMode: (ragContext === null || ragContext === void 0 ? void 0 : ragContext.retrievalMode) || 'none',
                    ragSnippetCount: (ragContext === null || ragContext === void 0 ? void 0 : ragContext.snippets.length) || 0,
                    medicalReturnsCount: ((_g = context === null || context === void 0 ? void 0 : context.medicalReturns) === null || _g === void 0 ? void 0 : _g.length) || 0,
                    surgeriesCount: ((_h = context === null || context === void 0 ? void 0 : context.surgeries) === null || _h === void 0 ? void 0 : _h.length) || 0,
                    pathologiesCount: ((_j = context === null || context === void 0 ? void 0 : context.activePathologies) === null || _j === void 0 ? void 0 : _j.length) || 0,
                    goalsCount: ((_k = context === null || context === void 0 ? void 0 : context.activeGoals) === null || _k === void 0 ? void 0 : _k.length) || 0,
                    soapRecordsCount: ((_l = context === null || context === void 0 ? void 0 : context.soapRecords) === null || _l === void 0 ? void 0 : _l.length) || 0,
                    measurementsCount: ((_m = context === null || context === void 0 ? void 0 : context.measurementTrends) === null || _m === void 0 ? void 0 : _m.length) || 0,
                    upcomingAppointmentsCount: ((_p = (_o = context === null || context === void 0 ? void 0 : context.appointmentsSummary) === null || _o === void 0 ? void 0 : _o.upcoming) === null || _p === void 0 ? void 0 : _p.length) || 0,
                    activePrescriptionsCount: ((_r = (_q = context === null || context === void 0 ? void 0 : context.exerciseAdherence) === null || _q === void 0 ? void 0 : _q.activePrescriptions) === null || _r === void 0 ? void 0 : _r.length) || 0,
                    examCount: ((_t = (_s = context === null || context === void 0 ? void 0 : context.examSummary) === null || _s === void 0 ? void 0 : _s.exams) === null || _t === void 0 ? void 0 : _t.length) || 0,
                    documentsCount: ((_v = (_u = context === null || context === void 0 ? void 0 : context.examSummary) === null || _u === void 0 ? void 0 : _u.documents) === null || _v === void 0 ? void 0 : _v.length) || 0,
                });
                contextPrompt_1 = CLINICAL_SYSTEM_PROMPT + '\n\n';
                if (context) {
                    contextPrompt_1 += '**Contexto do Paciente:**\n';
                    if (context.patientId)
                        contextPrompt_1 += "- ID do Paciente: ".concat(context.patientId, "\n");
                    if (context.patientName)
                        contextPrompt_1 += "- Nome: ".concat(context.patientName, "\n");
                    if (context.condition)
                        contextPrompt_1 += "- Condicao / Resumo clinico: ".concat(context.condition, "\n");
                    if (typeof context.sessionCount === 'number')
                        contextPrompt_1 += "- Sessoes realizadas: ".concat(context.sessionCount, "\n");
                    if (context.patientProfileSummary && context.patientProfileSummary.length > 0) {
                        contextPrompt_1 += '\n**Perfil Clinico Estruturado:**\n';
                        context.patientProfileSummary.forEach(function (item) {
                            contextPrompt_1 += "- ".concat(item, "\n");
                        });
                    }
                    if (context.medicalReturns && context.medicalReturns.length > 0) {
                        contextPrompt_1 += '\n**Retornos Medicos Registrados:**\n';
                        context.medicalReturns.forEach(function (medicalReturn, index) {
                            var date = medicalReturn.date ? "data ".concat(medicalReturn.date) : 'data nao informada';
                            var doctor = medicalReturn.doctorName ? "medico ".concat(medicalReturn.doctorName) : 'medico nao informado';
                            var phone = medicalReturn.doctorPhone ? " | tel ".concat(medicalReturn.doctorPhone) : '';
                            var period = medicalReturn.period ? " | periodo ".concat(medicalReturn.period) : '';
                            var reportDone = medicalReturn.reportDone === true
                                ? ' | relatorio feito'
                                : (medicalReturn.reportDone === false ? ' | relatorio pendente' : '');
                            var reportSent = medicalReturn.reportSent === true
                                ? ' | relatorio enviado'
                                : (medicalReturn.reportSent === false ? ' | relatorio nao enviado' : '');
                            var notes = medicalReturn.notes ? " | obs: ".concat(truncateText(medicalReturn.notes, 180)) : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(date, "; ").concat(doctor).concat(phone).concat(period).concat(reportDone).concat(reportSent).concat(notes, "\n");
                        });
                    }
                    if (context.surgeries && context.surgeries.length > 0) {
                        contextPrompt_1 += '\n**Historico de Cirurgias:**\n';
                        context.surgeries.forEach(function (surgery, index) {
                            var name = surgery.surgeryName || 'cirurgia sem nome';
                            var date = surgery.date ? " | data ".concat(surgery.date) : '';
                            var type = surgery.surgeryType ? " | tipo ".concat(surgery.surgeryType) : '';
                            var side = surgery.affectedSide ? " | lado ".concat(surgery.affectedSide) : '';
                            var surgeon = surgery.surgeon ? " | cirurgiao ".concat(surgery.surgeon) : '';
                            var hospital = surgery.hospital ? " | hospital ".concat(surgery.hospital) : '';
                            var complications = surgery.complications ? " | complicacoes ".concat(truncateText(surgery.complications, 120)) : '';
                            var notes = surgery.notes ? " | obs ".concat(truncateText(surgery.notes, 120)) : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(name).concat(date).concat(type).concat(side).concat(surgeon).concat(hospital).concat(complications).concat(notes, "\n");
                        });
                    }
                    if (context.activePathologies && context.activePathologies.length > 0) {
                        contextPrompt_1 += '\n**Patologias Ativas:**\n';
                        context.activePathologies.forEach(function (pathology, index) {
                            var status = pathology.status ? " | status ".concat(pathology.status) : '';
                            var severity = pathology.severity ? " | gravidade ".concat(pathology.severity) : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(pathology.name).concat(status).concat(severity, "\n");
                        });
                    }
                    if (context.activeGoals && context.activeGoals.length > 0) {
                        contextPrompt_1 += '\n**Metas Ativas do Tratamento:**\n';
                        context.activeGoals.forEach(function (goal, index) {
                            var status = goal.status ? " | status ".concat(goal.status) : '';
                            var priority = goal.priority ? " | prioridade ".concat(goal.priority) : '';
                            var target = goal.targetDate ? " | prazo ".concat(goal.targetDate) : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(goal.title).concat(status).concat(priority).concat(target, "\n");
                        });
                    }
                    if (context.appointmentsSummary) {
                        contextPrompt_1 += '\n**Resumo de Agendamentos:**\n';
                        contextPrompt_1 += "- Total registrados: ".concat(context.appointmentsSummary.total, "\n");
                        contextPrompt_1 += "- Concluidos: ".concat(context.appointmentsSummary.completed, "\n");
                        contextPrompt_1 += "- Faltas: ".concat(context.appointmentsSummary.noShow, "\n");
                        contextPrompt_1 += "- Cancelados/Reagendados: ".concat(context.appointmentsSummary.cancelled, "\n");
                        if (context.appointmentsSummary.lastCompleted) {
                            lastCompleted = context.appointmentsSummary.lastCompleted;
                            dateLabel = lastCompleted.date || 'data nao informada';
                            timeLabel = lastCompleted.time ? " ".concat(lastCompleted.time) : '';
                            typeLabel = lastCompleted.type ? " | tipo ".concat(lastCompleted.type) : '';
                            contextPrompt_1 += "- Ultimo atendimento concluido: ".concat(dateLabel).concat(timeLabel).concat(typeLabel, "\n");
                        }
                        if (context.appointmentsSummary.upcoming.length > 0) {
                            contextPrompt_1 += '- Proximos agendamentos:\n';
                            context.appointmentsSummary.upcoming.forEach(function (appointment, index) {
                                var dateLabel = appointment.date || 'data nao informada';
                                var timeLabel = appointment.time ? " ".concat(appointment.time) : '';
                                var statusLabel = appointment.status ? " | status ".concat(appointment.status) : '';
                                var typeLabel = appointment.type ? " | tipo ".concat(appointment.type) : '';
                                var notesLabel = appointment.notes ? " | obs ".concat(truncateText(appointment.notes, 90)) : '';
                                contextPrompt_1 += "  ".concat(index + 1, ". ").concat(dateLabel).concat(timeLabel).concat(statusLabel).concat(typeLabel).concat(notesLabel, "\n");
                            });
                        }
                    }
                    if (context.soapRecords && context.soapRecords.length > 0) {
                        contextPrompt_1 += '\n**SOAP Recente (Prontuario):**\n';
                        context.soapRecords.forEach(function (soap, index) {
                            var dateLabel = soap.date ? "data ".concat(soap.date) : 'data nao informada';
                            var sessionLabel = soap.sessionNumber !== undefined ? " | sessao ".concat(soap.sessionNumber) : '';
                            var painLabel = soap.painLevel !== undefined ? " | EVA ".concat(soap.painLevel, "/10") : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(dateLabel).concat(sessionLabel).concat(painLabel, "\n");
                            if (soap.subjective)
                                contextPrompt_1 += "   - S: ".concat(soap.subjective, "\n");
                            if (soap.objective)
                                contextPrompt_1 += "   - O: ".concat(soap.objective, "\n");
                            if (soap.assessment)
                                contextPrompt_1 += "   - A: ".concat(soap.assessment, "\n");
                            if (soap.plan)
                                contextPrompt_1 += "   - P: ".concat(soap.plan, "\n");
                        });
                    }
                    if (context.measurementTrends && context.measurementTrends.length > 0) {
                        contextPrompt_1 += '\n**Medicoes de Evolucao:**\n';
                        context.measurementTrends.forEach(function (measurement, index) {
                            var typeLabel = measurement.measurementType ? "".concat(measurement.measurementType, " - ") : '';
                            var unitLabel = measurement.unit || '';
                            var previousLabel = measurement.previousValue !== undefined
                                ? " | anterior ".concat(measurement.previousValue).concat(unitLabel)
                                : '';
                            var deltaLabel = measurement.delta !== undefined
                                ? " | delta ".concat(measurement.delta >= 0 ? '+' : '').concat(Math.round(measurement.delta * 100) / 100).concat(unitLabel)
                                : '';
                            var dateLabel = measurement.measuredAt ? " | data ".concat(measurement.measuredAt) : '';
                            var notesLabel = measurement.notes ? " | obs ".concat(measurement.notes) : '';
                            contextPrompt_1 += "".concat(index + 1, ". ").concat(typeLabel).concat(measurement.name, ": ").concat(measurement.latestValue).concat(unitLabel).concat(previousLabel).concat(deltaLabel).concat(dateLabel).concat(notesLabel, "\n");
                        });
                    }
                    if (context.exerciseAdherence) {
                        contextPrompt_1 += '\n**Exercicios Prescritos e Adesao:**\n';
                        contextPrompt_1 += "- Prescricoes ativas: ".concat(context.exerciseAdherence.activePrescriptions.length, "\n");
                        contextPrompt_1 += "- Logs de execucao nos ultimos ".concat(EXERCISE_ADHERENCE_WINDOW_DAYS, " dias: ").concat(context.exerciseAdherence.logsLast30Days, "\n");
                        if (typeof context.exerciseAdherence.adherencePercentage === 'number') {
                            contextPrompt_1 += "- Adesao estimada: ".concat(context.exerciseAdherence.adherencePercentage, "%\n");
                        }
                        if (context.exerciseAdherence.lastLogDate) {
                            contextPrompt_1 += "- Ultimo registro de exercicio: ".concat(context.exerciseAdherence.lastLogDate, "\n");
                        }
                        if (context.exerciseAdherence.activePrescriptions.length > 0) {
                            context.exerciseAdherence.activePrescriptions.forEach(function (exercise, index) {
                                var _a, _b;
                                var name = exercise.exerciseName || 'exercicio sem nome';
                                var frequency = exercise.frequency ? " | freq ".concat(exercise.frequency) : '';
                                var load = (exercise.sets !== undefined || exercise.reps !== undefined)
                                    ? " | ".concat((_a = exercise.sets) !== null && _a !== void 0 ? _a : '?', "x").concat((_b = exercise.reps) !== null && _b !== void 0 ? _b : '?')
                                    : '';
                                var duration = exercise.durationSeconds !== undefined
                                    ? " | duracao ".concat(exercise.durationSeconds, "s")
                                    : '';
                                var notes = exercise.notes ? " | obs ".concat(exercise.notes) : '';
                                contextPrompt_1 += "  ".concat(index + 1, ". ").concat(name).concat(frequency).concat(load).concat(duration).concat(notes, "\n");
                            });
                        }
                    }
                    if (context.examSummary && (context.examSummary.exams.length > 0 || context.examSummary.documents.length > 0)) {
                        contextPrompt_1 += '\n**Exames e Documentos Recentes:**\n';
                        if (context.examSummary.exams.length > 0) {
                            contextPrompt_1 += '- Exames:\n';
                            context.examSummary.exams.forEach(function (exam, index) {
                                var title = exam.title || 'exame sem titulo';
                                var type = exam.examType ? " | tipo ".concat(exam.examType) : '';
                                var date = exam.examDate ? " | data ".concat(exam.examDate) : '';
                                var files = typeof exam.filesCount === 'number' ? " | arquivos ".concat(exam.filesCount) : '';
                                var description = exam.description ? " | obs ".concat(exam.description) : '';
                                contextPrompt_1 += "  ".concat(index + 1, ". ").concat(title).concat(type).concat(date).concat(files).concat(description, "\n");
                            });
                        }
                        if (context.examSummary.documents.length > 0) {
                            contextPrompt_1 += '- Documentos:\n';
                            context.examSummary.documents.forEach(function (document, index) {
                                var fileName = document.fileName || 'documento sem nome';
                                var category = document.category ? " | categoria ".concat(document.category) : '';
                                var createdAt = document.createdAt ? " | data ".concat(document.createdAt) : '';
                                var description = document.description ? " | obs ".concat(document.description) : '';
                                contextPrompt_1 += "  ".concat(index + 1, ". ").concat(fileName).concat(category).concat(createdAt).concat(description, "\n");
                            });
                        }
                    }
                    if (context.recentEvolutions && context.recentEvolutions.length > 0) {
                        contextPrompt_1 += '\n**Evolucoes Recentes:**\n';
                        context.recentEvolutions.forEach(function (evo) {
                            contextPrompt_1 += "- ".concat(evo.date, ": ").concat(evo.notes, "\n");
                        });
                    }
                    contextPrompt_1 += '\n';
                }
                if (ragContext === null || ragContext === void 0 ? void 0 : ragContext.snippets.length) {
                    contextPrompt_1 += '**Evidencias Clinicas Recuperadas (RAG):**\n';
                    ragContext.snippets.forEach(function (snippet, index) {
                        var dateLabel = snippet.date ? " | ".concat(snippet.date) : '';
                        contextPrompt_1 += "".concat(index + 1, ". [").concat(snippet.sourceType).concat(dateLabel, "] ").concat(snippet.text, "\n");
                    });
                    contextPrompt_1 += '\nUse as evidencias acima como base factual prioritaria na resposta.\n\n';
                }
                contextPrompt_1 += '**Regra Factual de Resposta:**\n';
                contextPrompt_1 += '- Se houver data de retorno medico ou cirurgias no contexto, responda com esses dados explicitamente.\n';
                contextPrompt_1 += '- Se houver dados de agendamento, medições, SOAP, exercicios, exames ou documentos, use esses dados para responder com datas/valores concretos.\n';
                contextPrompt_1 += '- Quando o usuario pedir "quantidade de sessoes", priorize o campo "Sessoes realizadas" e o resumo de agendamentos.\n';
                contextPrompt_1 += '- Se o dado nao existir no contexto, diga "sem registro disponivel" (nao invente).\n';
                contextPrompt_1 += '- Nao responda que "nao tem acesso ao prontuario" quando o contexto clinico foi fornecido.\n\n';
                // Add PHI warning if detected
                if (phiCheck.hasPHI) {
                    contextPrompt_1 += '**Nota:** Informações sensíveis foram automaticamente removidas da consulta.\n\n';
                }
                vertexAI = new vertexai_1.VertexAI({
                    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
                    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
                });
                generativeModel = vertexAI.getGenerativeModel({
                    model: CLINICAL_CHAT_MODEL,
                    systemInstruction: contextPrompt_1,
                });
                sanitizedHistory = conversationHistory.slice(-12).map(function (msg) { return ({
                    role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
                    parts: [{ text: detectAndRedactPHI(msg.content || '').sanitized }],
                }); });
                contents = __spreadArray(__spreadArray([], sanitizedHistory, true), [
                    { role: 'user', parts: [{ text: sanitizedMessage }] },
                ], false);
                return [4 /*yield*/, generativeModel.generateContent({ contents: contents })];
            case 7:
                result = _1.sent();
                response = (_0 = (_z = (_y = (_x = (_w = result.response.candidates) === null || _w === void 0 ? void 0 : _w[0]) === null || _x === void 0 ? void 0 : _x.content) === null || _y === void 0 ? void 0 : _y.parts) === null || _z === void 0 ? void 0 : _z[0]) === null || _0 === void 0 ? void 0 : _0.text;
                if (!response) {
                    throw new Error('No response from AI model');
                }
                usageMetadata = result.response.usageMetadata;
                estimatedCost = usageMetadata
                    ? estimateCost(usageMetadata.totalTokenCount || 0, usageMetadata.totalTokenCount || 0)
                    : 0;
                // Log the interaction with safety metadata
                return [4 /*yield*/, db.collection('clinical_chat_logs').add({
                        userId: userId,
                        patientId: (context === null || context === void 0 ? void 0 : context.patientId) || null,
                        message: sanitizedMessage, // Store sanitized version
                        originalMessage: phiCheck.hasPHI ? message : null, // Store original only if PHI was redacted
                        response: response,
                        context: context || null,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        safetyMetadata: {
                            phiDetected: phiCheck.hasPHI,
                            phiTypes: phiCheck.detectedTypes,
                            estimatedCost: estimatedCost,
                            tokenCount: usageMetadata === null || usageMetadata === void 0 ? void 0 : usageMetadata.totalTokenCount,
                        },
                    })];
            case 8:
                // Log the interaction with safety metadata
                _1.sent();
                return [2 /*return*/, {
                        success: true,
                        response: response,
                        timestamp: new Date().toISOString(),
                        disclaimers: phiCheck.hasPHI ? ['Informações sensíveis foram removidas automaticamente.'] : [],
                        usage: {
                            remaining: (usageCheck.remaining || 1) - 1,
                            limit: MAX_DAILY_REQUESTS,
                        },
                    }];
            case 9:
                error_5 = _1.sent();
                logger.error('AI clinical chat failed', { error: error_5, userId: userId });
                throw new https_1.HttpsError('internal', "Failed to get AI response: ".concat(error_5.message));
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.aiClinicalChatHandler = aiClinicalChatHandler;
exports.aiClinicalChat = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
}, exports.aiClinicalChatHandler);
/**
 * AI-powered exercise recommendation (enhanced)
 */
var aiExerciseRecommendationChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, patientData, question, cacheParams, response, error_6;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, patientData = _a.patientData, question = _a.question;
                if (!patientData || !question) {
                    throw new https_1.HttpsError('invalid-argument', 'patientData and question are required');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                cacheParams = {
                    condition: patientData.condition,
                    limitations: patientData.limitations.sort(),
                    goals: patientData.goals.sort(),
                    question: question,
                };
                return [4 /*yield*/, (0, idempotency_1.withIdempotency)('EXERCISE_RECOMMENDATION_CHAT', userId, cacheParams, function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, generateExerciseRecommendation(patientData, question)];
                    }); }); }, { cacheTtl: 10 * 60 * 1000 } // 10 minutes cache
                    )];
            case 2:
                response = _c.sent();
                return [2 /*return*/, {
                        success: true,
                        response: response,
                        timestamp: new Date().toISOString(),
                    }];
            case 3:
                error_6 = _c.sent();
                logger.error('AI exercise recommendation failed', { error: error_6, userId: userId });
                throw new https_1.HttpsError('internal', "Failed to get recommendation: ".concat(error_6.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.aiExerciseRecommendationChatHandler = aiExerciseRecommendationChatHandler;
exports.aiExerciseRecommendationChat = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
}, exports.aiExerciseRecommendationChatHandler);
/**
 * AI SOAP note generator with chat
 */
var aiSoapNoteChatHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, patientContext, subjective, objective, assistantNeeded, prompt_1, vertexAI, model, result, response, error_7;
    var _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, patientContext = _a.patientContext, subjective = _a.subjective, objective = _a.objective, assistantNeeded = _a.assistantNeeded;
                if (!patientContext) {
                    throw new https_1.HttpsError('invalid-argument', 'patientContext is required');
                }
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 4]);
                prompt_1 = buildSOAPPrompt(patientContext, subjective, objective, assistantNeeded);
                vertexAI = new vertexai_1.VertexAI({
                    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
                    location: 'us-central1',
                });
                model = vertexAI.getGenerativeModel({
                    model: CLINICAL_CHAT_MODEL,
                    systemInstruction: "Voc\u00EA \u00E9 um especialista em documenta\u00E7\u00E3o fisioterap\u00EAutica. Gere notas SOAP profissionais e concisas.",
                });
                return [4 /*yield*/, model.generateContent(prompt_1)];
            case 2:
                result = _h.sent();
                response = (_g = (_f = (_e = (_d = (_c = result.response.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text;
                return [2 /*return*/, {
                        success: true,
                        soapNote: response,
                        timestamp: new Date().toISOString(),
                    }];
            case 3:
                error_7 = _h.sent();
                logger.error('AI SOAP note generation failed', { error: error_7, userId: userId });
                throw new https_1.HttpsError('internal', "Failed to generate SOAP note: ".concat(error_7.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.aiSoapNoteChatHandler = aiSoapNoteChatHandler;
exports.aiSoapNoteChat = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
}, exports.aiSoapNoteChatHandler);
/**
 * Auto-suggestions based on patient history
 */
var aiGetSuggestionsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, patientId, suggestionType, patientDoc, patient, evolutionsSnapshot, recentEvolutions, sessionsSnapshot, recentSessions, suggestions, error_8;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, patientId = _a.patientId, suggestionType = _a.suggestionType;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId is required');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db.collection('patients').doc(patientId).get()];
            case 2:
                patientDoc = _c.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Patient not found');
                }
                patient = patientDoc.data();
                return [4 /*yield*/, db
                        .collection('evolutions')
                        .where('patientId', '==', patientId)
                        .orderBy('createdAt', 'desc')
                        .limit(5)
                        .get()];
            case 3:
                evolutionsSnapshot = _c.sent();
                recentEvolutions = evolutionsSnapshot.docs.map(function (doc) { return doc.data(); });
                return [4 /*yield*/, db
                        .collection('treatment_sessions')
                        .where('patientId', '==', patientId)
                        .orderBy('createdAt', 'desc')
                        .limit(10)
                        .get()];
            case 4:
                sessionsSnapshot = _c.sent();
                recentSessions = sessionsSnapshot.docs.map(function (doc) { return doc.data(); });
                return [4 /*yield*/, generateSuggestions(patient, recentEvolutions, recentSessions, suggestionType)];
            case 5:
                suggestions = _c.sent();
                return [2 /*return*/, {
                        success: true,
                        suggestions: suggestions,
                        timestamp: new Date().toISOString(),
                    }];
            case 6:
                error_8 = _c.sent();
                if (error_8.code === 'not-found') {
                    throw error_8;
                }
                logger.error('AI suggestions failed', { error: error_8, userId: userId, patientId: patientId });
                throw new https_1.HttpsError('internal', "Failed to generate suggestions: ".concat(error_8.message));
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.aiGetSuggestionsHandler = aiGetSuggestionsHandler;
exports.aiGetSuggestions = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 90,
}, exports.aiGetSuggestionsHandler);
// Helper functions
function generateExerciseRecommendation(patientData, question) {
    return __awaiter(this, void 0, void 0, function () {
        var vertexAI, model, prompt, result;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    vertexAI = new vertexai_1.VertexAI({
                        project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
                        location: 'us-central1',
                    });
                    model = vertexAI.getGenerativeModel({
                        model: CLINICAL_CHAT_MODEL,
                    });
                    prompt = "Como fisioterapeuta especialista, recomende exerc\u00EDcios para:\n\n**Paciente:** ".concat(patientData.name, "\n**Condi\u00E7\u00E3o:** ").concat(patientData.condition, "\n**Limita\u00E7\u00F5es:** ").concat(patientData.limitations.join(', '), "\n**Objetivos:** ").concat(patientData.goals.join(', '), "\n**Sess\u00E3o n\u00FAmero:** ").concat(patientData.sessionCount, "\n**Equipamentos dispon\u00EDveis:** ").concat(((_a = patientData.equipment) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Nenhum', "\n\n**Pergunta do profissional:** ").concat(question, "\n\nForne\u00E7a recomenda\u00E7\u00F5es espec\u00EDficas, incluindo:\n1. Exerc\u00EDcios recomendados (s\u00E9ries, repeti\u00E7\u00F5es, descanso)\n2. Progress\u00E3o esperada\n3. Precau\u00E7\u00F5es e contraindica\u00E7\u00F5es\n4. Dicas para execu\u00E7\u00E3o correta");
                    return [4 /*yield*/, model.generateContent(prompt)];
                case 1:
                    result = _g.sent();
                    return [2 /*return*/, ((_f = (_e = (_d = (_c = (_b = result.response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) || ''];
            }
        });
    });
}
function buildSOAPPrompt(patientContext, subjective, objective, assistantNeeded) {
    var prompt = "Paciente: ".concat(patientContext.patientName, "\n");
    prompt += "Condi\u00E7\u00E3o: ".concat(patientContext.condition, "\n");
    prompt += "Sess\u00E3o: ".concat(patientContext.sessionNumber, "\n\n");
    if (subjective) {
        prompt += "**S (Subjetivo):** ".concat(subjective, "\n\n");
    }
    if (objective) {
        prompt += "**O (Objetivo):** ".concat(objective, "\n\n");
    }
    prompt += '**Complete a nota SOAP fornecendo:**\n';
    if (assistantNeeded === 'assessment' || assistantNeeded === 'both' || assistantNeeded === 'full') {
        prompt += '- **A (Avaliação):** Análise clínica baseada nas informações\n';
    }
    if (assistantNeeded === 'plan' || assistantNeeded === 'both' || assistantNeeded === 'full') {
        prompt += '- **P (Plano):** Plano de tratamento e próximos passos\n';
    }
    if (assistantNeeded === 'full') {
        prompt += '\nForneça também S e O se não foram fornecidos.';
    }
    return prompt;
}
function generateSuggestions(patient, evolutions, sessions, type) {
    return __awaiter(this, void 0, void 0, function () {
        var vertexAI, model, context, prompt, result, response;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    vertexAI = new vertexai_1.VertexAI({
                        project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
                        location: 'us-central1',
                    });
                    model = vertexAI.getGenerativeModel({
                        model: CLINICAL_CHAT_MODEL,
                    });
                    context = {
                        condition: patient.condition,
                        sessionCount: sessions.length,
                        recentProgress: evolutions.slice(0, 3).map(function (e) { return e.notes; }).join('\n'),
                    };
                    prompt = '';
                    if (type === 'exercises' || type === 'all') {
                        prompt += "Sugira 3-5 exerc\u00EDcios apropriados baseados no hist\u00F3rico do paciente.\n";
                    }
                    if (type === 'treatment' || type === 'all') {
                        prompt += "Sugira ajustes no plano de tratamento baseado no progresso recente.\n";
                    }
                    if (type === 'homecare' || type === 'all') {
                        prompt += "Sugira cuidados domiciliares que o paciente pode realizar.\n";
                    }
                    prompt += "\n**Contexto do Paciente:**\n".concat(JSON.stringify(context, null, 2));
                    prompt += "\n\nResponda em formato JSON com estrutura:\n{\n  \"exercises\": [{name, sets, reps, rest, instructions}],\n  \"treatmentAdjustments\": [{area, suggestion, rationale}],\n  \"homeCare\": [{activity, frequency, instructions}]\n}";
                    return [4 /*yield*/, model.generateContent(prompt)];
                case 1:
                    result = _f.sent();
                    response = ((_e = (_d = (_c = (_b = (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '{}';
                    try {
                        return [2 /*return*/, JSON.parse(response)];
                    }
                    catch (_g) {
                        // If JSON parsing fails, return structured fallback
                        return [2 /*return*/, {
                                exercises: [],
                                treatmentAdjustments: [],
                                homeCare: [],
                                rawResponse: response,
                            }];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
