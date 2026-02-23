"use strict";
/**
 * CORS helpers for HTTP handlers
 * Centralized CORS header logic for Cloud Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_ORIGIN_PATTERNS = exports.CORS_ORIGINS = void 0;
exports.setCorsHeaders = setCorsHeaders;
// Static list of allowed origins for Cloud Functions options
exports.CORS_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8083',
    'http://localhost:8084',
    'http://localhost:8085',
    'http://localhost:8086',
    'http://localhost:8087',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8083',
    'http://127.0.0.1:8084',
    'http://127.0.0.1:8085',
    'http://127.0.0.1:8086',
    'http://127.0.0.1:8087',
    'http://127.0.0.1:5174',
    'https://fisioflow-migration.web.app',
    'https://fisioflow.web.app',
    'https://moocafisio.com.br',
    'https://www.moocafisio.com.br',
];
exports.ALLOWED_ORIGIN_PATTERNS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /^http?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
/**
 * Set CORS headers on response.
 * When req is provided, reflects Origin if it matches allowed patterns; otherwise uses '*'.
 * Uses setHeader when available (Node/Cloud Run) for reliable CORS on preflight.
 */
function setCorsHeaders(res, req) {
    var _a, _b;
    var origin = ((_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a.origin) || ((_b = req === null || req === void 0 ? void 0 : req.headers) === null || _b === void 0 ? void 0 : _b.Origin);
    var allowOrigin = '*';
    // Strict origin check for credentials support
    if (origin) {
        if (exports.CORS_ORIGINS.includes(origin)) {
            allowOrigin = origin;
        }
        else if (exports.ALLOWED_ORIGIN_PATTERNS.some(function (p) { return p.test(origin); })) {
            allowOrigin = origin;
        }
    }
    var headers = [
        ['Access-Control-Allow-Origin', allowOrigin],
        ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH'],
        ['Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, sentry-trace, baggage'],
        ['Access-Control-Max-Age', '86400'],
    ];
    // Only allow credentials if origin is specific (not *)
    if (allowOrigin !== '*') {
        headers.push(['Access-Control-Allow-Credentials', 'true']);
    }
    var resAny = res;
    for (var _i = 0, headers_1 = headers; _i < headers_1.length; _i++) {
        var _c = headers_1[_i], name_1 = _c[0], value = _c[1];
        if (typeof resAny.setHeader === 'function') {
            resAny.setHeader(name_1, value);
        }
        else {
            res.set(name_1, value);
        }
    }
}
