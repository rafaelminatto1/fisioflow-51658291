"use strict";
/**
 * Cloud Speech-to-Text Integration
 *
 * Provides professional speech transcription with medical context
 * Free tier: 60 minutes/month
 *
 * @module lib/speech-to-text
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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechToTextClient = void 0;
exports.getSpeechToTextClient = getSpeechToTextClient;
exports.transcribeConsultationAudio = transcribeConsultationAudio;
exports.transcribeAudio = transcribeAudio;
exports.isSpeechToTextEnabled = isSpeechToTextEnabled;
exports.getSupportedLanguages = getSupportedLanguages;
var speech_1 = require("@google-cloud/speech");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('speech-to-text');
// ============================================================================
// CONFIGURATION
// ============================================================================
var PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
var SPEECH_ENABLED = process.env.CLOUD_SPEECH_ENABLED !== 'false';
// Medical terms in Portuguese for better transcription accuracy
var MEDICAL_PHRASES_PT = [
    // General physiotherapy terms
    'fisioterapia', 'terapia', 'tratamento', 'sessão', 'paciente', 'terapeuta',
    'avaliação', 'evolução', 'diagnóstico', 'prognóstico', 'anamnese',
    // Body parts and movements
    'coluna', 'vertebral', 'cervical', 'torácica', 'lombar', 'sacral', 'cóccix',
    'ombro', 'cotovelo', 'punho', 'mão', 'dedo', 'quiro',
    'quadril', 'joelho', 'tornozelo', 'pé', 'podal',
    'flexão', 'extensão', 'abdução', 'adução', 'rotação', 'circundução',
    'pronação', 'supinação', 'eversão', 'inversão', 'dorsiflexão', 'plantiflexão',
    // Conditions and symptoms
    'dor', 'edema', 'inchaço', 'inflamação', 'contratura', 'espasmo',
    'fraqueza', 'paresia', 'plegia', 'parestesia', 'formigamento', 'adormecimento',
    'limitação', 'rigidez', 'instabilidade', 'hiper mobilidade', 'laxidão',
    // Assessment terms
    'amplitude de movimento', 'ADM', 'ganho de movimento', 'range of motion',
    'força muscular', 'graduação de força', 'escala de oxford', 'escala de lovett',
    'reflexos', 'reflexo tendinoso', 'reflexo osteotendinoso', 'rotuliano',
    'aquileu', 'bicipital', 'tricipital', 'patelar',
    // Treatment techniques
    'exercício', 'alongamento', 'stretching', 'fortalecimento', 'musculação',
    'mobilização', 'manipulação', 'massagem', 'liberação miofascial',
    'ultrassom', 'tens', 'corrente galvânica', 'diatermia', 'crioterapia', 'termoterapia',
    'tração', 'distração', 'pompage', 'mulligan', 'maitland', 'kaltenborn',
    // Posture and gait
    'postura', 'postural', 'escoliose', 'hiperlordose', 'cifose', 'lordose',
    'marcha', 'passada', 'base de suporte', 'balanceio', 'antepé', 'retropé',
    'cata', 'ataxia', 'dismetria', 'claudicação',
    // SOAP notes
    'subjetivo', 'objetivo', 'avaliação', 'plano', 'SOAP',
    'queixa principal', 'QP', 'história da doença atual', 'HDA',
    'antecedentes', 'história patológica', 'HP', 'história familiar',
    // Exercise related
    'série', 'repetição', 'reps', 'descanso', 'intervalo', 'carga',
    'isometria', 'isotônico', 'concêntrico', 'excêntrico',
    'propriocepção', 'equilíbrio', 'coordenação', 'agilidade', 'resistência',
    // Pain assessment
    'escala visual analógica', 'EVA', 'escala numérica', 'diagrama corporal',
    'localização', 'irradiação', 'intensidade', 'duração', 'frequência', 'característica',
    // Functional assessment
    'atividades de vida diária', 'AVD', 'atividades instrumentais', 'AIVD',
    'escala de berg', 'tineti', 'timed up and go', 'TUG', 'caminhada de 6 minutos',
];
// ============================================================================
// SPEECH-TO-TEXT CLIENT CLASS
// ============================================================================
/**
 * Cloud Speech-to-Text Client
 */
