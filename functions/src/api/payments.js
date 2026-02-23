"use strict";
/**
 * Lista pagamentos de um paciente
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
exports.createPayment = exports.createPaymentHandler = exports.getPatientFinancialSummary = exports.getPatientFinancialSummaryHandler = exports.listPayments = exports.listPaymentsHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var auth_1 = require("../middleware/auth");
var logger_1 = require("../lib/logger");
/**
 * Lista pagamentos de um paciente
 */
var listPaymentsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, _b, limit, _c, offset, pool, query, params, result, error_1, errorMessage;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _d.sent();
                _a = request.data, patientId = _a.patientId, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                query = "\n      SELECT p.*,\n        pat.name as patient_name,\n        prof.full_name as therapist_name\n      FROM payments p\n      LEFT JOIN patients pat ON p.patient_id = pat.id\n      LEFT JOIN profiles prof ON p.therapist_id = prof.user_id\n      WHERE p.organization_id = $1\n    ";
                params = [auth.organizationId];
                if (patientId) {
                    query += " AND p.patient_id = $".concat(params.length + 1);
                    params.push(patientId);
                }
                query += " ORDER BY p.payment_date DESC, p.created_at DESC LIMIT $".concat(params.length + 1, " OFFSET $").concat(params.length + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(query, params)];
            case 3:
                result = _d.sent();
                return [2 /*return*/, { data: result.rows }];
            case 4:
                error_1 = _d.sent();
                logger_1.logger.error('Error in listPayments:', error_1);
                if (error_1 instanceof https_1.HttpsError)
                    throw error_1;
                errorMessage = error_1 instanceof Error ? error_1.message : 'Erro ao listar pagamentos';
                throw new https_1.HttpsError('internal', errorMessage);
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.listPaymentsHandler = listPaymentsHandler;
exports.listPayments = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.listPaymentsHandler);
/**
 * Busca resumo financeiro do paciente
 */
var getPatientFinancialSummaryHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, patientId, pool, patientCheck, result, packages, error_2, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _a.sent();
                patientId = request.data.patientId;
                if (!patientId) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
                }
                pool = (0, init_1.getPool)();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, , 7]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _a.sent();
                if (patientCheck.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                return [4 /*yield*/, pool.query("SELECT\n        COALESCE(SUM(p.amount_cents) FILTER (p.status = 'completed'), 0) as total_paid_cents,\n        COUNT(p.id) FILTER (p.status = 'completed') as individual_sessions_paid,\n        COALESCE(SUM(pkg.sessions_count), 0) as package_sessions_total,\n        COALESCE(SUM(pkg.sessions_used), 0) as package_sessions_used,\n        COALESCE(SUM(pkg.sessions_count - pkg.sessions_used) FILTER (pkg.is_active = true), 0) as package_sessions_available\n      FROM payments p\n      LEFT JOIN patient_session_packages pkg ON pkg.patient_id = $1 AND pkg.is_active = true\n      WHERE p.patient_id = $1 AND p.organization_id = $2\n      GROUP BY p.patient_id", [patientId, auth.organizationId])];
            case 4:
                result = _a.sent();
                return [4 /*yield*/, pool.query("SELECT\n        id,\n        sessions_count,\n        sessions_used,\n        amount_cents,\n        purchase_date,\n        valid_until,\n        is_active\n      FROM patient_session_packages\n      WHERE patient_id = $1 AND is_active = true\n        AND valid_until > CURRENT_DATE\n      ORDER BY valid_until", [patientId])];
            case 5:
                packages = _a.sent();
                return [2 /*return*/, {
                        summary: result.rows[0] || {
                            total_paid_cents: 0,
                            individual_sessions_paid: 0,
                            package_sessions_total: 0,
                            package_sessions_used: 0,
                            package_sessions_available: 0,
                        },
                        active_packages: packages.rows,
                    }];
            case 6:
                error_2 = _a.sent();
                logger_1.logger.error('Error in getPatientFinancialSummary:', error_2);
                if (error_2 instanceof https_1.HttpsError)
                    throw error_2;
                errorMessage = error_2 instanceof Error ? error_2.message : 'Erro ao buscar resumo financeiro';
                throw new https_1.HttpsError('internal', errorMessage);
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.getPatientFinancialSummaryHandler = getPatientFinancialSummaryHandler;
exports.getPatientFinancialSummary = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.getPatientFinancialSummaryHandler);
/**
 * Cria um novo pagamento
 */
var createPaymentHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, _a, patientId, appointmentId, amountCents, method, paymentDate, notes, pool, patientCheck, apt, result, payment, error_3, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth || !request.auth.token) {
                    throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
                }
                return [4 /*yield*/, (0, auth_1.authorizeRequest)(request.auth.token)];
            case 1:
                auth = _b.sent();
                _a = request.data, patientId = _a.patientId, appointmentId = _a.appointmentId, amountCents = _a.amountCents, method = _a.method, paymentDate = _a.paymentDate, notes = _a.notes;
                if (!patientId || !amountCents || !method) {
                    throw new https_1.HttpsError('invalid-argument', 'patientId, amountCents e method são obrigatórios');
                }
                pool = (0, init_1.getPool)();
                _b.label = 2;
            case 2:
                _b.trys.push([2, 7, , 8]);
                return [4 /*yield*/, pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId])];
            case 3:
                patientCheck = _b.sent();
                if (patientCheck.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                if (!appointmentId) return [3 /*break*/, 5];
                return [4 /*yield*/, pool.query('SELECT id FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId])];
            case 4:
                apt = _b.sent();
                if (apt.rows.length === 0) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                _b.label = 5;
            case 5: return [4 /*yield*/, pool.query("INSERT INTO payments (\n        patient_id, appointment_id, amount_cents, method,\n        payment_date, organization_id, notes\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7)\n      RETURNING *", [
                    patientId,
                    appointmentId || null,
                    amountCents,
                    method,
                    paymentDate || new Date().toISOString().split('T')[0],
                    auth.organizationId,
                    notes || null,
                ])];
            case 6:
                result = _b.sent();
                payment = result.rows[0];
                return [2 /*return*/, { data: payment }];
            case 7:
                error_3 = _b.sent();
                logger_1.logger.error('Error in createPayment:', error_3);
                if (error_3 instanceof https_1.HttpsError)
                    throw error_3;
                errorMessage = error_3 instanceof Error ? error_3.message : 'Erro ao criar pagamento';
                throw new https_1.HttpsError('internal', errorMessage);
            case 8: return [2 /*return*/];
        }
    });
}); };
exports.createPaymentHandler = createPaymentHandler;
exports.createPayment = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.createPaymentHandler);
