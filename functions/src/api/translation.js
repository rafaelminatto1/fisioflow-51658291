"use strict";
/**
 * Cloud Translation API Endpoint
 *
 * HTTP endpoint for text translation
 * Free tier: 500,000 characters/month
 *
 * @route api/translation
 * @method onRequest
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
exports.translateExercise = exports.translateExerciseHandler = exports.getSupportedLanguages = exports.getSupportedLanguagesHandler = exports.detectLanguage = exports.detectLanguageHandler = exports.translate = exports.translateHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var translation_1 = require("../lib/translation");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var translateHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, client, textArray, charCount, result, translations, singleResult, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                body = req.body;
                // Validate request
                if (!body.text) {
                    throw new https_1.HttpsError('invalid-argument', 'text is required');
                }
                if (!body.targetLanguage) {
                    throw new https_1.HttpsError('invalid-argument', 'targetLanguage is required');
                }
                client = (0, translation_1.getTranslationClient)();
                textArray = Array.isArray(body.text) ? body.text : [body.text];
                charCount = textArray.join('').length;
                logger_1.logger.info('Starting translation', {
                    textCount: textArray.length,
                    charCount: charCount,
                    targetLanguage: body.targetLanguage,
                    sourceLanguage: body.sourceLanguage,
                });
                return [4 /*yield*/, client.translate(body.text, body.targetLanguage, {
                        format: body.format || 'text',
                        model: body.model || 'nmt',
                    })];
            case 2:
                result = _a.sent();
                // Build response
                if (Array.isArray(body.text)) {
                    translations = result.map(function (r) { return ({
                        translation: r.translation,
                        detectedLanguageCode: r.detectedLanguageCode,
                    }); });
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Content-Type', 'application/json');
                    res.json({
                        translations: translations,
                        charCount: charCount,
                        targetLanguage: body.targetLanguage,
                    });
                }
                else {
                    singleResult = result;
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Content-Type', 'application/json');
                    res.json({
                        translation: singleResult.translation,
                        detectedLanguageCode: singleResult.detectedLanguageCode,
                        charCount: charCount,
                        targetLanguage: body.targetLanguage,
                    });
                }
                logger_1.logger.info('Translation completed', {
                    charCount: charCount,
                    targetLanguage: body.targetLanguage,
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                logger_1.logger.error('Translation failed:', error_1);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    code: 'TRANSLATION_FAILED',
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.translateHandler = translateHandler;
exports.translate = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.translateHandler);
// ============================================================================
// LANGUAGE DETECTION
// ============================================================================
var detectLanguageHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                body = req.body;
                if (!body.text) {
                    throw new https_1.HttpsError('invalid-argument', 'text is required');
                }
                logger_1.logger.info('Detecting language', {
                    textLength: body.text.length,
                });
                return [4 /*yield*/, (0, translation_1.detectLanguage)(body.text)];
            case 2:
                result = _a.sent();
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'application/json');
                res.json({
                    languageCode: result.languageCode,
                    confidence: result.confidence,
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                logger_1.logger.error('Language detection failed:', error_2);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                    code: 'LANGUAGE_DETECTION_FAILED',
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.detectLanguageHandler = detectLanguageHandler;
exports.detectLanguage = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.detectLanguageHandler);
// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================
var getSupportedLanguagesHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var displayLanguage, client, languages, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'GET') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                displayLanguage = req.query.display || 'pt';
                logger_1.logger.info('Getting supported languages', { displayLanguage: displayLanguage });
                client = (0, translation_1.getTranslationClient)();
                return [4 /*yield*/, client.getSupportedLanguages(displayLanguage)];
            case 2:
                languages = _a.sent();
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'application/json');
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
                res.json({
                    languages: languages.map(function (lang) { return ({
                        code: lang.languageCode,
                        name: lang.displayName,
                        supportSource: lang.supportSource,
                        supportTarget: lang.supportTarget,
                    }); }),
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                logger_1.logger.error('Failed to get supported languages:', error_3);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                    code: 'LANGUAGES_FAILED',
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getSupportedLanguagesHandler = getSupportedLanguagesHandler;
exports.getSupportedLanguages = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.getSupportedLanguagesHandler);
var translateExerciseHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, client, _a, translatedName, translatedInstructions, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.set('Access-Control-Allow-Origin', '*');
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                body = req.body;
                if (!body.exerciseName || !body.instructions || !body.targetLanguage) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseName, instructions, and targetLanguage are required');
                }
                logger_1.logger.info('Translating exercise', {
                    exerciseName: body.exerciseName,
                    targetLanguage: body.targetLanguage,
                });
                client = (0, translation_1.getTranslationClient)();
                return [4 /*yield*/, Promise.all([
                        client.translate(body.exerciseName, body.targetLanguage, { model: 'nmt' }),
                        client.translate(body.instructions, body.targetLanguage, { model: 'nmt' }),
                    ])];
            case 2:
                _a = _b.sent(), translatedName = _a[0], translatedInstructions = _a[1];
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'application/json');
                res.json({
                    exerciseName: translatedName.translation,
                    instructions: translatedInstructions.translation,
                    targetLanguage: body.targetLanguage,
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _b.sent();
                logger_1.logger.error('Exercise translation failed:', error_4);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                    code: 'EXERCISE_TRANSLATION_FAILED',
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.translateExerciseHandler = translateExerciseHandler;
exports.translateExercise = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.translateExerciseHandler);
