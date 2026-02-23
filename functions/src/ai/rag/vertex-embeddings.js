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
exports.generateEmbeddingsForTexts = generateEmbeddingsForTexts;
exports.generateEmbeddingForText = generateEmbeddingForText;
var google_auth_library_1 = require("google-auth-library");
var logger_1 = require("../../lib/logger");
var logger = (0, logger_1.getLogger)('ai-vertex-embeddings');
var DEFAULT_MODEL = 'text-embedding-005';
var DEFAULT_LOCATION = 'us-central1';
var DEFAULT_BATCH_SIZE = 12;
function getProjectId() {
    return process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration';
}
function getLocation() {
    return process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
}
function getModel() {
    return process.env.RAG_EMBEDDING_MODEL || DEFAULT_MODEL;
}
function sanitizeText(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function toEmbeddingVector(prediction) {
    var _a;
    var rawValues = ((_a = prediction === null || prediction === void 0 ? void 0 : prediction.embeddings) === null || _a === void 0 ? void 0 : _a.values) || (prediction === null || prediction === void 0 ? void 0 : prediction.values) || [];
    if (!Array.isArray(rawValues))
        return [];
    return rawValues.filter(function (value) { return typeof value === 'number' && Number.isFinite(value); });
}
function getAccessToken() {
    return __awaiter(this, void 0, void 0, function () {
        var auth, client, tokenResult, token, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    auth = new google_auth_library_1.GoogleAuth({
                        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                    });
                    return [4 /*yield*/, auth.getClient()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, client.getAccessToken()];
                case 2:
                    tokenResult = _a.sent();
                    token = typeof tokenResult === 'string' ? tokenResult : tokenResult === null || tokenResult === void 0 ? void 0 : tokenResult.token;
                    return [2 /*return*/, token || null];
                case 3:
                    error_1 = _a.sent();
                    logger.warn('Failed to get access token for Vertex embeddings', {
                        error: error_1.message,
                    });
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function requestEmbeddings(texts) {
    return __awaiter(this, void 0, void 0, function () {
        var accessToken, projectId, location, model, endpoint, response, payload, predictions, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (texts.length === 0)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, getAccessToken()];
                case 1:
                    accessToken = _a.sent();
                    if (!accessToken)
                        return [2 /*return*/, []];
                    projectId = getProjectId();
                    location = getLocation();
                    model = getModel();
                    endpoint = "https://".concat(location, "-aiplatform.googleapis.com/v1/projects/").concat(projectId, "/locations/").concat(location, "/publishers/google/models/").concat(model, ":predict");
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 5, , 6]);
                    return [4 /*yield*/, fetch(endpoint, {
                            method: 'POST',
                            headers: {
                                Authorization: "Bearer ".concat(accessToken),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                instances: texts.map(function (text) { return ({ content: text }); }),
                            }),
                        })];
                case 3:
                    response = _a.sent();
                    if (!response.ok) {
                        logger.warn('Vertex embedding request returned non-OK status', {
                            status: response.status,
                            statusText: response.statusText,
                        });
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, response.json()];
                case 4:
                    payload = (_a.sent());
                    predictions = Array.isArray(payload.predictions) ? payload.predictions : [];
                    return [2 /*return*/, predictions.map(function (prediction) { return toEmbeddingVector(prediction); })];
                case 5:
                    error_2 = _a.sent();
                    logger.warn('Vertex embedding request failed', {
                        error: error_2.message,
                    });
                    return [2 /*return*/, []];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function generateEmbeddingsForTexts(texts_1) {
    return __awaiter(this, arguments, void 0, function (texts, batchSize) {
        var sanitizedTexts, vectors, i, batch, batchVectors, _i, batchVectors_1, vector;
        if (batchSize === void 0) { batchSize = DEFAULT_BATCH_SIZE; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sanitizedTexts = texts.map(function (text) { return sanitizeText(text); }).filter(function (text) { return text.length > 0; });
                    if (sanitizedTexts.length === 0)
                        return [2 /*return*/, []];
                    vectors = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < sanitizedTexts.length)) return [3 /*break*/, 4];
                    batch = sanitizedTexts.slice(i, i + batchSize);
                    return [4 /*yield*/, requestEmbeddings(batch)];
                case 2:
                    batchVectors = _a.sent();
                    if (batchVectors.length !== batch.length) {
                        logger.warn('Embedding batch size mismatch', {
                            expected: batch.length,
                            received: batchVectors.length,
                        });
                    }
                    for (_i = 0, batchVectors_1 = batchVectors; _i < batchVectors_1.length; _i++) {
                        vector = batchVectors_1[_i];
                        vectors.push(vector);
                    }
                    _a.label = 3;
                case 3:
                    i += batchSize;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, vectors];
            }
        });
    });
}
function generateEmbeddingForText(text) {
    return __awaiter(this, void 0, void 0, function () {
        var vector;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, generateEmbeddingsForTexts([text], 1)];
                case 1:
                    vector = (_a.sent())[0];
                    if (!vector || vector.length === 0)
                        return [2 /*return*/, null];
                    return [2 /*return*/, vector];
            }
        });
    });
}
