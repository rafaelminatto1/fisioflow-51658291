"use strict";
/**
 * Audit Logging Middleware
 * Middleware para registrar ações sensíveis no sistema
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.audit = exports.AuditCategory = exports.AuditAction = void 0;
exports.logAudit = logAudit;
exports.withAuditLog = withAuditLog;
exports.createAuditContext = createAuditContext;
exports.getAuditLogs = getAuditLogs;
exports.cleanupAuditLogs = cleanupAuditLogs;
exports.exportAuditLogs = exportAuditLogs;
/**
 * Tipos de ações auditadas
 */
var init_1 = require("../init");
var logger_1 = require("../lib/logger");
var AuditAction;
(function (AuditAction) {
    // Pacientes
    AuditAction["PATIENT_CREATE"] = "patient.create";
    AuditAction["PATIENT_UPDATE"] = "patient.update";
    AuditAction["PATIENT_DELETE"] = "patient.delete";
    AuditAction["PATIENT_VIEW"] = "patient.view";
    // Agendamentos
    AuditAction["APPOINTMENT_CREATE"] = "appointment.create";
    AuditAction["APPOINTMENT_UPDATE"] = "appointment.update";
    AuditAction["APPOINTMENT_CANCEL"] = "appointment.cancel";
    AuditAction["APPOINTMENT_DELETE"] = "appointment.delete";
    // Financeiro
    AuditAction["PAYMENT_CREATE"] = "payment.create";
    AuditAction["PAYMENT_UPDATE"] = "payment.update";
    AuditAction["PAYMENT_DELETE"] = "payment.delete";
    AuditAction["TRANSACTION_CREATE"] = "transaction.create";
    AuditAction["TRANSACTION_UPDATE"] = "transaction.update";
    AuditAction["TRANSACTION_DELETE"] = "transaction.delete";
    // Prontuário
    AuditAction["MEDICAL_RECORD_CREATE"] = "medical_record.create";
    AuditAction["MEDICAL_RECORD_UPDATE"] = "medical_record.update";
    AuditAction["MEDICAL_RECORD_DELETE"] = "medical_record.delete";
    AuditAction["TREATMENT_SESSION_CREATE"] = "treatment_session.create";
    AuditAction["TREATMENT_SESSION_UPDATE"] = "treatment_session.update";
    // Avaliações
    AuditAction["ASSESSMENT_CREATE"] = "assessment.create";
    AuditAction["ASSESSMENT_UPDATE"] = "assessment.update";
    AuditAction["ASSESSMENT_DELETE"] = "assessment.delete";
    // Sistema
    AuditAction["USER_LOGIN"] = "user.login";
    AuditAction["USER_LOGOUT"] = "user.logout";
    AuditAction["USER_CREATE"] = "user.create";
    AuditAction["USER_UPDATE"] = "user.update";
    AuditAction["USER_DELETE"] = "user.delete";
    AuditAction["PERMISSION_CHANGE"] = "permission.change";
    AuditAction["EXPORT_DATA"] = "data.export";
    AuditAction["IMPORT_DATA"] = "data.import";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
/**
 * Categorias de ações
 */
var AuditCategory;
(function (AuditCategory) {
    AuditCategory["PATIENT"] = "patient";
    AuditCategory["APPOINTMENT"] = "appointment";
    AuditCategory["FINANCIAL"] = "financial";
    AuditCategory["MEDICAL"] = "medical";
    AuditCategory["ASSESSMENT"] = "assessment";
    AuditCategory["USER"] = "user";
    AuditCategory["SYSTEM"] = "system";
})(AuditCategory || (exports.AuditCategory = AuditCategory = {}));
/**
 * Tabela de audit logs no PostgreSQL
 */
var AUDIT_LOG_TABLE = 'audit_logs';
/**
 * Inicializa a tabela de audit logs se não existir
 */
function initAuditLogTable() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS ".concat(AUDIT_LOG_TABLE, " (\n      id SERIAL PRIMARY KEY,\n      action VARCHAR(100) NOT NULL,\n      category VARCHAR(50) NOT NULL,\n      user_id VARCHAR(255) NOT NULL,\n      user_name VARCHAR(255),\n      user_email VARCHAR(255),\n      organization_id VARCHAR(255) NOT NULL,\n      resource_id VARCHAR(255),\n      resource_type VARCHAR(100),\n      details JSONB,\n      ip_address INET,\n      user_agent TEXT,\n      success BOOLEAN NOT NULL DEFAULT true,\n      error_message TEXT,\n      metadata JSONB,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW()\n    );\n\n    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON ").concat(AUDIT_LOG_TABLE, "(user_id);\n    CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON ").concat(AUDIT_LOG_TABLE, "(organization_id);\n    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON ").concat(AUDIT_LOG_TABLE, "(action);\n    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON ").concat(AUDIT_LOG_TABLE, "(resource_type, resource_id);\n    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON ").concat(AUDIT_LOG_TABLE, "(created_at DESC);\n\n    -- Criar parti\u00E7\u00E3o por m\u00EAs para melhor performance\n    -- (opcional, para grandes volumes de dados)\n  "))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Registra uma ação de auditoria
 */
function logAudit(entry) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Inicializar tabela se necessário (em background)
                    initAuditLogTable().catch(function () { });
                    return [4 /*yield*/, pool.query("\n      INSERT INTO ".concat(AUDIT_LOG_TABLE, " (\n        action, category, user_id, user_name, user_email,\n        organization_id, resource_id, resource_type, details,\n        ip_address, user_agent, success, error_message, metadata\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)\n    "), [
                            entry.action,
                            entry.category,
                            entry.user_id,
                            entry.user_name || null,
                            entry.user_email || null,
                            entry.organization_id,
                            entry.resource_id || null,
                            entry.resource_type || null,
                            entry.details ? JSON.stringify(entry.details) : null,
                            entry.ip_address || null,
                            entry.user_agent || null,
                            entry.success,
                            entry.error_message || null,
                            entry.metadata ? JSON.stringify(entry.metadata) : null,
                        ])];
                case 2:
                    _a.sent();
                    logger_1.logger.info("[AuditLog] ".concat(entry.action, ": ").concat(entry.user_id, " - ").concat(entry.resource_type || 'N/A', ":").concat(entry.resource_id || 'N/A'));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    // Não falhar a operação se o audit log falhar
                    logger_1.logger.error('[AuditLog] Error logging audit entry:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Wrapper para funções com audit logging automático
 */
function withAuditLog(action, category, handler) {
    var _this = this;
    return function (request) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var startTime, context, result, error_2;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
            return __generator(this, function (_v) {
                switch (_v.label) {
                    case 0:
                        startTime = Date.now();
                        context = {
                            userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.user_id) || 'anonymous',
                            userName: ((_e = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.token) === null || _e === void 0 ? void 0 : _e.name) || ((_g = (_f = request.auth) === null || _f === void 0 ? void 0 : _f.token) === null || _g === void 0 ? void 0 : _g.email),
                            userEmail: (_j = (_h = request.auth) === null || _h === void 0 ? void 0 : _h.token) === null || _j === void 0 ? void 0 : _j.email,
                            organizationId: ((_l = (_k = request.auth) === null || _k === void 0 ? void 0 : _k.token) === null || _l === void 0 ? void 0 : _l.organization_id) || 'unknown',
                            ipAddress: ((_o = (_m = request.rawRequest) === null || _m === void 0 ? void 0 : _m.headers) === null || _o === void 0 ? void 0 : _o['x-forwarded-for']) ||
                                ((_q = (_p = request.rawRequest) === null || _p === void 0 ? void 0 : _p.headers) === null || _q === void 0 ? void 0 : _q['fastly-client-ip']) ||
                                ((_s = (_r = request.rawRequest) === null || _r === void 0 ? void 0 : _r.socket) === null || _s === void 0 ? void 0 : _s.remoteAddress),
                            userAgent: (_u = (_t = request.rawRequest) === null || _t === void 0 ? void 0 : _t.headers) === null || _u === void 0 ? void 0 : _u['user-agent'],
                            requestData: request.data,
                        };
                        _v.label = 1;
                    case 1:
                        _v.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, handler.apply(void 0, __spreadArray([context], args, false))];
                    case 2:
                        result = _v.sent();
                        // Log sucesso
                        return [4 /*yield*/, logAudit({
                                action: action,
                                category: category,
                                user_id: context.userId,
                                user_name: context.userName,
                                user_email: context.userEmail,
                                organization_id: context.organizationId,
                                resource_id: context.resourceId,
                                resource_type: context.resourceType,
                                details: {
                                    duration_ms: Date.now() - startTime,
                                    request_data: context.requestData,
                                },
                                ip_address: context.ipAddress,
                                user_agent: context.userAgent,
                                success: true,
                                metadata: context.metadata,
                            })];
                    case 3:
                        // Log sucesso
                        _v.sent();
                        return [2 /*return*/, result];
                    case 4:
                        error_2 = _v.sent();
                        // Log erro
                        return [4 /*yield*/, logAudit({
                                action: action,
                                category: category,
                                user_id: context.userId,
                                user_name: context.userName,
                                user_email: context.userEmail,
                                organization_id: context.organizationId,
                                resource_id: context.resourceId,
                                resource_type: context.resourceType,
                                details: {
                                    duration_ms: Date.now() - startTime,
                                    request_data: context.requestData,
                                    error_message: error_2.message,
                                },
                                ip_address: context.ipAddress,
                                user_agent: context.userAgent,
                                success: false,
                                error_message: error_2.message,
                                metadata: context.metadata,
                            })];
                    case 5:
                        // Log erro
                        _v.sent();
                        throw error_2;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
}
/**
 * Cria um contexto de auditoria a partir de uma requisição
 */
function createAuditContext(request, resourceType) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    return {
        userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_c = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.token) === null || _c === void 0 ? void 0 : _c.user_id) || 'anonymous',
        userName: ((_e = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.token) === null || _e === void 0 ? void 0 : _e.name) || ((_g = (_f = request.auth) === null || _f === void 0 ? void 0 : _f.token) === null || _g === void 0 ? void 0 : _g.email),
        userEmail: (_j = (_h = request.auth) === null || _h === void 0 ? void 0 : _h.token) === null || _j === void 0 ? void 0 : _j.email,
        organizationId: ((_l = (_k = request.auth) === null || _k === void 0 ? void 0 : _k.token) === null || _l === void 0 ? void 0 : _l.organization_id) || 'unknown',
        ipAddress: ((_o = (_m = request.rawRequest) === null || _m === void 0 ? void 0 : _m.headers) === null || _o === void 0 ? void 0 : _o['x-forwarded-for']) ||
            ((_q = (_p = request.rawRequest) === null || _p === void 0 ? void 0 : _p.headers) === null || _q === void 0 ? void 0 : _q['fastly-client-ip']) ||
            ((_s = (_r = request.rawRequest) === null || _r === void 0 ? void 0 : _r.socket) === null || _s === void 0 ? void 0 : _s.remoteAddress),
        userAgent: (_u = (_t = request.rawRequest) === null || _t === void 0 ? void 0 : _t.headers) === null || _u === void 0 ? void 0 : _u['user-agent'],
        requestData: request.data,
        resourceType: resourceType,
    };
}
/**
 * Busca logs de auditoria com filtros
 */
function getAuditLogs(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var pool, query, params, paramCount, countResult, total, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    query = "SELECT * FROM ".concat(AUDIT_LOG_TABLE, " WHERE 1=1");
                    params = [];
                    paramCount = 0;
                    if (filters.organization_id) {
                        paramCount++;
                        query += " AND organization_id = $".concat(paramCount);
                        params.push(filters.organization_id);
                    }
                    if (filters.user_id) {
                        paramCount++;
                        query += " AND user_id = $".concat(paramCount);
                        params.push(filters.user_id);
                    }
                    if (filters.action) {
                        paramCount++;
                        query += " AND action = $".concat(paramCount);
                        params.push(filters.action);
                    }
                    if (filters.category) {
                        paramCount++;
                        query += " AND category = $".concat(paramCount);
                        params.push(filters.category);
                    }
                    if (filters.resource_id) {
                        paramCount++;
                        query += " AND resource_id = $".concat(paramCount);
                        params.push(filters.resource_id);
                    }
                    if (filters.resource_type) {
                        paramCount++;
                        query += " AND resource_type = $".concat(paramCount);
                        params.push(filters.resource_type);
                    }
                    if (filters.start_date) {
                        paramCount++;
                        query += " AND created_at >= $".concat(paramCount);
                        params.push(filters.start_date);
                    }
                    if (filters.end_date) {
                        paramCount++;
                        query += " AND created_at <= $".concat(paramCount);
                        params.push(filters.end_date);
                    }
                    return [4 /*yield*/, pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params)];
                case 2:
                    countResult = _a.sent();
                    total = parseInt(countResult.rows[0].count);
                    // Ordenar e paginar
                    query += " ORDER BY created_at DESC";
                    if (filters.limit) {
                        paramCount++;
                        query += " LIMIT $".concat(paramCount);
                        params.push(filters.limit);
                    }
                    if (filters.offset) {
                        paramCount++;
                        query += " OFFSET $".concat(paramCount);
                        params.push(filters.offset);
                    }
                    return [4 /*yield*/, pool.query(query, params)];
                case 3:
                    result = _a.sent();
                    return [2 /*return*/, {
                            logs: result.rows,
                            total: total,
                        }];
                case 4:
                    error_3 = _a.sent();
                    logger_1.logger.error('[AuditLog] Error getting audit logs:', error_3);
                    return [2 /*return*/, { logs: [], total: 0 }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Limpa logs antigos de auditoria
 */
function cleanupAuditLogs() {
    return __awaiter(this, arguments, void 0, function (olderThanDays) {
        var pool, result, error_4;
        if (olderThanDays === void 0) { olderThanDays = 90; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pool.query("\n      DELETE FROM ".concat(AUDIT_LOG_TABLE, "\n      WHERE created_at < NOW() - INTERVAL '").concat(olderThanDays, " days'\n      RETURNING id\n    "))];
                case 2:
                    result = _a.sent();
                    logger_1.logger.info("[AuditLog] Cleaned up ".concat(result.rows.length, " old audit log entries"));
                    return [2 /*return*/, result.rows.length];
                case 3:
                    error_4 = _a.sent();
                    logger_1.logger.error('[AuditLog] Error cleaning up audit logs:', error_4);
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Exporta logs de auditoria para CSV/JSON
 */
function exportAuditLogs(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var logs, headers, csvRows, _loop_1, _i, logs_1, log;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAuditLogs(filters)];
                case 1:
                    logs = (_a.sent()).logs;
                    if (filters.format === 'json') {
                        return [2 /*return*/, JSON.stringify(logs, null, 2)];
                    }
                    headers = ['created_at', 'action', 'category', 'user_id', 'user_name', 'user_email',
                        'organization_id', 'resource_id', 'resource_type', 'success', 'error_message'];
                    csvRows = [headers.join(',')];
                    _loop_1 = function (log) {
                        var row = headers.map(function (h) {
                            var val = log[h];
                            if (val === null || val === undefined)
                                return '';
                            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                                return "\"".concat(val.replace(/"/g, '""'), "\"");
                            }
                            return String(val);
                        });
                        csvRows.push(row.join(','));
                    };
                    for (_i = 0, logs_1 = logs; _i < logs_1.length; _i++) {
                        log = logs_1[_i];
                        _loop_1(log);
                    }
                    return [2 /*return*/, csvRows.join('\n')];
            }
        });
    });
}
/**
 * Funções de conveniência para ações comuns
 */
