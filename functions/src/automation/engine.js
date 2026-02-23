"use strict";
/**
 * Automation Engine - Cloud Functions
 * Motor de execução de automações no backend
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTimeEntryCreated = exports.scheduledAutomations = exports.triggerAutomationEvent = exports.testAutomationCall = exports.executeAutomationCall = void 0;
exports.executeAutomationEngine = executeAutomationEngine;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-functions/v2/firestore");
var scheduler_1 = require("firebase-functions/v2/scheduler");
var logger = require("firebase-functions/logger");
var admin = require("firebase-admin");
// ============================================================================
// Engine Core
// ============================================================================
/**
 * Executa uma automação
 */
function executeAutomationEngine(db, automation, eventData) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, results, conditionMet, _i, _a, action, result, error_1, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    startTime = Date.now();
                    results = [];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, , 13]);
                    // Verificar se a automação está ativa
                    if (!automation.is_active) {
                        throw new Error('Automação não está ativa');
                    }
                    if (!automation.logic) return [3 /*break*/, 3];
                    return [4 /*yield*/, evaluateCondition(db, automation.logic, eventData)];
                case 2:
                    conditionMet = _b.sent();
                    if (!conditionMet) {
                        return [2 /*return*/, {
                                id: "log-".concat(Date.now()),
                                automation_id: automation.id,
                                automation_name: automation.name,
                                status: 'skipped',
                                started_at: new Date(startTime),
                                completed_at: new Date(),
                                duration_ms: Date.now() - startTime,
                            }];
                    }
                    _b.label = 3;
                case 3:
                    _i = 0, _a = automation.actions.sort(function (a, b) { return a.order - b.order; });
                    _b.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 10];
                    action = _a[_i];
                    if (!(action.delay_seconds && action.delay_seconds > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, sleep(action.delay_seconds * 1000)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, executeAction(db, action, automation, eventData)];
                case 7:
                    result = _b.sent();
                    results.push({ action: action, result: result });
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _b.sent();
                    logger.error("Erro ao executar a\u00E7\u00E3o ".concat(action.type, ":"), error_1);
                    results.push({
                        action: action,
                        result: null,
                        error: error_1 instanceof Error ? error_1.message : String(error_1),
                    });
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 4];
                case 10: 
                // Atualizar contador de execuções
                return [4 /*yield*/, db
                        .collection('organizations')
                        .doc(automation.organization_id)
                        .collection('automations')
                        .doc(automation.id)
                        .update({
                        execution_count: (automation.execution_count || 0) + 1,
                        last_executed_at: new Date(),
                    })];
                case 11:
                    // Atualizar contador de execuções
                    _b.sent();
                    return [2 /*return*/, {
                            id: "log-".concat(Date.now()),
                            automation_id: automation.id,
                            automation_name: automation.name,
                            status: 'success',
                            started_at: new Date(startTime),
                            completed_at: new Date(),
                            duration_ms: Date.now() - startTime,
                            results: results,
                        }];
                case 12:
                    error_2 = _b.sent();
                    return [2 /*return*/, {
                            id: "log-".concat(Date.now()),
                            automation_id: automation.id,
                            automation_name: automation.name,
                            status: 'failed',
                            started_at: new Date(startTime),
                            completed_at: new Date(),
                            duration_ms: Date.now() - startTime,
                            results: results,
                            error: error_2 instanceof Error ? error_2.message : String(error_2),
                        }];
                case 13: return [2 /*return*/];
            }
        });
    });
}
/**
 * Avalia condição lógica
 */
