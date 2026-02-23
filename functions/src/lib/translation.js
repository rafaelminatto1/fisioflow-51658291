"use strict";
/**
 * Cloud Translation API Integration
 *
 * Provides multi-language support for international expansion
 * Free tier: 500,000 characters/month
 *
 * @module lib/translation
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
exports.TranslationClient = void 0;
exports.getTranslationClient = getTranslationClient;
exports.translateToPortuguese = translateToPortuguese;
exports.translateFromPortuguese = translateFromPortuguese;
exports.translateMedicalText = translateMedicalText;
exports.detectLanguage = detectLanguage;
exports.isTranslationEnabled = isTranslationEnabled;
exports.getSupportedLanguages = getSupportedLanguages;
exports.translateExercise = translateExercise;
exports.getMedicalTermTranslation = getMedicalTermTranslation;
var translate_1 = require("@google-cloud/translate");
var logger_1 = require("./logger");
var logger = (0, logger_1.getLogger)('translation');
// ============================================================================
// CONFIGURATION
// ============================================================================
var PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'fisioflow-migration';
var LOCATION = 'global'; // Use global for v2 API
var TRANSLATION_ENABLED = process.env.CLOUD_TRANSLATION_ENABLED !== 'false';
// Medical glossary for better translation accuracy
var MEDICAL_TERNS = {
    'fisioterapia': {
        en: 'physiotherapy',
        es: 'fisioterapia',
    },
    'terapeuta': {
        en: 'therapist',
        es: 'terapeuta',
    },
    'paciente': {
        en: 'patient',
        es: 'paciente',
    },
    'exercício': {
        en: 'exercise',
        es: 'ejercicio',
    },
    'tratamento': {
        en: 'treatment',
        es: 'tratamiento',
    },
    'sessão': {
        en: 'session',
        es: 'sesión',
    },
    'avaliação': {
        en: 'assessment',
        es: 'evaluación',
    },
    'evolução': {
        en: 'evolution',
        es: 'evolución',
    },
    'dor': {
        en: 'pain',
        es: 'dolor',
    },
    'edema': {
        en: 'edema',
        es: 'edema',
    },
    // Add more terms as needed
};
// ============================================================================
// TRANSLATION CLIENT CLASS
// ============================================================================
/**
 * Cloud Translation API Client (v3)
 */