exports.audit = {
    patientCreated: function (context, patientId, details) {
        return logAudit({
            action: AuditAction.PATIENT_CREATE,
            category: AuditCategory.PATIENT,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: patientId,
            resource_type: 'patient',
            details: details,
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    patientUpdated: function (context, patientId, changes) {
        return logAudit({
            action: AuditAction.PATIENT_UPDATE,
            category: AuditCategory.PATIENT,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: patientId,
            resource_type: 'patient',
            details: { changes: changes },
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    patientDeleted: function (context, patientId) {
        return logAudit({
            action: AuditAction.PATIENT_DELETE,
            category: AuditCategory.PATIENT,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: patientId,
            resource_type: 'patient',
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    appointmentCreated: function (context, appointmentId, details) {
        return logAudit({
            action: AuditAction.APPOINTMENT_CREATE,
            category: AuditCategory.APPOINTMENT,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: appointmentId,
            resource_type: 'appointment',
            details: details,
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    paymentCreated: function (context, paymentId, amount, details) {
        return logAudit({
            action: AuditAction.PAYMENT_CREATE,
            category: AuditCategory.FINANCIAL,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: paymentId,
            resource_type: 'payment',
            details: __assign({ amount: amount }, details),
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    permissionChanged: function (context, targetUserId, changes) {
        return logAudit({
            action: AuditAction.PERMISSION_CHANGE,
            category: AuditCategory.USER,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            resource_id: targetUserId,
            resource_type: 'user',
            details: { changes: changes },
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
    dataExported: function (context, exportType, recordCount) {
        return logAudit({
            action: AuditAction.EXPORT_DATA,
            category: AuditCategory.SYSTEM,
            user_id: context.userId,
            user_name: context.userName,
            user_email: context.userEmail,
            organization_id: context.organizationId,
            details: { export_type: exportType, record_count: recordCount },
            ip_address: context.ipAddress,
            user_agent: context.userAgent,
            success: true,
        });
    },
};