function evaluateCondition(db, condition, eventData) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, child, _b, _c, child, field, operator, value, fieldValue;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!(condition.type === 'and')) return [3 /*break*/, 5];
                    _i = 0, _a = condition.children || [];
                    _d.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    child = _a[_i];
                    return [4 /*yield*/, evaluateCondition(db, child, eventData)];
                case 2:
                    if (!(_d.sent())) {
                        return [2 /*return*/, false];
                    }
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, true];
                case 5:
                    if (!(condition.type === 'or')) return [3 /*break*/, 10];
                    _b = 0, _c = condition.children || [];
                    _d.label = 6;
                case 6:
                    if (!(_b < _c.length)) return [3 /*break*/, 9];
                    child = _c[_b];
                    return [4 /*yield*/, evaluateCondition(db, child, eventData)];
                case 7:
                    if (_d.sent()) {
                        return [2 /*return*/, true];
                    }
                    _d.label = 8;
                case 8:
                    _b++;
                    return [3 /*break*/, 6];
                case 9: return [2 /*return*/, false];
                case 10:
                    if (condition.type === 'field_comparison') {
                        field = condition.field, operator = condition.operator, value = condition.value;
                        fieldValue = getNestedValue(eventData, field);
                        switch (operator) {
                            case 'equals':
                                return [2 /*return*/, fieldValue === value];
                            case 'not_equals':
                                return [2 /*return*/, fieldValue !== value];
                            case 'contains':
                                return [2 /*return*/, Array.isArray(fieldValue) ? fieldValue.includes(value) : String(fieldValue).includes(value)];
                            case 'greater_than':
                                return [2 /*return*/, Number(fieldValue) > Number(value)];
                            case 'less_than':
                                return [2 /*return*/, Number(fieldValue) < Number(value)];
                            default:
                                return [2 /*return*/, false];
                        }
                    }
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * Executa uma ação individual
 */
function executeAction(db, action, automation, eventData) {
    return __awaiter(this, void 0, void 0, function () {
        var config, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    config = substituteVariables(action.config, {
                        automation: automation,
                        event: eventData,
                    });
                    _a = action.type;
                    switch (_a) {
                        case 'send_notification': return [3 /*break*/, 1];
                        case 'send_email': return [3 /*break*/, 3];
                        case 'send_whatsapp': return [3 /*break*/, 5];
                        case 'create_document': return [3 /*break*/, 7];
                        case 'update_document': return [3 /*break*/, 9];
                        case 'call_webhook': return [3 /*break*/, 11];
                        case 'delay': return [3 /*break*/, 13];
                    }
                    return [3 /*break*/, 14];
                case 1: return [4 /*yield*/, sendNotification(db, config)];
                case 2: return [2 /*return*/, _b.sent()];
                case 3: return [4 /*yield*/, sendEmail(db, config)];
                case 4: return [2 /*return*/, _b.sent()];
                case 5: return [4 /*yield*/, sendWhatsApp(db, config)];
                case 6: return [2 /*return*/, _b.sent()];
                case 7: return [4 /*yield*/, createDocument(db, automation.organization_id, config)];
                case 8: return [2 /*return*/, _b.sent()];
                case 9: return [4 /*yield*/, updateDocument(db, automation.organization_id, config)];
                case 10: return [2 /*return*/, _b.sent()];
                case 11: return [4 /*yield*/, callWebhook(config)];
                case 12: return [2 /*return*/, _b.sent()];
                case 13: 
                // Delay já é tratado antes da execução
                return [2 /*return*/, { delayed: true }];
                case 14: throw new Error("Tipo de a\u00E7\u00E3o n\u00E3o suportado: ".concat(action.type));
            }
        });
    });
}
// ============================================================================
// Action Implementations
// ============================================================================
function sendNotification(db, config) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: Implementar envio de notificação push
            logger.info('Enviando notificação:', config);
            return [2 /*return*/, { sent: true, type: 'notification', config: config }];
        });
    });
}
function sendEmail(db, config) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: Implementar envio de email (usar SendGrid, Mailgun, etc.)
            logger.info('Enviando email:', config);
            return [2 /*return*/, { sent: true, type: 'email', config: config }];
        });
    });
}
function sendWhatsApp(db, config) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // TODO: Implementar envio de WhatsApp
            logger.info('Enviando WhatsApp:', config);
            return [2 /*return*/, { sent: true, type: 'whatsapp', config: config }];
        });
    });
}
function createDocument(db, organizationId, config) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, data, docRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collection = config.collection, data = config.data;
                    return [4 /*yield*/, db
                            .collection('organizations')
                            .doc(organizationId)
                            .collection(collection)
                            .add(__assign(__assign({}, data), { created_at: new Date(), created_by_automation: true }))];
                case 1:
                    docRef = _a.sent();
                    return [2 /*return*/, { created: true, collection: collection, id: docRef.id }];
            }
        });
    });
}
function updateDocument(db, organizationId, config) {
    return __awaiter(this, void 0, void 0, function () {
        var collection, documentId, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collection = config.collection, documentId = config.documentId, data = config.data;
                    return [4 /*yield*/, db
                            .collection('organizations')
                            .doc(organizationId)
                            .collection(collection)
                            .doc(documentId)
                            .update(__assign(__assign({}, data), { updated_at: new Date(), updated_by_automation: true }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, { updated: true, collection: collection, documentId: documentId }];
            }
        });
    });
}
function callWebhook(config) {
    return __awaiter(this, void 0, void 0, function () {
        var url, _a, method, headers, body, response;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = config.url, _a = config.method, method = _a === void 0 ? 'POST' : _a, headers = config.headers, body = config.body;
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: __assign({ 'Content-Type': 'application/json' }, headers),
                            body: JSON.stringify(body),
                        })];
                case 1:
                    response = _b.sent();
                    if (!response.ok) {
                        throw new Error("Webhook falhou: ".concat(response.status, " ").concat(response.statusText));
                    }
                    return [4 /*yield*/, response.json()];
                case 2: return [2 /*return*/, _b.sent()];
            }
        });
    });
}
// ============================================================================
// Helpers
// ============================================================================
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function substituteVariables(template, context) {
    var result = {};
    for (var _i = 0, _a = Object.entries(template); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === 'string') {
            // Substituir {{variable.path}} com valores do contexto
            result[key] = value.replace(/\{\{([^}]+)\}\}/g, function (_match, path) {
                return String(getNestedValue(context, path) || '');
            });
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = substituteVariables(value, context);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function getNestedValue(obj, path) {
    if (!obj)
        return undefined;
    var keys = path.split('.');
    var value = obj;
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        }
        else {
            return undefined;
        }
    }
    return value;
}
// ============================================================================
// Cloud Functions
// ============================================================================
/**
 * HTTP Callable: Executar automação manualmente
 */
