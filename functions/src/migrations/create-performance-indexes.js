"use strict";
/**
 * Migration: Create Performance Indexes
 * Otimiza queries comuns no PostgreSQL
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPerformanceIndexes = exports.createPerformanceIndexesHandler = void 0;
// Firebase Functions v2 CORS - explicitly list allowed origins
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
/**
 * Migration para criar índices de performance no PostgreSQL
 */
var createPerformanceIndexesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var admin, user, pool, patientIndexes, appointmentIndexes, exerciseIndexes, assessmentIndexes, medicalRecordIndexes, financialIndexes, profileIndexes, allIndexes, results, _i, allIndexes_1, indexSql, indexName, err_1, indexName, tables, _a, tables_1, table, err_2, indexCheck, error_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new Error('Unauthorized');
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('firebase-admin/auth'); })];
            case 1:
                admin = _d.sent();
                return [4 /*yield*/, admin.getAuth().getUser(request.auth.uid)];
            case 2:
                user = _d.sent();
                if (!user.customClaims || user.customClaims.role !== 'admin') {
                    throw new Error('Forbidden: Admin only');
                }
                pool = (0, init_1.getPool)();
                _d.label = 3;
            case 3:
                _d.trys.push([3, 17, , 18]);
                console.log('[Migration] Starting performance indexes creation...');
                patientIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_patients_org_id ON patients(organization_id) WHERE is_active = true;',
                    'CREATE INDEX IF NOT EXISTS idx_patients_cpf_org ON patients(cpf, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_patients_name_org ON patients(LOWER(name), organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);',
                ];
                appointmentIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date, start_time);',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_patient_org ON appointments(patient_id, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_org ON appointments(therapist_id, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_appointments_status_org ON appointments(status, organization_id);',
                ];
                exerciseIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_exercises_active ON exercises(is_active) WHERE is_active = true;',
                    'CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);',
                    'CREATE INDEX IF NOT EXISTS idx_exercises_patient_prescribed ON patient_exercises(patient_id, prescribed_at DESC);',
                ];
                assessmentIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_assessments_patient_org ON patient_assessments(patient_id, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_assessments_date_org ON patient_assessments(assessment_date DESC, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_assessments_responses_assessment ON assessment_responses(assessment_id);',
                ];
                medicalRecordIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_medical_records_patient_org ON medical_records(patient_id, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_medical_records_date_org ON medical_records(record_date DESC, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient_org ON treatment_sessions(patient_id, organization_id);',
                    'CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date_org ON treatment_sessions(session_date DESC, organization_id);',
                ];
                financialIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_transactions_org ON transacoes(organization_id, created_at DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_payments_org_date ON pagamentos(organization_id, payment_date DESC);',
                    'CREATE INDEX IF NOT EXISTS idx_payments_patient ON pagamentos(patient_id, organization_id);',
                ];
                profileIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);',
                ];
                allIndexes = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], patientIndexes, true), appointmentIndexes, true), exerciseIndexes, true), assessmentIndexes, true), medicalRecordIndexes, true), financialIndexes, true), profileIndexes, true);
                results = [];
                _i = 0, allIndexes_1 = allIndexes;
                _d.label = 4;
            case 4:
                if (!(_i < allIndexes_1.length)) return [3 /*break*/, 9];
                indexSql = allIndexes_1[_i];
                _d.label = 5;
            case 5:
                _d.trys.push([5, 7, , 8]);
                return [4 /*yield*/, pool.query(indexSql)];
            case 6:
                _d.sent();
                indexName = ((_b = indexSql.match(/idx_\w+/)) === null || _b === void 0 ? void 0 : _b[0]) || 'unknown';
                console.log("[Migration] \u2713 Created index: ".concat(indexName));
                results.push({ index: indexName, status: 'created' });
                return [3 /*break*/, 8];
            case 7:
                err_1 = _d.sent();
                indexName = ((_c = indexSql.match(/idx_\w+/)) === null || _c === void 0 ? void 0 : _c[0]) || 'unknown';
                if (err_1.message.includes('already exists')) {
                    console.log("[Migration] - Index already exists: ".concat(indexName));
                    results.push({ index: indexName, status: 'exists' });
                }
                else {
                    console.error("[Migration] \u2717 Error creating index ".concat(indexName, ":"), err_1.message);
                    results.push({ index: indexName, status: "error: ".concat(err_1.message) });
                }
                return [3 /*break*/, 8];
            case 8:
                _i++;
                return [3 /*break*/, 4];
            case 9:
                // Analisar tabelas para atualizar estatísticas
                console.log('[Migration] Analyzing tables...');
                tables = ['patients', 'appointments', 'exercises', 'patient_exercises', 'patient_assessments',
                    'assessment_responses', 'medical_records', 'treatment_sessions', 'transacoes', 'pagamentos', 'profiles'];
                _a = 0, tables_1 = tables;
                _d.label = 10;
            case 10:
                if (!(_a < tables_1.length)) return [3 /*break*/, 15];
                table = tables_1[_a];
                _d.label = 11;
            case 11:
                _d.trys.push([11, 13, , 14]);
                return [4 /*yield*/, pool.query("ANALYZE ".concat(table, ";"))];
            case 12:
                _d.sent();
                console.log("[Migration] \u2713 Analyzed table: ".concat(table));
                return [3 /*break*/, 14];
            case 13:
                err_2 = _d.sent();
                console.warn("[Migration] - Could not analyze ".concat(table, ":"), err_2.message);
                return [3 /*break*/, 14];
            case 14:
                _a++;
                return [3 /*break*/, 10];
            case 15: return [4 /*yield*/, pool.query("\n      SELECT\n        schemaname,\n        tablename,\n        indexname,\n        indexdef\n      FROM pg_indexes\n      WHERE indexname LIKE 'idx_%'\n      ORDER BY tablename, indexname;\n    ")];
            case 16:
                indexCheck = _d.sent();
                console.log("[Migration] \u2713 Total indexes created/verified: ".concat(results.filter(function (r) { return r.status === 'created'; }).length));
                console.log("[Migration] \u2713 Total indexes already existing: ".concat(results.filter(function (r) { return r.status === 'exists'; }).length));
                return [2 /*return*/, {
                        success: true,
                        results: results,
                        totalIndexes: results.length,
                        existingIndexes: indexCheck.rows.length,
                        indexes: indexCheck.rows,
                    }];
            case 17:
                error_1 = _d.sent();
                console.error('[Migration] Error:', error_1);
                throw new Error("Migration failed: ".concat(error_1.message));
            case 18: return [2 /*return*/];
        }
    });
}); };
exports.createPerformanceIndexesHandler = createPerformanceIndexesHandler;
exports.createPerformanceIndexes = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
}, exports.createPerformanceIndexesHandler);
