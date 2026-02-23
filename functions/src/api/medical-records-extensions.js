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
exports.savePathologies = exports.saveGoals = exports.saveSurgeries = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
var rag_index_maintenance_1 = require("../ai/rag/rag-index-maintenance");
// ============================================================================
// Helpers
// ============================================================================
function getPatientIdFromRecord(recordId, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT patient_id FROM medical_records WHERE id = $1 AND organization_id = $2', [recordId, organizationId])];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0) {
                        throw new https_1.HttpsError('not-found', 'Medical record not found');
                    }
                    return [2 /*return*/, result.rows[0].patient_id];
            }
        });
    });
}
// ============================================================================
// Functions
// ============================================================================
exports.saveSurgeries = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, recordId, surgeries, patientId, pool, client, _i, surgeries_1, surgery, error_1, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentication required');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, recordId = _a.recordId, surgeries = _a.surgeries;
                if (!recordId || !Array.isArray(surgeries)) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid arguments');
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 17, , 18]);
                return [4 /*yield*/, getPatientIdFromRecord(recordId, auth.organizationId)];
            case 3:
                patientId = _b.sent();
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 4:
                client = _b.sent();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 13, 15, 16]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 6:
                _b.sent();
                _i = 0, surgeries_1 = surgeries;
                _b.label = 7;
            case 7:
                if (!(_i < surgeries_1.length)) return [3 /*break*/, 10];
                surgery = surgeries_1[_i];
                return [4 /*yield*/, client.query("INSERT INTO patient_surgeries (\n                    patient_id, organization_id, name, date, surgeon, hospital, notes, created_by\n                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [
                        patientId,
                        auth.organizationId,
                        surgery.name,
                        surgery.date,
                        surgery.surgeon,
                        surgery.hospital,
                        surgery.notes || null,
                        auth.userId
                    ])];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10: return [4 /*yield*/, client.query('COMMIT')];
            case 11:
                _b.sent();
                // Background reindex
                return [4 /*yield*/, (0, rag_index_maintenance_1.triggerPatientRagReindex)({
                        patientId: patientId,
                        organizationId: auth.organizationId,
                        reason: 'surgeries_updated'
                    })];
            case 12:
                // Background reindex
                _b.sent();
                return [2 /*return*/, { success: true }];
            case 13:
                error_1 = _b.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 14:
                _b.sent();
                throw error_1;
            case 15:
                client.release();
                return [7 /*endfinally*/];
            case 16: return [3 /*break*/, 18];
            case 17:
                error_2 = _b.sent();
                logger_1.logger.error('Error saving surgeries:', error_2);
                throw new https_1.HttpsError('internal', 'Error saving surgeries');
            case 18: return [2 /*return*/];
        }
    });
}); });
exports.saveGoals = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, recordId, goals, patientId, pool, client, _i, goals_1, goal, error_3, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentication required');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, recordId = _a.recordId, goals = _a.goals;
                if (!recordId || !Array.isArray(goals)) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid arguments');
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 17, , 18]);
                return [4 /*yield*/, getPatientIdFromRecord(recordId, auth.organizationId)];
            case 3:
                patientId = _b.sent();
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 4:
                client = _b.sent();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 13, 15, 16]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 6:
                _b.sent();
                _i = 0, goals_1 = goals;
                _b.label = 7;
            case 7:
                if (!(_i < goals_1.length)) return [3 /*break*/, 10];
                goal = goals_1[_i];
                return [4 /*yield*/, client.query("INSERT INTO patient_goals (\n                    patient_id, organization_id, description, target_date, status, created_by\n                ) VALUES ($1, $2, $3, $4, 'active', $5)", [
                        patientId,
                        auth.organizationId,
                        goal.description,
                        goal.targetDate,
                        auth.userId
                    ])];
            case 8:
                _b.sent();
                _b.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10: return [4 /*yield*/, client.query('COMMIT')];
            case 11:
                _b.sent();
                return [4 /*yield*/, (0, rag_index_maintenance_1.triggerPatientRagReindex)({
                        patientId: patientId,
                        organizationId: auth.organizationId,
                        reason: 'goals_updated'
                    })];
            case 12:
                _b.sent();
                return [2 /*return*/, { success: true }];
            case 13:
                error_3 = _b.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 14:
                _b.sent();
                throw error_3;
            case 15:
                client.release();
                return [7 /*endfinally*/];
            case 16: return [3 /*break*/, 18];
            case 17:
                error_4 = _b.sent();
                logger_1.logger.error('Error saving goals:', error_4);
                throw new https_1.HttpsError('internal', 'Error saving goals');
            case 18: return [2 /*return*/];
        }
    });
}); });
exports.savePathologies = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, recordId, pathologies, patientId, pool, client, _i, pathologies_1, path, error_5, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Authentication required');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, recordId = _a.recordId, pathologies = _a.pathologies;
                if (!recordId || !Array.isArray(pathologies)) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid arguments');
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 17, , 18]);
                return [4 /*yield*/, getPatientIdFromRecord(recordId, auth.organizationId)];
            case 3:
                patientId = _b.sent();
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 4:
                client = _b.sent();
                _b.label = 5;
            case 5:
                _b.trys.push([5, 13, 15, 16]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 6:
                _b.sent();
                _i = 0, pathologies_1 = pathologies;
                _b.label = 7;
            case 7:
                if (!(_i < pathologies_1.length)) return [3 /*break*/, 10];
                path = pathologies_1[_i];
                // Check if already exists to avoid duplicates? Or just insert?
                // Assuming insert for history tracking, or maybe upsert?
                // Simple insert for now.
                return [4 /*yield*/, client.query("INSERT INTO patient_pathologies (\n                    patient_id, organization_id, name, status, diagnosed_at, created_by\n                ) VALUES ($1, $2, $3, $4, $5, $6)", [
                        patientId,
                        auth.organizationId,
                        path.name,
                        path.status,
                        path.diagnosedAt,
                        auth.userId
                    ])];
            case 8:
                // Check if already exists to avoid duplicates? Or just insert?
                // Assuming insert for history tracking, or maybe upsert?
                // Simple insert for now.
                _b.sent();
                _b.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 7];
            case 10: return [4 /*yield*/, client.query('COMMIT')];
            case 11:
                _b.sent();
                return [4 /*yield*/, (0, rag_index_maintenance_1.triggerPatientRagReindex)({
                        patientId: patientId,
                        organizationId: auth.organizationId,
                        reason: 'pathologies_updated'
                    })];
            case 12:
                _b.sent();
                return [2 /*return*/, { success: true }];
            case 13:
                error_5 = _b.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 14:
                _b.sent();
                throw error_5;
            case 15:
                client.release();
                return [7 /*endfinally*/];
            case 16: return [3 /*break*/, 18];
            case 17:
                error_6 = _b.sent();
                logger_1.logger.error('Error saving pathologies:', error_6);
                throw new https_1.HttpsError('internal', 'Error saving pathologies');
            case 18: return [2 /*return*/];
        }
    });
}); });
