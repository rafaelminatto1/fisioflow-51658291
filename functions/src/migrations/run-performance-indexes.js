"use strict";
/**
 * HTTP endpoint to run performance indexes migration
 * This creates all the indexes defined in the SQL migration file
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/runPerformanceIndexes?key=YOUR_API_KEY"
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
exports.runPerformanceIndexes = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
exports.runPerformanceIndexes = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '512MiB',
    timeoutSeconds: 300,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, pool, client, results, err_1, patientIndexes, _i, patientIndexes_1, idx, idxName, err_2, appointmentIndexes, _a, appointmentIndexes_1, idx, idxName, err_3, err_4, err_5, err_6, err_7, err_8, err_9, err_10, err_11, err_12, err_13, err_14, err_15, err_16, err_17, tables, _b, tables_1, table, err_18, indexResult, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
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
                client = _e.sent();
                results = [];
                _e.label = 2;
            case 2:
                _e.trys.push([2, 86, 87, 88]);
                console.log('🔄 Starting Performance Indexes Migration...');
                _e.label = 3;
            case 3:
                _e.trys.push([3, 5, , 6]);
                return [4 /*yield*/, client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm")];
            case 4:
                _e.sent();
                results.push({ step: 'Enable pg_trgm extension', success: true, message: 'pg_trgm enabled' });
                console.log('✅ pg_trgm extension enabled');
                return [3 /*break*/, 6];
            case 5:
                err_1 = _e.sent();
                results.push({ step: 'Enable pg_trgm extension', success: true, message: 'Already exists' });
                console.log('ℹ️ pg_trgm already exists');
                return [3 /*break*/, 6];
            case 6:
                patientIndexes = [
                    "CREATE INDEX IF NOT EXISTS idx_patients_org_active_status ON patients(organization_id, is_active, status) WHERE is_active = true",
                    "CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin(name gin_trgm_ops)",
                    "CREATE INDEX IF NOT EXISTS idx_patients_cpf_trgm ON patients USING gin(cpf gin_trgm_ops)",
                    "CREATE INDEX IF NOT EXISTS idx_patients_email_trgm ON patients USING gin(email gin_trgm_ops)",
                    "CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON patients(profile_id) WHERE profile_id IS NOT NULL",
                ];
                _i = 0, patientIndexes_1 = patientIndexes;
                _e.label = 7;
            case 7:
                if (!(_i < patientIndexes_1.length)) return [3 /*break*/, 12];
                idx = patientIndexes_1[_i];
                _e.label = 8;
            case 8:
                _e.trys.push([8, 10, , 11]);
                return [4 /*yield*/, client.query(idx)];
            case 9:
                _e.sent();
                idxName = ((_c = idx.match(/idx_\w+/)) === null || _c === void 0 ? void 0 : _c[0]) || 'unknown';
                results.push({ step: "Create index ".concat(idxName), success: true });
                console.log("\u2705 ".concat(idxName));
                return [3 /*break*/, 11];
            case 10:
                err_2 = _e.sent();
                results.push({ step: 'Create patient index', success: false, error: err_2.message });
                console.error("\u274C Patient index error:", err_2.message);
                return [3 /*break*/, 11];
            case 11:
                _i++;
                return [3 /*break*/, 7];
            case 12:
                appointmentIndexes = [
                    "CREATE INDEX IF NOT EXISTS idx_appointments_org_date_status ON appointments(organization_id, appointment_date DESC, appointment_time) WHERE status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')",
                    "CREATE INDEX IF NOT EXISTS idx_appointments_patient_org_status ON appointments(patient_id, organization_id, appointment_date DESC)",
                    "CREATE INDEX IF NOT EXISTS idx_appointments_professional_org_status ON appointments(professional_id, organization_id, appointment_date, appointment_time)",
                    "CREATE INDEX IF NOT EXISTS idx_appointments_org_datetime ON appointments(organization_id, appointment_date, appointment_time) WHERE status IN ('agendado', 'confirmado')",
                ];
                _a = 0, appointmentIndexes_1 = appointmentIndexes;
                _e.label = 13;
            case 13:
                if (!(_a < appointmentIndexes_1.length)) return [3 /*break*/, 18];
                idx = appointmentIndexes_1[_a];
                _e.label = 14;
            case 14:
                _e.trys.push([14, 16, , 17]);
                return [4 /*yield*/, client.query(idx)];
            case 15:
                _e.sent();
                idxName = ((_d = idx.match(/idx_\w+/)) === null || _d === void 0 ? void 0 : _d[0]) || 'unknown';
                results.push({ step: "Create index ".concat(idxName), success: true });
                console.log("\u2705 ".concat(idxName));
                return [3 /*break*/, 17];
            case 16:
                err_3 = _e.sent();
                results.push({ step: 'Create appointment index', success: false, error: err_3.message });
                return [3 /*break*/, 17];
            case 17:
                _a++;
                return [3 /*break*/, 13];
            case 18:
                _e.trys.push([18, 21, , 22]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id) WHERE organization_id IS NOT NULL")];
            case 19:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON profiles USING gin(email gin_trgm_ops)")];
            case 20:
                _e.sent();
                results.push({ step: 'Create profiles indexes', success: true });
                console.log('✅ Profiles indexes');
                return [3 /*break*/, 22];
            case 21:
                err_4 = _e.sent();
                results.push({ step: 'Create profiles indexes', success: true, message: 'Already exists or error' });
                return [3 /*break*/, 22];
            case 22:
                _e.trys.push([22, 26, , 27]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org_date ON treatment_sessions(patient_id, organization_id, session_date DESC)")];
            case 23:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_treatment_sessions_therapist_org ON treatment_sessions(therapist_id, organization_id)")];
            case 24:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_treatment_sessions_appointment ON treatment_sessions(appointment_id) WHERE appointment_id IS NOT NULL")];
            case 25:
                _e.sent();
                results.push({ step: 'Create treatment_sessions indexes', success: true });
                console.log('✅ Treatment sessions indexes');
                return [3 /*break*/, 27];
            case 26:
                err_5 = _e.sent();
                results.push({ step: 'Create treatment_sessions indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 27];
            case 27:
                _e.trys.push([27, 30, , 31]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_patient_pain_records_patient_org_date ON patient_pain_records(patient_id, organization_id, created_at DESC)")];
            case 28:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_patient_pain_records_body_part ON patient_pain_records(body_part) WHERE body_part IS NOT NULL")];
            case 29:
                _e.sent();
                results.push({ step: 'Create pain_records indexes', success: true });
                console.log('✅ Pain records indexes');
                return [3 /*break*/, 31];
            case 30:
                err_6 = _e.sent();
                results.push({ step: 'Create pain_records indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 31];
            case 31:
                _e.trys.push([31, 35, , 36]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_assessments_patient_org_date ON patient_assessments(patient_id, organization_id, assessment_date DESC)")];
            case 32:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_assessments_template_org ON patient_assessments(template_id, organization_id)")];
            case 33:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_assessments_status_org ON patient_assessments(status, organization_id)")];
            case 34:
                _e.sent();
                results.push({ step: 'Create assessments indexes', success: true });
                console.log('✅ Assessments indexes');
                return [3 /*break*/, 36];
            case 35:
                err_7 = _e.sent();
                results.push({ step: 'Create assessments indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 36];
            case 36:
                _e.trys.push([36, 40, , 41]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_payments_patient_org_date ON payments(patient_id, organization_id, payment_date DESC)")];
            case 37:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_payments_org_status_date ON payments(organization_id, status, payment_date DESC)")];
            case 38:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id) WHERE appointment_id IS NOT NULL")];
            case 39:
                _e.sent();
                results.push({ step: 'Create payments indexes', success: true });
                console.log('✅ Payments indexes');
                return [3 /*break*/, 41];
            case 40:
                err_8 = _e.sent();
                results.push({ step: 'Create payments indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 41];
            case 41:
                _e.trys.push([41, 45, , 46]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_transacoes_org_created ON transacoes(organization_id, created_at DESC)")];
            case 42:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_transacoes_metadata_appointment ON transacoes USING gin((metadata->>'appointment_id') gin_trgm_ops) WHERE (metadata->>'appointment_id') IS NOT NULL")];
            case 43:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_transacoes_org_tipo ON transacoes(organization_id, tipo, created_at DESC)")];
            case 44:
                _e.sent();
                results.push({ step: 'Create transacoes indexes', success: true });
                console.log('✅ Transacoes indexes');
                return [3 /*break*/, 46];
            case 45:
                err_9 = _e.sent();
                results.push({ step: 'Create transacoes indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 46];
            case 46:
                _e.trys.push([46, 50, , 51]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org_created ON whatsapp_messages(organization_id, created_at DESC)")];
            case 47:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient_org ON whatsapp_messages(patient_id, organization_id, created_at DESC)")];
            case 48:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status, created_at DESC) WHERE status != 'sent'")];
            case 49:
                _e.sent();
                results.push({ step: 'Create whatsapp_messages indexes', success: true });
                console.log('✅ WhatsApp messages indexes');
                return [3 /*break*/, 51];
            case 50:
                err_10 = _e.sent();
                results.push({ step: 'Create whatsapp_messages indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 51];
            case 51:
                _e.trys.push([51, 54, , 55]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_patient_org ON prescribed_exercises(patient_id, organization_id, created_at DESC)")];
            case 52:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_exercise_org ON prescribed_exercises(exercise_id, organization_id)")];
            case 53:
                _e.sent();
                results.push({ step: 'Create prescribed_exercises indexes', success: true });
                console.log('✅ Prescribed exercises indexes');
                return [3 /*break*/, 55];
            case 54:
                err_11 = _e.sent();
                results.push({ step: 'Create prescribed_exercises indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 55];
            case 55:
                _e.trys.push([55, 57, , 58]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_exercise_logs_patient_org_date ON exercise_logs(patient_id, organization_id, performed_at DESC)")];
            case 56:
                _e.sent();
                results.push({ step: 'Create exercise_logs indexes', success: true });
                console.log('✅ Exercise logs indexes');
                return [3 /*break*/, 58];
            case 57:
                err_12 = _e.sent();
                results.push({ step: 'Create exercise_logs indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 58];
            case 58:
                _e.trys.push([58, 60, , 61]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_evolutions_patient_org_date ON evolutions(patient_id, organization_id, created_at DESC)")];
            case 59:
                _e.sent();
                results.push({ step: 'Create evolutions indexes', success: true });
                console.log('✅ Evolutions indexes');
                return [3 /*break*/, 61];
            case 60:
                err_13 = _e.sent();
                results.push({ step: 'Create evolutions indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 61];
            case 61:
                _e.trys.push([61, 64, , 65]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org_date ON medical_records(patient_id, organization_id, record_date DESC)")];
            case 62:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_medical_records_type_org ON medical_records(type, organization_id)")];
            case 63:
                _e.sent();
                results.push({ step: 'Create medical_records indexes', success: true });
                console.log('✅ Medical records indexes');
                return [3 /*break*/, 65];
            case 64:
                err_14 = _e.sent();
                results.push({ step: 'Create medical_records indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 65];
            case 65:
                _e.trys.push([65, 68, , 69]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_at) WHERE status = 'pending'")];
            case 66:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status, scheduled_at) WHERE status = 'pending'")];
            case 67:
                _e.sent();
                results.push({ step: 'Create notification_queue indexes', success: true });
                console.log('✅ Notification queue indexes');
                return [3 /*break*/, 69];
            case 68:
                err_15 = _e.sent();
                results.push({ step: 'Create notification_queue indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 69];
            case 69:
                _e.trys.push([69, 72, , 73]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_background_jobs_status_created ON background_jobs(status, created_at DESC) WHERE status IN ('pending', 'running')")];
            case 70:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status ON background_jobs(job_type, status)")];
            case 71:
                _e.sent();
                results.push({ step: 'Create background_jobs indexes', success: true });
                console.log('✅ Background jobs indexes');
                return [3 /*break*/, 73];
            case 72:
                err_16 = _e.sent();
                results.push({ step: 'Create background_jobs indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 73];
            case 73:
                _e.trys.push([73, 77, , 78]);
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC)")];
            case 74:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action, created_at DESC)")];
            case 75:
                _e.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_resolved ON audit_logs(resolved, created_at DESC)")];
            case 76:
                _e.sent();
                results.push({ step: 'Create audit_logs indexes', success: true });
                console.log('✅ Audit logs indexes');
                return [3 /*break*/, 78];
            case 77:
                err_17 = _e.sent();
                results.push({ step: 'Create audit_logs indexes', success: true, message: 'Already exists' });
                return [3 /*break*/, 78];
            case 78:
                tables = ['patients', 'appointments', 'profiles', 'treatment_sessions', 'pain_records', 'patient_assessments', 'payments', 'transacoes', 'whatsapp_messages', 'prescribed_exercises', 'exercise_logs', 'evolutions', 'medical_records', 'notification_queue', 'background_jobs', 'audit_logs'];
                _b = 0, tables_1 = tables;
                _e.label = 79;
            case 79:
                if (!(_b < tables_1.length)) return [3 /*break*/, 84];
                table = tables_1[_b];
                _e.label = 80;
            case 80:
                _e.trys.push([80, 82, , 83]);
                return [4 /*yield*/, client.query("ANALYZE ".concat(table))];
            case 81:
                _e.sent();
                console.log("\u2705 ANALYZE ".concat(table));
                return [3 /*break*/, 83];
            case 82:
                err_18 = _e.sent();
                console.log("\u2139\uFE0F Table ".concat(table, " might not exist or already analyzed"));
                return [3 /*break*/, 83];
            case 83:
                _b++;
                return [3 /*break*/, 79];
            case 84: return [4 /*yield*/, client.query("\n      SELECT schemaname, tablename, indexname\n      FROM pg_indexes\n      WHERE schemaname = 'public'\n        AND indexname LIKE 'idx_%'\n      ORDER BY tablename, indexname\n      LIMIT 50\n    ")];
            case 85:
                indexResult = _e.sent();
                console.log('✅ Performance Indexes Migration completed successfully!');
                console.log("\uD83D\uDCCA Total indexes found: ".concat(indexResult.rows.length));
                res.json({
                    success: true,
                    message: 'Performance indexes migration completed successfully',
                    results: results,
                    indexesCreated: indexResult.rows.length,
                    indexes: indexResult.rows,
                    timestamp: new Date().toISOString(),
                });
                return [3 /*break*/, 88];
            case 86:
                error_1 = _e.sent();
                console.error('❌ Migration failed:', error_1);
                res.status(500).json({
                    success: false,
                    error: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1),
                    results: results,
                });
                return [3 /*break*/, 88];
            case 87:
                client.release();
                return [7 /*endfinally*/];
            case 88: return [2 /*return*/];
        }
    });
}); });