var TranslationClient = /** @class */ (function () {
    function TranslationClient() {
        this.client = new translate_1.TranslationServiceClient({
            projectId: PROJECT_ID,
        });
        logger.info('Translation client initialized');
    }
    /**
     * Translate text or array of texts
     */
    TranslationClient.prototype.translate = function (text_1, targetLanguage_1) {
        return __awaiter(this, arguments, void 0, function (text, targetLanguage, options) {
            var _a, model, _b, mimeType, parent_1, texts, request, response, translation, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = options.model, model = _a === void 0 ? 'nmt' : _a, _b = options.mimeType, mimeType = _b === void 0 ? 'text/plain' : _b;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        parent_1 = "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION);
                        texts = Array.isArray(text) ? text : [text];
                        logger.info('Translating text', {
                            textCount: texts.length,
                            targetLanguage: targetLanguage,
                            totalChars: texts.join('').length,
                        });
                        request = {
                            parent: parent_1,
                            contents: texts,
                            mimeType: mimeType,
                            targetLanguageCode: targetLanguage,
                            model: model === 'nmt'
                                ? "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION, "/models/general/nmt")
                                : undefined,
                        };
                        return [4 /*yield*/, this.client.translateText(request)];
                    case 2:
                        response = (_c.sent())[0];
                        if (!response.translations || response.translations.length === 0) {
                            throw new Error('No translations returned');
                        }
                        // Process results
                        if (Array.isArray(text)) {
                            return [2 /*return*/, response.translations.map(function (t) { return ({
                                    translation: t.translatedText || '',
                                    detectedLanguageCode: t.detectedLanguageCode || undefined,
                                }); })];
                        }
                        translation = response.translations[0];
                        return [2 /*return*/, {
                                translation: translation.translatedText || '',
                                detectedLanguageCode: translation.detectedLanguageCode || undefined,
                            }];
                    case 3:
                        error_1 = _c.sent();
                        logger.error('Translation failed:', error_1);
                        throw new Error("Translation failed: ".concat(error_1.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Translate with glossary (for better medical term accuracy)
     */
    TranslationClient.prototype.translateWithGlossary = function (text, targetLanguage, glossaryId) {
        return __awaiter(this, void 0, void 0, function () {
            var parent_2, request, response, translation, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        parent_2 = "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION);
                        logger.info('Translating with glossary', {
                            targetLanguage: targetLanguage,
                            glossaryId: glossaryId,
                        });
                        request = {
                            parent: parent_2,
                            contents: [text],
                            mimeType: 'text/plain',
                            targetLanguageCode: targetLanguage,
                            glossaryConfig: {
                                glossary: "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION, "/glossaries/").concat(glossaryId),
                            },
                        };
                        return [4 /*yield*/, this.client.translateText(request)];
                    case 1:
                        response = (_b.sent())[0];
                        translation = (_a = response.translations) === null || _a === void 0 ? void 0 : _a[0];
                        if (!translation) {
                            throw new Error('No translation returned');
                        }
                        return [2 /*return*/, {
                                translation: translation.translatedText || '',
                                detectedLanguageCode: translation.detectedLanguageCode || undefined,
                            }];
                    case 2:
                        error_2 = _b.sent();
                        logger.error('Translation with glossary failed:', error_2);
                        throw new Error("Translation with glossary failed: ".concat(error_2.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Detect language of text
     */
    TranslationClient.prototype.detectLanguage = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var parent_3, request, response, detection, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        parent_3 = "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION);
                        request = {
                            parent: parent_3,
                            content: text,
                        };
                        return [4 /*yield*/, this.client.detectLanguage(request)];
                    case 1:
                        response = (_b.sent())[0];
                        detection = (_a = response.languages) === null || _a === void 0 ? void 0 : _a[0];
                        if (!detection) {
                            throw new Error('No language detected');
                        }
                        return [2 /*return*/, {
                                languageCode: detection.languageCode || 'und',
                                confidence: detection.confidence || 0,
                            }];
                    case 2:
                        error_3 = _b.sent();
                        logger.error('Language detection failed:', error_3);
                        throw new Error("Language detection failed: ".concat(error_3.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get supported languages
     */
    TranslationClient.prototype.getSupportedLanguages = function () {
        return __awaiter(this, arguments, void 0, function (displayLanguageCode) {
            var parent_4, request, response, error_4;
            var _a;
            if (displayLanguageCode === void 0) { displayLanguageCode = 'pt'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        parent_4 = "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION);
                        request = {
                            parent: parent_4,
                            displayLanguageCode: displayLanguageCode,
                        };
                        return [4 /*yield*/, this.client.getSupportedLanguages(request)];
                    case 1:
                        response = (_b.sent())[0];
                        return [2 /*return*/, (((_a = response.languages) === null || _a === void 0 ? void 0 : _a.map(function (lang) { return ({
                                languageCode: lang.languageCode || '',
                                displayName: lang.displayName || '',
                                supportSource: lang.supportSource || false,
                                supportTarget: lang.supportTarget || false,
                            }); })) || [])];
                    case 2:
                        error_4 = _b.sent();
                        logger.error('Failed to get supported languages:', error_4);
                        return [2 /*return*/, []];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Translate document (for translating files)
     */
    TranslationClient.prototype.translateDocument = function (inputUri, outputUri, targetLanguage, sourceLanguage) {
        return __awaiter(this, void 0, void 0, function () {
            var parent_5, request, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        parent_5 = "projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION);
                        logger.info('Translating document', {
                            inputUri: inputUri,
                            outputUri: outputUri,
                            targetLanguage: targetLanguage,
                        });
                        request = {
                            parent: parent_5,
                            targetLanguageCode: targetLanguage,
                            documentInputConfig: {
                                gcsSource: {
                                    inputUri: inputUri,
                                },
                            },
                            documentOutputConfig: {
                                gcsDestination: {
                                    outputUriPrefix: outputUri,
                                },
                            },
                            sourceLanguageCode: sourceLanguage,
                        };
                        return [4 /*yield*/, this.client.translateDocument(request)];
                    case 1:
                        _a.sent();
                        logger.info('Document translation completed');
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        logger.error('Document translation failed:', error_5);
                        throw new Error("Document translation failed: ".concat(error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Batch translate (for multiple texts)
     */
    TranslationClient.prototype.batchTranslate = function (texts, targetLanguage, sourceLanguage) {
        return __awaiter(this, void 0, void 0, function () {
            var results, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.translate(texts, targetLanguage, {
                                model: 'nmt',
                            })];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results)
                                ? results.map(function (r) { return r.translation; })
                                : [results.translation]];
                    case 2:
                        error_6 = _a.sent();
                        logger.error('Batch translation failed:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return TranslationClient;
}());
exports.TranslationClient = TranslationClient;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
var translationClient = null;
/**
 * Get or create Translation client (singleton)
 */
function getTranslationClient() {
    if (!translationClient) {
        translationClient = new TranslationClient();
    }
    return translationClient;
}
// ============================================================================
// HELPER FUNCTIONS FOR COMMON TRANSLATIONS
// ============================================================================
/**
 * Translate to Portuguese
 */
function translateToPortuguese(text, sourceLanguage) {
    return __awaiter(this, void 0, void 0, function () {
        var client, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!TRANSLATION_ENABLED) {
                        logger.warn('Cloud Translation disabled');
                        return [2 /*return*/, text];
                    }
                    client = getTranslationClient();
                    return [4 /*yield*/, client.translate(text, 'pt-BR', { model: 'nmt' })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.translation];
            }
        });
    });
}
/**
 * Translate from Portuguese
 */
function translateFromPortuguese(text, targetLanguage) {
    return __awaiter(this, void 0, void 0, function () {
        var client, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!TRANSLATION_ENABLED) {
                        logger.warn('Cloud Translation disabled');
                        return [2 /*return*/, text];
                    }
                    client = getTranslationClient();
                    return [4 /*yield*/, client.translate(text, targetLanguage, { model: 'nmt' })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.translation];
            }
        });
    });
}
/**
 * Translate medical text (with glossary if available)
 */
function translateMedicalText(text_1, targetLanguage_1) {
    return __awaiter(this, arguments, void 0, function (text, targetLanguage, sourceLanguage) {
        var client, glossaryId, result, _a, result;
        if (sourceLanguage === void 0) { sourceLanguage = 'pt'; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!TRANSLATION_ENABLED) {
                        logger.warn('Cloud Translation disabled');
                        return [2 /*return*/, text];
                    }
                    client = getTranslationClient();
                    glossaryId = "medical-".concat(sourceLanguage, "-").concat(targetLanguage);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, client.translateWithGlossary(text, targetLanguage, glossaryId)];
                case 2:
                    result = _b.sent();
                    return [2 /*return*/, result.translation];
                case 3:
                    _a = _b.sent();
                    // Fallback to regular translation if glossary not found
                    logger.debug("Glossary ".concat(glossaryId, " not found, using regular translation"));
                    return [4 /*yield*/, client.translate(text, targetLanguage, { model: 'nmt' })];
                case 4:
                    result = _b.sent();
                    return [2 /*return*/, result.translation];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Detect language of text
 */
function detectLanguage(text) {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            if (!TRANSLATION_ENABLED) {
                logger.warn('Cloud Translation disabled');
                return [2 /*return*/, { languageCode: 'und', confidence: 0 }];
            }
            client = getTranslationClient();
            return [2 /*return*/, client.detectLanguage(text)];
        });
    });
}
/**
 * Check if Cloud Translation is enabled
 */
function isTranslationEnabled() {
    return TRANSLATION_ENABLED;
}
/**
 * Get supported languages
 */
function getSupportedLanguages() {
    return __awaiter(this, void 0, void 0, function () {
        var client, languages;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!TRANSLATION_ENABLED) {
                        return [2 /*return*/, [
                                { languageCode: 'pt-BR', displayName: 'Português (Brasil)' },
                                { languageCode: 'en-US', displayName: 'English (US)' },
                                { languageCode: 'es-ES', displayName: 'Español' },
                            ]];
                    }
                    client = getTranslationClient();
                    return [4 /*yield*/, client.getSupportedLanguages('pt')];
                case 1:
                    languages = _a.sent();
                    return [2 /*return*/, languages.map(function (lang) { return ({
                            languageCode: lang.languageCode,
                            displayName: lang.displayName,
                        }); })];
            }
        });
    });
}
/**
 * Translate exercise instructions
 */
function translateExercise(exerciseName, instructions, targetLanguage) {
    return __awaiter(this, void 0, void 0, function () {
        var client, _a, translatedName, translatedInstructions;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = getTranslationClient();
                    return [4 /*yield*/, Promise.all([
                            client.translate(exerciseName, targetLanguage),
                            client.translate(instructions, targetLanguage),
                        ])];
                case 1:
                    _a = _b.sent(), translatedName = _a[0], translatedInstructions = _a[1];
                    return [2 /*return*/, {
                            translatedName: translatedName.translation,
                            translatedInstructions: translatedInstructions.translation,
                        }];
            }
        });
    });
}
/**
 * Get medical term translation
 */
function getMedicalTermTranslation(term, targetLanguage) {
    var key = term.toLowerCase();
    var lang = targetLanguage.split('-')[0];
    var entry = MEDICAL_TERNS[key];
    return entry === null || entry === void 0 ? void 0 : entry[lang];
}
