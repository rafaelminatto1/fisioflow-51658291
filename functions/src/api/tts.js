"use strict";
/**
 * Cloud Text-to-Speech API Endpoint
 *
 * HTTP endpoint for speech synthesis
 * Free tier: 4 million characters/month
 *
 * @route api/tts
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
exports.synthesizeTTS = exports.synthesizeTTSHandler = void 0;
// ============================================================================
// TYPES
// ============================================================================
var https_1 = require("firebase-functions/v2/https");
var text_to_speech_1 = require("../lib/text-to-speech");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
// ============================================================================
// MAIN FUNCTION
// ============================================================================
var synthesizeTTSHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, type, languageCode, client, audioBuffer, _a, error_1;
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
                _b.trys.push([1, 11, , 12]);
                body = req.body;
                // Validate request
                if (!body.text && !body.exerciseName && !body.instruction) {
                    throw new https_1.HttpsError('invalid-argument', 'text, exerciseName, or instruction is required');
                }
                type = body.type || 'accessibility';
                languageCode = body.languageCode || 'pt-BR';
                client = (0, text_to_speech_1.getTextToSpeechClient)();
                audioBuffer = void 0;
                _a = type;
                switch (_a) {
                    case 'exercise': return [3 /*break*/, 2];
                    case 'countdown': return [3 /*break*/, 4];
                    case 'encouragement': return [3 /*break*/, 6];
                    case 'accessibility': return [3 /*break*/, 8];
                }
                return [3 /*break*/, 8];
            case 2:
                if (!body.exerciseName || !body.instruction) {
                    throw new https_1.HttpsError('invalid-argument', 'exerciseName and instruction are required for exercise type');
                }
                return [4 /*yield*/, client.synthesizeExerciseInstruction(body.exerciseName, body.instruction, languageCode)];
            case 3:
                audioBuffer = _b.sent();
                return [3 /*break*/, 10];
            case 4: return [4 /*yield*/, client.synthesizeCountdown(body.countFrom || 3)];
            case 5:
                audioBuffer = _b.sent();
                return [3 /*break*/, 10];
            case 6: return [4 /*yield*/, client.synthesizeEncouragement(body.text, languageCode)];
            case 7:
                audioBuffer = _b.sent();
                return [3 /*break*/, 10];
            case 8:
                if (!body.text) {
                    throw new https_1.HttpsError('invalid-argument', 'text is required for accessibility type');
                }
                return [4 /*yield*/, client.synthesizeAccessibility(body.text, languageCode)];
            case 9:
                audioBuffer = _b.sent();
                return [3 /*break*/, 10];
            case 10:
                // Set response headers
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Content-Type', 'audio/mpeg');
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
                res.set('Content-Length', audioBuffer.length.toString());
                logger_1.logger.info("TTS synthesis completed", {
                    type: type,
                    languageCode: languageCode,
                    audioLength: audioBuffer.length,
                });
                res.send(audioBuffer);
                return [3 /*break*/, 12];
            case 11:
                error_1 = _b.sent();
                logger_1.logger.error('TTS synthesis failed:', error_1);
                res.set('Access-Control-Allow-Origin', '*');
                res.status(500).json({
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error',
                    code: 'TTS_SYNTHESIS_FAILED',
                });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); };
exports.synthesizeTTSHandler = synthesizeTTSHandler;
exports.synthesizeTTS = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    cpu: 0.125, // Minimum CPU for lower resource usage
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, exports.synthesizeTTSHandler);
