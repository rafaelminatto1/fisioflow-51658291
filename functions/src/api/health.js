"use strict";
/**
 * Health Check API
 * Função simples para verificar conectividade com Cloud SQL
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
exports.healthCheck = exports.healthCheckHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
// Import secrets to register them with the functions framework
require("../init");
/**
 * Handler HTTP para healthCheck
 */
var healthCheckHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, result, dbTime, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // CORS headers
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET, POST');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'GET') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT COUNT(*) as count FROM exercises WHERE is_active = true')];
            case 2:
                result = _a.sent();
                return [4 /*yield*/, pool.query('SELECT NOW() as server_time')];
            case 3:
                dbTime = _a.sent();
                res.json({
                    status: 'healthy',
                    database: 'connected (centralized pool)',
                    exercises_count: parseInt(result.rows[0].count),
                    server_time: dbTime.rows[0].server_time,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                res.status(500).json({
                    status: 'unhealthy',
                    error: error_1.message,
                    hint: 'Configure VPC connector for Cloud SQL access'
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.healthCheckHandler = healthCheckHandler;
exports.healthCheck = (0, https_1.onRequest)({
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
    secrets: [
        init_1.DB_PASS_SECRET,
        init_1.DB_USER_SECRET,
        init_1.DB_NAME_SECRET,
        init_1.DB_HOST_IP_SECRET,
        init_1.DB_HOST_IP_PUBLIC_SECRET,
        init_1.CLOUD_SQL_CONNECTION_NAME_SECRET
    ],
}, exports.healthCheckHandler);