exports.executeAutomationCall = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, automationId, testData, db, automationSnap, automation, log;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, organizationId = _a.organizationId, automationId = _a.automationId, testData = _a.testData;
                if (!organizationId || !automationId) {
                    throw new https_1.HttpsError('invalid-argument', 'organizationId e automationId são obrigatórios');
                }
                db = request.data._db || getFirestore();
                return [4 /*yield*/, db
                        .collection('organizations')
                        .doc(organizationId)
                        .collection('automations')
                        .doc(automationId)
                        .get()];
            case 1:
                automationSnap = _b.sent();
                if (!automationSnap.exists) {
                    throw new https_1.HttpsError('not-found', 'Automação não encontrada');
                }
                automation = __assign({ id: automationSnap.id }, automationSnap.data());
                return [4 /*yield*/, executeAutomationEngine(db, automation, testData)];
            case 2:
                log = _b.sent();
                // Salvar log
                return [4 /*yield*/, db
                        .collection('organizations')
                        .doc(organizationId)
                        .collection('automation_logs')
                        .add(log)];
            case 3:
                // Salvar log
                _b.sent();
                return [2 /*return*/, { success: log.status === 'success', log: log }];
        }
    });
}); });
/**
 * HTTP Callable: Testar automação (dry run)
 */
exports.testAutomationCall = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, automation, testData, results, _i, _b, action, result, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, automation = _a.automation, testData = _a.testData;
                if (!automation) {
                    throw new https_1.HttpsError('invalid-argument', 'automation é obrigatório');
                }
                results = [];
                _i = 0, _b = (automation.actions || []);
                _c.label = 1;
            case 1:
                if (!(_i < _b.length)) return [3 /*break*/, 6];
                action = _b[_i];
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                return [4 /*yield*/, executeAction(request.data._db || getFirestore(), action, automation, testData)];
            case 3:
                result = _c.sent();
                results.push({ action: action, result: result });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _c.sent();
                results.push({
                    action: action,
                    result: null,
                    error: error_3 instanceof Error ? error_3.message : String(error_3),
                });
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6: return [2 /*return*/, {
                    success: results.every(function (r) { return !r.error; }),
                    results: results,
                }];
        }
    });
}); });
/**
 * HTTP: Trigger de evento (webhook público)
 */
