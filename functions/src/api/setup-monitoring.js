"use strict";
/**
 * Setup Monitoring - Cloud Function para configurar alertas
 * Executa uma vez para configurar Cloud Monitoring
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
exports.setupMonitoring = void 0;
var cors_1 = require("../lib/cors");
var https_1 = require("firebase-functions/v2/https");
var logger_1 = require("../lib/logger");
exports.setupMonitoring = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var results, projectId, alerts, _i, alerts_1, alert_1, consoleUrl;
    var _a, _b;
    return __generator(this, function (_c) {
        // Verificar se é admin
        if (!((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin)) {
            throw new Error('Unauthorized: Admin only');
        }
        results = [];
        try {
            projectId = 'fisioflow-migration';
            alerts = [
                {
                    displayName: 'Alta Taxa de Erro - Cloud Functions',
                    documentation: 'A taxa de erro das Cloud Functions está acima de 5%. Verifique os logs.',
                    filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."execution_status"="execution_status"',
                    thresholdValue: 0.05,
                    duration: '300s',
                    severity: 'WARNING',
                },
                {
                    displayName: 'Alta Latência - Cloud Functions',
                    documentation: 'O tempo de execução das Cloud Functions está acima de 10 segundos (p99).',
                    filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_times"',
                    thresholdValue: 10000,
                    duration: '300s',
                    severity: 'WARNING',
                },
                {
                    displayName: 'Quota Excedida - Cloud Functions',
                    documentation: 'A quota de Cloud Functions foi excedida. Considere aumentar a quota.',
                    filter: 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."response_code"="429"',
                    thresholdValue: 0,
                    duration: '60s',
                    severity: 'CRITICAL',
                },
            ];
            for (_i = 0, alerts_1 = alerts; _i < alerts_1.length; _i++) {
                alert_1 = alerts_1[_i];
                consoleUrl = "https://console.cloud.google.com/monitoring/alerting?project=".concat(projectId);
                results.push({
                    name: alert_1.displayName,
                    status: 'Manual configuration required',
                    url: consoleUrl,
                });
            }
            return [2 /*return*/, {
                    success: true,
                    message: 'Consulte as instruções abaixo para configurar os alertas manualmente',
                    alerts: alerts,
                    urls: {
                        monitoring: "https://console.cloud.google.com/monitoring?project=".concat(projectId),
                        alerts: "https://console.cloud.google.com/monitoring/alerting?project=".concat(projectId),
                        logs: "https://console.cloud.google.com/logs?project=".concat(projectId),
                        dashboard: "https://console.cloud.google.com/monitoring/dashboards?project=".concat(projectId),
                    },
                }];
        }
        catch (error) {
            logger_1.logger.error('[setupMonitoring] Error:', error);
            throw new Error("Failed to setup monitoring: ".concat(error.message));
        }
        return [2 /*return*/];
    });
}); });
