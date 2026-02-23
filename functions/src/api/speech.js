"use strict";
/**
 * Cloud Speech-to-Text API Endpoint
 *
 * HTTP endpoint for speech transcription
 * Free tier: 60 minutes/month
 *
 * @route api/speech
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
exports.transcribeLongAudio = exports.transcribeLongAudioHandler = exports.transcribeAudio = exports.transcribeAudioHandler = void 0;
// ============================================================================
// TYPES
// ============================================================================
var https_1 = require("firebase-functions/v2/https");
var speech_to_text_1 = require("../lib/speech-to-text");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var transcribeAudioHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, languageCode, context, client, result, response, error_1;
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
                _a.trys.push([1, 6, , 7]);
                body = req.body;
                // Validate request
                if (!body.audioData) {
                    throw new https_1.HttpsError('invalid-argument', 'audioData is required');
                }
                if (!body.mimeType) {
                    throw new https_1.HttpsError('invalid-argument', 'mimeType is required');
                }
                languageCode = body.languageCode || 'pt-BR';
                context = body.context || 'medical';
                logger_1.logger.info('Starting transcription', {
                    mimeType: body.mimeType,
                    languageCode: languageCode,
                    context: context,
                    audioLength: body.audioData.length,
                });
                client = (0, speech_to_text_1.getSpeechToTextClient)();
                result = void 0;
                if (!(context === 'medical')) return [3 /*break*/, 3];
                return [4 /*yield*/, client.transcribeWithMedicalContext(body.audioData, body.mimeType, languageCode)];
            case 2:
                result = _a.sent();
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, client.transcribeAudio(body.audioData, body.mimeType, {
                    languageCode: languageCode,
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: body.includeWordOffsets || false,
                    profanityFilter: true,
                })];
            case 4:
                result = _a.sent();
                _a.label = 5;
            case 5:
                response = {
                    transcription: result.transcription,
                    confidence: result.confidence,
                    languageCode: result.languageCode,
                };
                // Include alternatives if requested
                if (body.includeAlternatives && result.alternatives) {
                    response.alternatives = result.alternatives;
                }
                // Include word offsets if requested and available
                if (body.includeWordOffsets && result.words) {
                    response.words = result.words;
                }
                logger_1.logger.info('Transcription completed', {
                    transcriptionLength: result.transcription.length,
                    confidence: result.confidence,
                });
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'application/json');
                res.json(response);
                return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                logger_1.logger.error('Transcription failed:', error_1);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    code: 'TRANSCRIPTION_FAILED',
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.transcribeAudioHandler = transcribeAudioHandler;
exports.transcribeAudio = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.transcribeAudioHandler);
var transcribeLongAudioHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, languageCode, context, client, result, error_2;
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
                if (!body.audioUri) {
                    throw new https_1.HttpsError('invalid-argument', 'audioUri is required');
                }
                languageCode = body.languageCode || 'pt-BR';
                context = body.context || 'medical';
                logger_1.logger.info('Starting long audio transcription', {
                    audioUri: body.audioUri,
                    languageCode: languageCode,
                    context: context,
                });
                client = (0, speech_to_text_1.getSpeechToTextClient)();
                return [4 /*yield*/, client.transcribeLongAudio(body.audioUri, languageCode, context)];
            case 2:
                result = _a.sent();
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'application/json');
                res.json({
                    transcription: result.transcription,
                    confidence: result.confidence,
                    languageCode: result.languageCode,
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                logger_1.logger.error('Long audio transcription failed:', error_2);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                    code: 'LONG_TRANSCRIPTION_FAILED',
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.transcribeLongAudioHandler = transcribeLongAudioHandler;
exports.transcribeLongAudio = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.transcribeLongAudioHandler);
