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
exports.handleAppointmentSync = handleAppointmentSync;
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
/**
 * Sync Appointments from Firestore to Cloud SQL
 * Enables offline scheduling support by replicating Firestore changes to PostgreSQL.
 */
function handleAppointmentSync(event) {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot, appointmentId, newData, pool, e_1, organizationId, rawStatus, validStatuses, status_1, rawType, validTypes, sessionType, therapistId, query, values, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    snapshot = event.data;
                    if (!snapshot)
                        return [2 /*return*/];
                    appointmentId = event.params.appointmentId;
                    newData = snapshot.after.exists ? snapshot.after.data() : null;
                    pool = (0, init_1.getPool)();
                    if (!!newData) return [3 /*break*/, 5];
                    logger_1.logger.info("[Sync] Appointment ".concat(appointmentId, " deleted in Firestore. Cancelling in SQL."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("UPDATE appointments SET status = 'cancelado', updated_at = NOW() WHERE id = $1", [appointmentId])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    logger_1.logger.error("[Sync] Failed to cancel appointment ".concat(appointmentId, " in SQL:"), e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    organizationId = newData.organizationId || newData.organization_id;
                    if (!organizationId) {
                        logger_1.logger.warn("[Sync] Appointment ".concat(appointmentId, " has no organizationId. Skipping."));
                        return [2 /*return*/];
                    }
                    rawStatus = (newData.status || 'agendado').toLowerCase();
                    validStatuses = ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'paciente_faltou'];
                    status_1 = validStatuses.includes(rawStatus) ? rawStatus : 'agendado';
                    rawType = (newData.type || newData.session_type || 'individual').toLowerCase();
                    validTypes = ['individual', 'dupla', 'grupo'];
                    sessionType = validTypes.includes(rawType) ? rawType : 'individual';
                    therapistId = newData.therapistId || newData.therapist_id || newData.createdBy || newData.created_by;
                    if (!newData.patientId) {
                        logger_1.logger.warn("[Sync] Appointment ".concat(appointmentId, " has no patientId. Skipping."));
                        return [2 /*return*/];
                    }
                    query = "\n            INSERT INTO appointments (\n                id, organization_id, patient_id, therapist_id,\n                date, start_time, end_time,\n                status, session_type, notes,\n                created_at, updated_at\n            ) VALUES (\n                $1, $2, $3, $4,\n                $5, $6, $7,\n                $8, $9, $10,\n                $11, NOW()\n            )\n            ON CONFLICT (id) DO UPDATE SET\n                patient_id = EXCLUDED.patient_id,\n                therapist_id = EXCLUDED.therapist_id,\n                date = EXCLUDED.date,\n                start_time = EXCLUDED.start_time,\n                end_time = EXCLUDED.end_time,\n                status = EXCLUDED.status,\n                session_type = EXCLUDED.session_type,\n                notes = EXCLUDED.notes,\n                updated_at = NOW()\n            WHERE appointments.updated_at < NOW() - INTERVAL '2 seconds'\n        ";
                    values = [
                        appointmentId,
                        organizationId,
                        newData.patientId || newData.patient_id,
                        therapistId, // Can be null in DB? Check schema. If Schema requires NOT NULL, we might need a placeholder or fail.
                        newData.date,
                        newData.startTime || newData.start_time,
                        newData.endTime || newData.end_time,
                        status_1,
                        sessionType,
                        newData.notes || null,
                        newData.created_at ? new Date(newData.created_at) : new Date()
                    ];
                    return [4 /*yield*/, pool.query(query, values)];
                case 6:
                    _a.sent();
                    logger_1.logger.info("[Sync] Appointment ".concat(appointmentId, " synced to Cloud SQL."));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    // Special handling for FK violations (Patient doesn't exist yet in SQL)
                    if (error_1.code === '23503') { // foreign_key_violation
                        logger_1.logger.warn("[Sync] FK Violation for appointment ".concat(appointmentId, ". Patient might not exist yet in SQL. Retrying..."));
                        // Throwing error forces Cloud Function to retry (Backoff strategy)
                        throw error_1;
                    }
                    logger_1.logger.error("[Sync] Error syncing appointment ".concat(appointmentId, ":"), error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
