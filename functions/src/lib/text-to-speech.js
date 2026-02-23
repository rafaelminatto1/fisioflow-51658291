"use strict";
/**
 * Cloud Text-to-Speech Integration
 *
 * Provides speech synthesis for accessibility and exercise instructions
 * Free tier: 4 million characters/month (standard voices)
 *
 * @module lib/text-to-speech
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
exports.TextToSpeechClient = void 0;
exports.getTextToSpeechClient = getTextToSpeechClient;
exports.synthesizeForExercise = synthesizeForExercise;
exports.synthesizeForAccessibility = synthesizeForAccessibility;
exports.synthesizeCountdown = synthesizeCountdown;
exports.isTextToSpeechEnabled = isTextToSpeechEnabled;
exports.getSupportedLanguages = getSupportedLanguages;
var text_to_speech_1 = require("@google-cloud/text-to-speech");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('text-to-speech');
// ============================================================================
// CONFIGURATION
// ============================================================================
var PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
var TTS_ENABLED = process.env.CLOUD_TTS_ENABLED !== 'false';
// ============================================================================
// TEXT-TO-SPEECH CLIENT CLASS
// ============================================================================
/**
 * Cloud Text-to-Speech Client
 */
var TextToSpeechClient = /** @class */ (function () {
    function TextToSpeechClient() {
        this.client = new text_to_speech_1.TextToSpeechClient({
            projectId: PROJECT_ID,
        });
        logger.info('Text-to-Speech client initialized');
    }
    /**
     * Map our audio encoding to Google's enum
     */
    TextToSpeechClient.prototype.getAudioEncoding = function (encoding) {
        var encodingMap = {
            'MP3': text_to_speech_1.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
            'OGG_OPUS': text_to_speech_1.protos.google.cloud.texttospeech.v1.AudioEncoding.OGG_OPUS,
            'LINEAR16': text_to_speech_1.protos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
        };
        return encodingMap[encoding] || text_to_speech_1.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3;
    };
    /**
     * Map gender to SSML voice gender
     */
    TextToSpeechClient.prototype.getSSMLGender = function (gender) {
        var genderMap = {
            'MALE': text_to_speech_1.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE,
            'FEMALE': text_to_speech_1.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
            'NEUTRAL': text_to_speech_1.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
        };
        return genderMap[gender || 'NEUTRAL'];
    };
    /**
     * Synthesize speech from plain text
     */
    TextToSpeechClient.prototype.synthesize = function (text_1) {
        return __awaiter(this, arguments, void 0, function (text, options) {
            var _a, languageCode, _b, voiceGender, _c, speakingRate, _d, pitch, _e, volumeGainDb, _f, audioEncoding, request, response, result, timepoints, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _a = options.languageCode, languageCode = _a === void 0 ? 'pt-BR' : _a, _b = options.voiceGender, voiceGender = _b === void 0 ? 'NEUTRAL' : _b, _c = options.speakingRate, speakingRate = _c === void 0 ? 1.0 : _c, _d = options.pitch, pitch = _d === void 0 ? 0.0 : _d, _e = options.volumeGainDb, volumeGainDb = _e === void 0 ? 0.0 : _e, _f = options.audioEncoding, audioEncoding = _f === void 0 ? 'MP3' : _f;
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        logger.info('Synthesizing speech', {
                            textLength: text.length,
                            languageCode: languageCode,
                        });
                        request = {
                            input: {
                                text: text,
                            },
                            voice: {
                                languageCode: languageCode,
                                ssmlGender: this.getSSMLGender(voiceGender),
                            },
                            audioConfig: {
                                audioEncoding: this.getAudioEncoding(audioEncoding),
                                speakingRate: speakingRate,
                                pitch: pitch,
                                volumeGainDb: volumeGainDb,
                            },
                        };
                        return [4 /*yield*/, this.client.synthesizeSpeech(request)];
                    case 2:
                        response = (_g.sent())[0];
                        if (!response.audioContent) {
                            throw new Error('No audio content in response');
                        }
                        result = {
                            audioContent: Buffer.from(response.audioContent),
                        };
                        timepoints = response.timepoints;
                        if (timepoints && timepoints.length > 0) {
                            result.timepoints = timepoints.map(function (tp) { return ({
                                tagName: tp.tagName || '',
                                timeSeconds: tp.timeSeconds || 0,
                            }); });
                        }
                        logger.info('Speech synthesis completed', {
                            audioLength: result.audioContent.length,
                        });
                        return [2 /*return*/, result];
                    case 3:
                        error_1 = _g.sent();
                        logger.error('Speech synthesis failed:', error_1);
                        throw new Error("Text-to-Speech failed: ".concat(error_1.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synthesize speech from SSML
     */
    TextToSpeechClient.prototype.synthesizeWithSSML = function (ssml_1) {
        return __awaiter(this, arguments, void 0, function (ssml, languageCode, audioEncoding) {
            var request, response, error_2;
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            if (audioEncoding === void 0) { audioEncoding = 'MP3'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger.info('Synthesizing SSML', {
                            ssmlLength: ssml.length,
                            languageCode: languageCode,
                        });
                        request = {
                            input: {
                                ssml: ssml,
                            },
                            voice: {
                                languageCode: languageCode,
                                ssmlGender: this.getSSMLGender('NEUTRAL'),
                            },
                            audioConfig: {
                                audioEncoding: this.getAudioEncoding(audioEncoding),
                                speakingRate: 1.0,
                                pitch: 0.0,
                            },
                        };
                        return [4 /*yield*/, this.client.synthesizeSpeech(request)];
                    case 1:
                        response = (_a.sent())[0];
                        if (!response.audioContent) {
                            throw new Error('No audio content in response');
                        }
                        return [2 /*return*/, {
                                audioContent: Buffer.from(response.audioContent),
                            }];
                    case 2:
                        error_2 = _a.sent();
                        logger.error('SSML synthesis failed:', error_2);
                        throw new Error("SSML synthesis failed: ".concat(error_2.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Synthesize exercise instruction with SSML
     */
    TextToSpeechClient.prototype.synthesizeExerciseInstruction = function (exerciseName_1, instruction_1) {
        return __awaiter(this, arguments, void 0, function (exerciseName, instruction, languageCode) {
            var ssml, result;
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ssml = "\n      <speak>\n        <p>\n          <s>Exerc\u00EDcio: <emphasis level=\"strong\">".concat(exerciseName, "</emphasis></s>\n          <s><break time=\"500ms\"/>").concat(instruction, "</s>\n          <s><break time=\"300ms\"/>Prepare-se para come\u00E7ar.</s>\n          <s><break time=\"1s\"/>Inicie.</s>\n        </p>\n      </speak>\n    ");
                        return [4 /*yield*/, this.synthesizeWithSSML(ssml, languageCode)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.audioContent];
                }
            });
        });
    };
    /**
     * Synthesize for accessibility (slower, clearer speech)
     */
    TextToSpeechClient.prototype.synthesizeAccessibility = function (text_1) {
        return __awaiter(this, arguments, void 0, function (text, languageCode) {
            var result;
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.synthesize(text, {
                            languageCode: languageCode,
                            speakingRate: 0.9, // Slower for better comprehension
                            pitch: 0.0,
                            audioEncoding: 'MP3',
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.audioContent];
                }
            });
        });
    };
    /**
     * Synthesize countdown
     */
    TextToSpeechClient.prototype.synthesizeCountdown = function () {
        return __awaiter(this, arguments, void 0, function (startFrom, languageCode) {
            var numbers, ssml, result;
            if (startFrom === void 0) { startFrom = 3; }
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        numbers = Array.from({ length: startFrom }, function (_, i) { return startFrom - i; });
                        ssml = "<speak>".concat(numbers.map(function (n) { return "<s>".concat(n, "</s><break time=\"1000ms\"/>"); }).join(''), "</speak>");
                        return [4 /*yield*/, this.synthesizeWithSSML(ssml, languageCode)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.audioContent];
                }
            });
        });
    };
    /**
     * Synthesize encouragement message
     */
    TextToSpeechClient.prototype.synthesizeEncouragement = function () {
        return __awaiter(this, arguments, void 0, function (message, languageCode) {
            var ssml, result;
            if (message === void 0) { message = 'Ótimo trabalho! Continue assim.'; }
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ssml = "\n      <speak>\n        <p>\n          <s><emphasis level=\"strong\">".concat(message, "</emphasis></s>\n        </p>\n      </speak>\n    ");
                        return [4 /*yield*/, this.synthesizeWithSSML(ssml, languageCode)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.audioContent];
                }
            });
        });
    };
    /**
     * List available voices for a language
     */
    TextToSpeechClient.prototype.listVoices = function () {
        return __awaiter(this, arguments, void 0, function (languageCode) {
            var response, error_3;
            var _a;
            if (languageCode === void 0) { languageCode = 'pt-BR'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.listVoices({
                                languageCode: languageCode,
                            })];
                    case 1:
                        response = (_b.sent())[0];
                        return [2 /*return*/, (((_a = response.voices) === null || _a === void 0 ? void 0 : _a.map(function (voice) { return ({
                                name: voice.name || '',
                                gender: voice.ssmlGenderName || '',
                                languageCodes: voice.languageCodes || [],
                            }); })) || [])];
                    case 2:
                        error_3 = _b.sent();
                        logger.error('Failed to list voices:', error_3);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TextToSpeechClient;
}());
exports.TextToSpeechClient = TextToSpeechClient;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
var ttsClient = null;
/**
 * Get or create Text-to-Speech client (singleton)
 */
function getTextToSpeechClient() {
    if (!ttsClient) {
        ttsClient = new TextToSpeechClient();
    }
    return ttsClient;
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Synthesize exercise instruction
 */
function synthesizeForExercise(exerciseName, instruction) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            if (!TTS_ENABLED) {
                logger.warn('Cloud Text-to-Speech disabled');
                throw new Error('Cloud Text-to-Speech is disabled');
            }
            client = getTextToSpeechClient();
            return [2 /*return*/, client.synthesizeExerciseInstruction(exerciseName, instruction)];
        });
    });
}
/**
 * Synthesize for accessibility
 */
function synthesizeForAccessibility(text_1) {
    return __awaiter(this, arguments, void 0, function (text, languageCode) {
        var client;
        if (languageCode === void 0) { languageCode = 'pt-BR'; }
        return __generator(this, function (_a) {
            if (!TTS_ENABLED) {
                logger.warn('Cloud Text-to-Speech disabled');
                throw new Error('Cloud Text-to-Speech is disabled');
            }
            client = getTextToSpeechClient();
            return [2 /*return*/, client.synthesizeAccessibility(text, languageCode)];
        });
    });
}
/**
 * Synthesize countdown
 */
function synthesizeCountdown() {
    return __awaiter(this, arguments, void 0, function (startFrom) {
        var client;
        if (startFrom === void 0) { startFrom = 3; }
        return __generator(this, function (_a) {
            if (!TTS_ENABLED) {
                logger.warn('Cloud Text-to-Speech disabled');
                throw new Error('Cloud Text-to-Speech is disabled');
            }
            client = getTextToSpeechClient();
            return [2 /*return*/, client.synthesizeCountdown(startFrom)];
        });
    });
}
/**
 * Check if Cloud Text-to-Speech is enabled
 */
function isTextToSpeechEnabled() {
    return TTS_ENABLED;
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
