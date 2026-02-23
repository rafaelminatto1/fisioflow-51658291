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
exports.handlePatientSync = handlePatientSync;
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
/**
 * Sync Patients from Firestore to Cloud SQL (Handler Logic)
 * Ensures that changes made directly in Firestore (e.g. mobile offline mode)
 * are reflected in the relational database.
 */
function handlePatientSync(event) {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot, patientId, newData, pool_1, e_1, pool, name_1, email, cpf, phone, organizationId, query, values, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    snapshot = event.data;
                    if (!snapshot)
                        return [2 /*return*/];
                    patientId = event.params.patientId;
                    newData = snapshot.after.exists ? snapshot.after.data() : null;
                    if (!!newData) return [3 /*break*/, 5];
                    logger_1.logger.info("[Sync] Patient ".concat(patientId, " deleted in Firestore. Soft-deleting in SQL."));
                    pool_1 = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool_1.query('UPDATE patients SET is_active = false, updated_at = NOW() WHERE id = $1', [patientId])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    logger_1.logger.error("[Sync] Failed to soft-delete patient ".concat(patientId, " in SQL:"), e_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
                case 5:
                    pool = (0, init_1.getPool)();
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 9, , 10]);
                    name_1 = newData.name || newData.full_name;
                    email = newData.email || null;
                    cpf = newData.cpf ? newData.cpf.replace(/\D/g, '') : null;
                    phone = newData.phone || null;
                    organizationId = newData.organizationId || newData.organization_id;
                    if (!organizationId) {
                        logger_1.logger.warn("[Sync] Patient ".concat(patientId, " has no organizationId. Skipping SQL sync."));
                        return [2 /*return*/];
                    }
                    // Garante que a organização existe (para evitar erro de FK)
                    return [4 /*yield*/, pool.query("INSERT INTO organizations (id, name, email) VALUES ($1, 'Cl\u00EDnica Sync', 'sync@fisioflow.com') ON CONFLICT (id) DO NOTHING", [organizationId])];
                case 7:
                    // Garante que a organização existe (para evitar erro de FK)
                    _a.sent();
                    query = "\n            INSERT INTO patients (\n                id, organization_id, name, email, cpf, phone, \n                birth_date, gender, main_condition, status, \n                is_active, updated_at, created_at,\n                referring_doctor_name, referring_doctor_phone, medical_return_date,\n                medical_report_done, medical_report_sent\n            ) VALUES (\n                $1, $2, $3, $4, $5, $6, \n                $7, $8, $9, $10, \n                $11, NOW(), $12,\n                $13, $14, $15, $16, $17\n            )\n            ON CONFLICT (id) DO UPDATE SET\n                name = EXCLUDED.name,\n                email = EXCLUDED.email,\n                cpf = EXCLUDED.cpf,\n                phone = EXCLUDED.phone,\n                birth_date = EXCLUDED.birth_date,\n                gender = EXCLUDED.gender,\n                main_condition = EXCLUDED.main_condition,\n                status = EXCLUDED.status,\n                is_active = EXCLUDED.is_active,\n                referring_doctor_name = EXCLUDED.referring_doctor_name,\n                referring_doctor_phone = EXCLUDED.referring_doctor_phone,\n                medical_return_date = EXCLUDED.medical_return_date,\n                medical_report_done = EXCLUDED.medical_report_done,\n                medical_report_sent = EXCLUDED.medical_report_sent,\n                updated_at = NOW()\n            WHERE patients.updated_at < NOW() - INTERVAL '2 seconds'\n        ";
                    values = [
                        patientId,
                        organizationId,
                        name_1,
                        email,
                        cpf,
                        phone,
                        newData.birth_date || '1900-01-01',
                        newData.gender || null,
                        newData.main_condition || 'A definir',
                        newData.status || 'Inicial',
                        newData.is_active !== false, // Default true
                        newData.created_at ? new Date(newData.created_at) : new Date(),
                        newData.referring_doctor_name || null,
                        newData.referring_doctor_phone || null,
                        newData.medical_return_date || null,
                        newData.medical_report_done === true,
                        newData.medical_report_sent === true
                    ];
                    return [4 /*yield*/, pool.query(query, values)];
                case 8:
                    _a.sent();
                    logger_1.logger.info("[Sync] Patient ".concat(patientId, " synced to Cloud SQL."));
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _a.sent();
                    logger_1.logger.error("[Sync] Error syncing patient ".concat(patientId, " to SQL:"), error_1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
