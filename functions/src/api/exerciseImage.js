"use strict";
/**
 * Cloud Function to proxy exercise images from Firebase Storage
 * This bypasses CORS issues and provides a reliable way to serve images
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
exports.exerciseImageProxy = void 0;
exports.toProxyUrl = toProxyUrl;
var https_1 = require("firebase-functions/v2/https");
var storage_1 = require("firebase-admin/storage");
var sharp_1 = require("sharp");
var cors_1 = require("../lib/cors");
var ALLOWED_PREFIXES = ['exercise-media/', 'exercise-videos/'];
var DEFAULT_QUALITY = {
    avif: 55,
    webp: 70,
    jpeg: 72,
    png: 80,
};
var CONTENT_TYPES = {
    avif: 'image/avif',
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    png: 'image/png',
};
function clampNumber(value, min, max) {
    if (value === undefined || Number.isNaN(value))
        return undefined;
    return Math.min(Math.max(value, min), max);
}
function parseDimension(raw) {
    if (!raw)
        return undefined;
    var parsed = Number(raw);
    return clampNumber(Math.round(parsed), 16, 4096);
}
function parseDpr(raw) {
    var _a;
    var parsed = Number(raw);
    return (_a = clampNumber(parsed, 1, 3)) !== null && _a !== void 0 ? _a : 1;
}
function detectFormatFromExtension(ext) {
    switch ((ext || '').toLowerCase()) {
        case 'avif':
            return 'avif';
        case 'webp':
            return 'webp';
        case 'png':
            return 'png';
        default:
            return 'jpeg';
    }
}
function chooseFormat(formatParam, acceptHeader, fallback) {
    var param = (formatParam || 'original').toLowerCase();
    if (param === 'avif' || param === 'webp' || param === 'jpeg' || param === 'jpg' || param === 'png') {
        return param === 'jpg' ? 'jpeg' : param;
    }
    if (param !== 'auto') {
        return fallback;
    }
    var accept = acceptHeader.toLowerCase();
    if (accept.includes('image/avif'))
        return 'avif';
    if (accept.includes('image/webp'))
        return 'webp';
    return fallback;
}
exports.exerciseImageProxy = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    cors: cors_1.CORS_ORIGINS,
    invoker: 'public',
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var fullPath, pathSegment, decodedPath_1, imagePath, bucketName, bucket, file, exists, _a, w, h, dprRaw, fmt, fit, width, height, dpr, fitMode, extension, fallbackFormat, outputFormat, quality, isSvg, shouldTransform, stream, buffer, transformer, optimizedBuffer, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                // Set CORS headers
                response.set('Access-Control-Allow-Origin', '*');
                response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                response.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
                // Handle OPTIONS preflight request
                if (request.method === 'OPTIONS') {
                    response.status(204).send('');
                    return [2 /*return*/];
                }
                // Only GET requests allowed
                if (request.method !== 'GET') {
                    response.status(405).send('Method Not Allowed');
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                fullPath = request.path || '';
                console.log('Exercise image proxy - fullPath:', fullPath);
                pathSegment = fullPath.replace('/api/exercise-image/', '');
                console.log('Exercise image proxy - pathSegment:', pathSegment);
                if (!pathSegment) {
                    response.status(400).send('Bad Request: Missing image path');
                    return [2 /*return*/];
                }
                try {
                    decodedPath_1 = decodeURIComponent(pathSegment);
                    // If still encoded, decode again
                    if (decodedPath_1.includes('%')) {
                        decodedPath_1 = decodeURIComponent(decodedPath_1);
                    }
                }
                catch (_d) {
                    decodedPath_1 = pathSegment;
                }
                console.log('Exercise image proxy - decodedPath:', decodedPath_1);
                imagePath = void 0;
                if (ALLOWED_PREFIXES.some(function (prefix) { return decodedPath_1.startsWith(prefix); })) {
                    imagePath = decodedPath_1;
                }
                else {
                    // Default to exercise-media prefix
                    imagePath = 'exercise-media/' + decodedPath_1;
                }
                // Basic path traversal guard
                if (imagePath.includes('..')) {
                    response.status(400).send('Bad Request');
                    return [2 /*return*/];
                }
                console.log('Exercise image proxy - imagePath:', imagePath);
                bucketName = process.env.STORAGE_BUCKET_NAME || 'fisioflow-migration.firebasestorage.app';
                console.log('Exercise image proxy - bucketName:', bucketName);
                bucket = (0, storage_1.getStorage)().bucket("gs://".concat(bucketName));
                file = bucket.file(imagePath);
                console.log('Exercise image proxy - file path:', imagePath);
                return [4 /*yield*/, file.exists()];
            case 2:
                exists = (_c.sent())[0];
                console.log('Exercise image proxy - file exists:', exists);
                if (!exists) {
                    console.log('Exercise image proxy - file not found:', imagePath);
                    response.status(404).send('Not Found');
                    return [2 /*return*/];
                }
                _a = request.query, w = _a.w, h = _a.h, dprRaw = _a.dpr, fmt = _a.fmt, fit = _a.fit;
                width = parseDimension(w);
                height = parseDimension(h);
                dpr = parseDpr(dprRaw);
                fitMode = (typeof fit === 'string' && ['cover', 'contain', 'inside', 'outside', 'fill'].includes(fit)
                    ? fit
                    : 'cover');
                extension = imagePath.split('.').pop();
                fallbackFormat = detectFormatFromExtension(extension);
                outputFormat = chooseFormat(typeof fmt === 'string' ? fmt : undefined, request.get('accept') || '', fallbackFormat);
                quality = (_b = clampNumber(Number(request.query.q), 30, 95)) !== null && _b !== void 0 ? _b : DEFAULT_QUALITY[outputFormat];
                isSvg = (extension || '').toLowerCase() === 'svg';
                shouldTransform = !isSvg && (width || height || outputFormat !== fallbackFormat);
                if (!shouldTransform) {
                    response.set('Content-Type', CONTENT_TYPES[outputFormat] || 'image/png');
                    stream = file.createReadStream();
                    stream.pipe(response);
                    stream.on('error', function (error) {
                        console.error('Error streaming image:', error);
                        if (!response.headersSent) {
                            response.status(500).send('Internal Server Error');
                        }
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, file.download()];
            case 3:
                buffer = (_c.sent())[0];
                transformer = (0, sharp_1.default)(buffer).rotate();
                if (width || height) {
                    transformer.resize({
                        width: width ? Math.round(width * dpr) : undefined,
                        height: height ? Math.round(height * dpr) : undefined,
                        fit: fitMode,
                        withoutEnlargement: true,
                    });
                }
                switch (outputFormat) {
                    case 'avif':
                        transformer.avif({ quality: quality, effort: 4 });
                        break;
                    case 'webp':
                        transformer.webp({ quality: quality });
                        break;
                    case 'jpeg':
                        transformer.jpeg({ quality: quality, mozjpeg: true });
                        break;
                    case 'png':
                    default:
                        transformer.png({ compressionLevel: 9, quality: quality });
                        break;
                }
                return [4 /*yield*/, transformer.toBuffer()];
            case 4:
                optimizedBuffer = _c.sent();
                response.set('Content-Type', CONTENT_TYPES[outputFormat]);
                response.send(optimizedBuffer);
                return [3 /*break*/, 6];
            case 5:
                error_1 = _c.sent();
                console.error('Error serving exercise image:', error_1);
                if (!response.headersSent) {
                    response.status(500).send('Internal Server Error');
                }
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Helper function to convert Firebase Storage URL to proxy URL
 * @param storageUrl - The Firebase Storage URL
 * @returns The proxy URL
 */
function toProxyUrl(storageUrl) {
    try {
        // Parse Firebase Storage URL
        // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
        var url = new URL(storageUrl);
        var pathMatch = url.pathname.match(/\/o\/([^?]+)/);
        if (pathMatch) {
            var encodedPath = pathMatch[1];
            // In production: https://moocafisio.com.br/api/exercise-image/{path}
            // In dev: http://localhost:5001/{project}/us-central1/exerciseImageProxy
            return "/api/exercise-image/".concat(encodedPath);
        }
        return storageUrl;
    }
    catch (_a) {
        return storageUrl;
    }
}