var SpeechToTextClient = /** @class */ (function () {
    function SpeechToTextClient() {
        this.client = new speech_1.SpeechClient({
            projectId: PROJECT_ID,
        });
        logger.info('Speech-to-Text client initialized');
    }
    /**
     * Get audio encoding from MIME type
     */
    SpeechToTextClient.prototype.getEncodingFromMimeType = function (mimeType) {
        var encodingMap = {
            'audio/webm': 'OGG_OPUS',
            'audio/ogg': 'OGG_OPUS',
            'audio/flac': 'FLAC',
            'audio/wav': 'LINEAR16',
            'audio/wave': 'LINEAR16',
            'audio/x-wav': 'LINEAR16',
            'audio/mpeg': 'MP3',
            'audio/mp3': 'MP3',
            'audio/mp4': 'FLAC',
            'audio/x-m4a': 'FLAC',
        };
        return encodingMap[mimeType.toLowerCase()] || 'LINEAR16';
    };
    /**
     * Get sample rate for audio format
     */
    SpeechToTextClient.prototype.getSampleRate = function (mimeType) {
        // Default sample rates (adjust based on recording setup)
        if (mimeType.includes('flac')) {
            return 16000; // FLAC typically uses lower sample rates
        }
        if (mimeType.includes('mp3')) {
            return 16000;
        }
        return 48000; // Default for web recordings
    };
    /**
     * Convert Google Cloud time to milliseconds
     */
    SpeechToTextClient.prototype.convertTime = function (time) {
        if (!time)
            return 0;
        return (time.seconds || 0) * 1000 + (time.nanos || 0) / 1000000;
    };
    /**
     * Get speech contexts based on context type
     */
    SpeechToTextClient.prototype.getSpeechContexts = function (context) {
        if (context === 'medical') {
            return [
                {
                    phrases: MEDICAL_PHRASES_PT,
                    boost: 2.0, // Boost recognition of medical terms
                },
            ];
        }
        return [];
    };
    /**
     * Transcribe audio data
     */
    SpeechToTextClient.prototype.transcribeAudio = function (audioData_1, mimeType_1) {
        return __awaiter(this, arguments, void 0, function (audioData, mimeType, options) {
            var _a, languageCode, _b, enableAutomaticPunctuation, _c, enableWordTimeOffsets, _d, profanityFilter, _e, speechContexts, _f, maxAlternatives, request, response, result, alternatives, best, transcriptionResult, error_1;
            var _this = this;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _a = options.languageCode, languageCode = _a === void 0 ? 'pt-BR' : _a, _b = options.enableAutomaticPunctuation, enableAutomaticPunctuation = _b === void 0 ? true : _b, _c = options.enableWordTimeOffsets, enableWordTimeOffsets = _c === void 0 ? true : _c, _d = options.profanityFilter, profanityFilter = _d === void 0 ? false : _d, _e = options.speechContexts, speechContexts = _e === void 0 ? [] : _e, _f = options.maxAlternatives, maxAlternatives = _f === void 0 ? 1 : _f;
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        logger.info('Starting transcription', {
                            mimeType: mimeType,
                            languageCode: languageCode,
                            audioLength: typeof audioData === 'string' ? audioData.length : audioData.length,
                        });
                        request = {
                            config: {
                                encoding: this.getEncodingFromMimeType(mimeType),
                                sampleRateHertz: this.getSampleRate(mimeType),
                                languageCode: languageCode,
                                enableAutomaticPunctuation: enableAutomaticPunctuation,
                                enableWordTimeOffsets: enableWordTimeOffsets,
                                profanityFilter: profanityFilter,
                                speechContexts: speechContexts,
                                maxAlternatives: maxAlternatives,
                                model: 'medical_dictation', // Use medical dictation model for better accuracy
                            },
                            audio: {
                                content: typeof audioData === 'string' ? audioData : audioData.toString('base64'),
                            },
                        };
                        return [4 /*yield*/, this.client.recognize(request)];
                    case 2:
                        response = (_g.sent())[0];
                        if (!response.results || response.results.length === 0) {
                            throw new Error('No transcription results returned');
                        }
                        result = response.results[0];
                        alternatives = result.alternatives || [];
                        if (alternatives.length === 0) {
                            throw new Error('No transcription alternatives returned');
                        }
                        best = alternatives[0];
                        if (!best.transcript) {
                            throw new Error('Empty transcription returned');
                        }
                        transcriptionResult = {
                            transcription: best.transcript,
                            confidence: best.confidence || 0,
                            languageCode: languageCode,
                            alternatives: alternatives.slice(1).map(function (alt) { return ({
                                transcription: alt.transcript || '',
                                confidence: alt.confidence || 0,
                            }); }),
                        };
                        // Add word-level timestamps if available
                        if (best.words && best.words.length > 0) {
                            transcriptionResult.words = best.words.map(function (word) { return ({
                                word: word.word || '',
                                startTime: _this.convertTime(word.startTime),
                                endTime: _this.convertTime(word.endTime),
                                confidence: word.confidence || 0,
                            }); });
                        }
                        logger.info('Transcription completed', {
                            length: transcriptionResult.transcription.length,
                            confidence: transcriptionResult.confidence,
                        });
                        return [2 /*return*/, transcriptionResult];
                    case 3:
                        error_1 = _g.sent();
                        logger.error('Transcription failed:', error_1);
                        throw new Error("Speech-to-Text failed: ".concat(error_1.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Transcribe with medical context (for physiotherapy consultations)
     */
    SpeechToTextClient.prototype.transcribeWithMedicalContext = function (audioData_1, mimeType_1) {
        return __awaiter(this, arguments, void 0, function (audioData, mimeType, languageCode) {
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.transcribeAudio(audioData, mimeType, {
                        languageCode: languageCode,
                        enableAutomaticPunctuation: true,
                        enableWordTimeOffsets: true,
                        profanityFilter: true,
                        speechContexts: this.getSpeechContexts('medical'),
                    })];
            });
        });
    };
    /**
     * Transcribe a long audio file using async recognition
     */
    SpeechToTextClient.prototype.transcribeLongAudio = function (audioUri_1) {
        return __awaiter(this, arguments, void 0, function (audioUri, languageCode, context) {
            var request, operation, response, transcript, confidence, error_2;
            var _a, _b, _c;
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            if (context === void 0) { context = 'medical'; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 3, , 4]);
                        logger.info('Starting long audio transcription', { audioUri: audioUri });
                        request = {
                            config: {
                                encoding: 'FLAC',
                                sampleRateHertz: 16000,
                                languageCode: languageCode,
                                enableAutomaticPunctuation: true,
                                enableWordTimeOffsets: true,
                                speechContexts: this.getSpeechContexts(context),
                            },
                            audio: {
                                uri: audioUri,
                            },
                        };
                        return [4 /*yield*/, this.client.longRunningRecognize(request)];
                    case 1:
                        operation = (_d.sent())[0];
                        return [4 /*yield*/, operation.promise()];
                    case 2:
                        response = (_d.sent())[0];
                        if (!response.results || response.results.length === 0) {
                            throw new Error('No transcription results returned');
                        }
                        transcript = response.results
                            .map(function (result) { var _a, _b; return ((_b = (_a = result.alternatives) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.transcript) || ''; })
                            .join(' ');
                        confidence = ((_c = (_b = (_a = response.results[0]) === null || _a === void 0 ? void 0 : _a.alternatives) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.confidence) || 0;
                        return [2 /*return*/, {
                                transcription: transcript,
                                confidence: confidence,
                                languageCode: languageCode,
                            }];
                    case 3:
                        error_2 = _d.sent();
                        logger.error('Long audio transcription failed:', error_2);
                        throw new Error("Long audio transcription failed: ".concat(error_2.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stream audio for real-time transcription
     */
    SpeechToTextClient.prototype.streamTranscription = function (_audioStream_1, _mimeType_1) {
        return __asyncGenerator(this, arguments, function streamTranscription_1(_audioStream, _mimeType, _languageCode) {
            if (_languageCode === void 0) { _languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger.info('Starting streaming transcription');
                        return [4 /*yield*/, __await('')];
                    case 1: 
                    // Note: Streaming requires a different client setup
                    // This is a placeholder for future implementation
                    return [4 /*yield*/, _a.sent()];
                    case 2:
                        // Note: Streaming requires a different client setup
                        // This is a placeholder for future implementation
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SpeechToTextClient;
}());
exports.SpeechToTextClient = SpeechToTextClient;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
var sttClient = null;
/**
 * Get or create Speech-to-Text client (singleton)
 */
function getSpeechToTextClient() {
    if (!sttClient) {
        sttClient = new SpeechToTextClient();
    }
    return sttClient;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Transcribe consultation audio (with medical context)
 */
function transcribeConsultationAudio(audioData, mimeType) {
    return __awaiter(this, void 0, void 0, function () {
        var client, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!SPEECH_ENABLED) {
                        logger.warn('Cloud Speech-to-Text disabled');
                        throw new Error('Cloud Speech-to-Text is disabled');
                    }
                    client = getSpeechToTextClient();
                    return [4 /*yield*/, client.transcribeWithMedicalContext(audioData, mimeType)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.transcription];
            }
        });
    });
}
/**
 * Transcribe with options
 */
function transcribeAudio(audioData, mimeType, options) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            if (!SPEECH_ENABLED) {
                logger.warn('Cloud Speech-to-Text disabled');
                throw new Error('Cloud Speech-to-Text is disabled');
            }
            client = getSpeechToTextClient();
            return [2 /*return*/, client.transcribeAudio(audioData, mimeType, options)];
        });
    });
}
/**
 * Check if Cloud Speech-to-Text is enabled
 */
function isSpeechToTextEnabled() {
    return SPEECH_ENABLED;
}
/**
 * Get supported languages
 */
function getSupportedLanguages() {
    return [
        'pt-BR', // Portuguese (Brazil)
        'en-US', // English (US)
        'es-ES', // Spanish
        'fr-FR', // French
    ];
}