exports.triggerAutomationEvent = (0, https_1.onRequest)(function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, organizationId, eventType, eventData, db, automationsSnap, executions, results;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.body, organizationId = _a.organizationId, eventType = _a.eventType, eventData = _a.eventData;
                if (!organizationId || !eventType) {
                    response.status(400).json({ error: 'organizationId e eventType são obrigatórios' });
                    return [2 /*return*/];
                }
                db = getFirestore();
                return [4 /*yield*/, db
                        .collection('organizations')
                        .doc(organizationId)
                        .collection('automations')
                        .where('is_active', '==', true)
                        .where('trigger.type', '==', 'event')
                        .where('trigger.event_type', '==', eventType)
                        .get()];
            case 1:
                automationsSnap = _b.sent();
                executions = [];
                automationsSnap.forEach(function (doc) {
                    var automation = __assign({ id: doc.id }, doc.data());
                    executions.push(executeAutomationEngine(db, automation, eventData));
                });
                return [4 /*yield*/, Promise.allSettled(executions)];
            case 2:
                results = _b.sent();
                response.json({
                    triggered: results.length,
                    completed: results.filter(function (r) { return r.status === 'fulfilled'; }).length,
                    failed: results.filter(function (r) { return r.status === 'rejected'; }).length,
                });
                return [2 /*return*/];
        }
    });
}); });
/**
 * Scheduled: Executar automações agendadas
 * Roda a cada hora
 */
exports.scheduledAutomations = (0, scheduler_1.onSchedule)('0 * * * *', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, now, automationsSnap, executions, _i, _a, doc, automation, results;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                db = getFirestore();
                now = new Date();
                return [4 /*yield*/, db
                        .collectionGroup('automations')
                        .where('is_active', '==', true)
                        .where('trigger.type', '==', 'schedule')
                        .get()];
            case 1:
                automationsSnap = _b.sent();
                executions = [];
                for (_i = 0, _a = automationsSnap.docs; _i < _a.length; _i++) {
                    doc = _a[_i];
                    automation = __assign({ id: doc.id }, doc.data());
                    // Verificar se deve executar agora (lógica cron simplificada)
                    if (shouldExecuteSchedule(automation.trigger.schedule || '', now)) {
                        executions.push(executeAutomationEngine(db, automation));
                    }
                }
                return [4 /*yield*/, Promise.allSettled(executions)];
            case 2:
                results = _b.sent();
                logger.info("Scheduled automations executed: ".concat(results.length, " total, ") +
                    "".concat(results.filter(function (r) { return r.status === 'fulfilled'; }).length, " completed"));
                return [2 /*return*/];
        }
    });
}); });
/**
 * Verifica se uma automação com schedule deve executar agora
 */
function shouldExecuteSchedule(schedule, now) {
    // Implementação simplificada de verificação cron
    // Para produção, usar biblioteca como node-cron
    var hour = now.getHours();
    var minute = now.getMinutes();
    var dayOfWeek = now.getDay();
    // Exemplos simples:
    // "0 9 * * *" = 9:00 todos os dias
    // "0 9 * * 1" = 9:00 apenas segundas
    // "*/30 * * * *" = a cada 30 minutos
    if (schedule === '0 * * * *') {
        return minute === 0; // No início de cada hora
    }
    if (schedule === '0 9 * * *') {
        return hour === 9 && minute === 0;
    }
    if (schedule === '0 9 * * 1') {
        return hour === 9 && minute === 0 && dayOfWeek === 1;
    }
    return false;
}
// ============================================================================
// Firestore Trigger
// ============================================================================
/**
 * Trigger automático quando um documento é criado/atualizado
 */
exports.onTimeEntryCreated = (0, firestore_1.onDocumentWritten)('organizations/{organizationId}/time_entries/{entryId}', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, wasCreated, entry, automationsSnap, executions;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = getFirestore();
                // Se event.data for indefinido, ignora
                if (!event.data)
                    return [2 /*return*/];
                wasCreated = !event.data.before.exists && event.data.after.exists;
                if (!wasCreated) {
                    return [2 /*return*/];
                }
                entry = event.data.after.data();
                return [4 /*yield*/, db
                        .collection('organizations')
                        .doc(event.params.organizationId)
                        .collection('automations')
                        .where('is_active', '==', true)
                        .where('trigger.type', '==', 'event')
                        .where('trigger.event_type', '==', 'time_entry.created')
                        .get()];
            case 1:
                automationsSnap = _a.sent();
                executions = [];
                automationsSnap.forEach(function (doc) {
                    var automation = __assign({ id: doc.id }, doc.data());
                    executions.push(executeAutomationEngine(db, automation, { entry: entry }));
                });
                return [4 /*yield*/, Promise.allSettled(executions)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
// ============================================================================
// Admin Helper
// ============================================================================
function getFirestore() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
