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
exports.runPatientMedicalReturnCols = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
exports.runPatientMedicalReturnCols = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, pool, client, results, columnsToAdd, _i, columnsToAdd_1, col, checkResult, err_1, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                apiKey = req.query.key || req.headers['x-migration-key'];
                if (apiKey !== 'fisioflow-migration-2026') {
                    res.status(403).json({ error: 'Forbidden - Invalid API key' });
                    return [2 /*return*/];
                }
                // Only allow POST
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed - use POST' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                results = [];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 12, 13, 14]);
                logger_1.logger.info('🔄 Starting Patient Medical Return Columns Migration...');
                columnsToAdd = [
                    { name: 'referring_doctor_name', type: 'TEXT' },
                    { name: 'referring_doctor_phone', type: 'TEXT' },
                    { name: 'medical_return_date', type: 'DATE' },
                    { name: 'medical_report_done', type: 'BOOLEAN DEFAULT false' },
                    { name: 'medical_report_sent', type: 'BOOLEAN DEFAULT false' }
                ];
                _i = 0, columnsToAdd_1 = columnsToAdd;
                _a.label = 3;
            case 3:
                if (!(_i < columnsToAdd_1.length)) return [3 /*break*/, 11];
                col = columnsToAdd_1[_i];
                _a.label = 4;
            case 4:
                _a.trys.push([4, 9, , 10]);
                return [4 /*yield*/, client.query("\n          SELECT column_name \n          FROM information_schema.columns \n          WHERE table_name = 'patients' AND column_name = $1\n        ", [col.name])];
            case 5:
                checkResult = _a.sent();
                if (!(checkResult.rows.length === 0)) return [3 /*break*/, 7];
                return [4 /*yield*/, client.query("ALTER TABLE patients ADD COLUMN ".concat(col.name, " ").concat(col.type))];
            case 6:
                _a.sent();
                results.push({ step: "Add column ".concat(col.name), success: true });
                logger_1.logger.info("\u2705 Column ".concat(col.name, " added"));
                return [3 /*break*/, 8];
            case 7:
                results.push({ step: "Add column ".concat(col.name), success: true });
                logger_1.logger.info("\u2139\uFE0F Column ".concat(col.name, " already exists"));
                _a.label = 8;
            case 8: return [3 /*break*/, 10];
            case 9:
                err_1 = _a.sent();
                results.push({ step: "Add column ".concat(col.name), success: false, error: err_1.message });
                logger_1.logger.error("\u274C Error adding column ".concat(col.name, ":"), err_1.message);
                return [3 /*break*/, 10];
            case 10:
                _i++;
                return [3 /*break*/, 3];
            case 11:
                res.json({
                    success: true,
                    message: 'Migration completed',
                    results: results,
                    timestamp: new Date().toISOString(),
                });
                return [3 /*break*/, 14];
            case 12:
                error_1 = _a.sent();
                logger_1.logger.error('❌ Migration failed:', error_1);
                res.status(500).json({
                    success: false,
                    error: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1),
                    results: results,
                });
                return [3 /*break*/, 14];
            case 13:
                client.release();
                return [7 /*endfinally*/];
            case 14: return [2 /*return*/];
        }
    });
}); });
