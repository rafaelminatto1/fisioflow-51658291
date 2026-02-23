"use strict";
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
exports.scanMedicalReportHttp = exports.scanMedicalReportHttpHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var vision_1 = require("@google-cloud/vision");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var cors_1 = require("../lib/cors");
var visionClient = new vision_1.ImageAnnotatorClient();
var httpOpts = {
    region: 'southamerica-east1', memory: '1GiB',
    cpu: 1,
    maxInstances: 1, cors: cors_1.CORS_ORIGINS, invoker: 'public'
};
/**
 * Scanner de Laudos: Transforma imagem de exame em texto
 */
/**
 * Scanner de Laudos: Transforma imagem de exame em texto
 */
var scanMedicalReportHttpHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, token, imageBase64, result, fullText, e_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 4, , 5]);
                authHeader = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b.Authorization);
                token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
                return [4 /*yield*/, (0, auth_1.authorizeRequest)((0, auth_1.extractBearerToken)(token))];
            case 2:
                _f.sent();
                imageBase64 = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body).imageBase64;
                if (!imageBase64) {
                    res.status(400).json({ error: 'Imagem base64 é obrigatória' });
                    return [2 /*return*/];
                }
                logger_1.logger.info('Iniciando OCR de laudo...');
                return [4 /*yield*/, visionClient.textDetection({
                        image: { content: imageBase64 }
                    })];
            case 3:
                result = (_f.sent())[0];
                fullText = ((_c = result.fullTextAnnotation) === null || _c === void 0 ? void 0 : _c.text) || '';
                // 2. Otimização: Você poderia passar esse texto pelo Gemini aqui mesmo 
                // para extrair campos como "Data do Exame", "Conclusão", etc.
                res.json({
                    data: {
                        text: fullText,
                        confidence: ((_e = (_d = result.textAnnotations) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.confidence) || 0
                    }
                });
                return [3 /*break*/, 5];
            case 4:
                e_1 = _f.sent();
                logger_1.logger.error('scanMedicalReport error:', e_1);
                res.status(500).json({ error: 'Falha ao escanear laudo' });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.scanMedicalReportHttpHandler = scanMedicalReportHttpHandler;
exports.scanMedicalReportHttp = (0, https_1.onRequest)(httpOpts, exports.scanMedicalReportHttpHandler);
