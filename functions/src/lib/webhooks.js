"use strict";
/**
 * Webhook Management System
 * Manages external webhook subscriptions and deliveries
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
exports.webhookHelpers = exports.WebhookEventType = void 0;
exports.generateWebhookSignature = generateWebhookSignature;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.subscribeToWebhook = subscribeToWebhook;
exports.unsubscribeFromWebhook = unsubscribeFromWebhook;
exports.getActiveSubscriptions = getActiveSubscriptions;
exports.deliverWebhook = deliverWebhook;
exports.triggerWebhookEvent = triggerWebhookEvent;
exports.createWebhookEvent = createWebhookEvent;
var logger_1 = require("./logger");
var crypto = require("crypto");
var logger = (0, logger_1.getLogger)('webhooks');
/**
 * Webhook event types
 */
var WebhookEventType;
(function (WebhookEventType) {
    // Patient events
    WebhookEventType["PATIENT_CREATED"] = "patient.created";
    WebhookEventType["PATIENT_UPDATED"] = "patient.updated";
    WebhookEventType["PATIENT_DELETED"] = "patient.deleted";
    // Appointment events
    WebhookEventType["APPOINTMENT_CREATED"] = "appointment.created";
    WebhookEventType["APPOINTMENT_UPDATED"] = "appointment.updated";
    WebhookEventType["APPOINTMENT_CANCELLED"] = "appointment.cancelled";
    WebhookEventType["APPOINTMENT_COMPLETED"] = "appointment.completed";
    // Treatment events
    WebhookEventType["TREATMENT_STARTED"] = "treatment.started";
    WebhookEventType["TREATMENT_COMPLETED"] = "treatment.completed";
    WebhookEventType["SESSION_COMPLETED"] = "session.completed";
    // Assessment events
    WebhookEventType["ASSESSMENT_CREATED"] = "assessment.created";
    WebhookEventType["ASSESSMENT_COMPLETED"] = "assessment.completed";
    // Payment events
    WebhookEventType["PAYMENT_RECEIVED"] = "payment.received";
    WebhookEventType["PAYMENT_FAILED"] = "payment.failed";
    // Exercise events
    WebhookEventType["EXERCISE_ASSIGNED"] = "exercise.assigned";
    WebhookEventType["EXERCISE_COMPLETED"] = "exercise.completed";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
/**
 * Collection name for webhook subscriptions
 */
var WEBHOOKS_COLLECTION = 'webhook_subscriptions';
var WEBHOOK_DELIVERY_LOGS = 'webhook_delivery_logs';
/**
 * Generates a signature for webhook payload
 */
function generateWebhookSignature(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
}
/**
 * Verifies webhook signature with proper validation
 */
function verifyWebhookSignature(payload, signature, secret) {
    // Validate signature format
    if (!signature || typeof signature !== 'string') {
        logger.warn('Invalid signature type or empty signature');
        return false;
    }
    if (!signature.startsWith('sha256=')) {
        logger.warn('Invalid signature format (missing sha256= prefix)');
        return false;
    }
    var signatureWithoutPrefix = signature.substring(7); // Remove "sha256="
    if (signatureWithoutPrefix.length !== 64) {
        logger.warn('Invalid signature length (not 64 hex chars)');
        return false;
    }
    // Check for hex characters only
    if (!/^[0-9a-f]{64}$/i.test(signatureWithoutPrefix)) {
        logger.warn('Invalid signature (not hex)');
        return false;
    }
    var expectedSignature = generateWebhookSignature(payload, secret);
    // Use constant-time comparison with proper format
    try {
        var expectedBuffer = Buffer.from(expectedSignature, 'hex');
        var providedBuffer = Buffer.from(signatureWithoutPrefix, 'hex');
        // Ensure both buffers are the same length
        if (expectedBuffer.length !== providedBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    }
    catch (error) {
        logger.error('Signature verification error', { error: error });
        return false;
    }
}
/**
 * Subscribes to webhook events
 */
function subscribeToWebhook(db, subscription) {
    return __awaiter(this, void 0, void 0, function () {
        var subscriptionRef, subscriptionId, secret, now, newSubscription;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    subscriptionRef = db.collection(WEBHOOKS_COLLECTION).doc();
                    subscriptionId = subscriptionRef.id;
                    secret = subscription.secret || crypto.randomBytes(32).toString('hex');
                    now = new Date();
                    newSubscription = __assign(__assign({}, subscription), { id: subscriptionId, secret: secret, active: subscription.active !== false, createdAt: now, updatedAt: now, failureCount: 0 });
                    return [4 /*yield*/, subscriptionRef.set(newSubscription)];
                case 1:
                    _a.sent();
                    logger.info('Webhook subscription created', {
                        subscriptionId: subscriptionId,
                        url: subscription.url,
                        events: subscription.events,
                    });
                    return [2 /*return*/, subscriptionId];
            }
        });
    });
}
/**
 * Unsubscribes from webhook events
 */
function unsubscribeFromWebhook(db, subscriptionId, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var subscriptionRef, snapshot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    subscriptionRef = db
                        .collection(WEBHOOKS_COLLECTION)
                        .where('id', '==', subscriptionId)
                        .where('organizationId', '==', organizationId)
                        .limit(1);
                    return [4 /*yield*/, subscriptionRef.get()];
                case 1:
                    snapshot = _a.sent();
                    if (snapshot.empty) {
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, snapshot.docs[0].ref.delete()];
                case 2:
                    _a.sent();
                    logger.info('Webhook subscription deleted', { subscriptionId: subscriptionId });
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * Gets active webhook subscriptions for an event type
 */
function getActiveSubscriptions(db, eventType, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var snapshot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db
                        .collection(WEBHOOKS_COLLECTION)
                        .where('organizationId', '==', organizationId)
                        .where('active', '==', true)
                        .where('events', 'array-contains', eventType)
                        .get()];
                case 1:
                    snapshot = _a.sent();
                    return [2 /*return*/, snapshot.docs.map(function (doc) { return doc.data(); })];
            }
        });
    });
}
/**
 * Delivers webhook event to a single subscription
 */
function deliverWebhook(subscription, event) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, payload, signature, headers, maxRetries, retryDelay, lastError, statusCode, _loop_1, attempt, state_1, duration, error_1, duration, errorMessage;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    startTime = Date.now();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    payload = JSON.stringify(event);
                    signature = generateWebhookSignature(payload, subscription.secret || '');
                    headers = __assign({ 'Content-Type': 'application/json', 'X-FisioFlow-Signature': signature, 'X-FisioFlow-Event': event.type, 'X-FisioFlow-Delivery-Id': crypto.randomUUID(), 'User-Agent': 'FisioFlow-Webhooks/1.0' }, subscription.headers);
                    maxRetries = ((_a = subscription.retryConfig) === null || _a === void 0 ? void 0 : _a.maxRetries) || 3;
                    retryDelay = ((_b = subscription.retryConfig) === null || _b === void 0 ? void 0 : _b.retryDelay) || 1000;
                    lastError = null;
                    statusCode = 0;
                    _loop_1 = function (attempt) {
                        var response, duration_1, delay_1, error_2, delay_2;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    _d.trys.push([0, 4, , 7]);
                                    return [4 /*yield*/, fetch(subscription.url, {
                                            method: 'POST',
                                            headers: headers,
                                            body: payload,
                                            signal: AbortSignal.timeout(30000), // 30 second timeout
                                        })];
                                case 1:
                                    response = _d.sent();
                                    statusCode = response.status;
                                    // Success if status is 2xx
                                    if (response.ok || statusCode === 202) {
                                        duration_1 = Date.now() - startTime;
                                        logger.info('Webhook delivered successfully', {
                                            subscriptionId: subscription.id,
                                            eventType: event.type,
                                            statusCode: statusCode,
                                            duration: duration_1,
                                        });
                                        return [2 /*return*/, { value: {
                                                    subscriptionId: subscription.id,
                                                    success: true,
                                                    statusCode: statusCode,
                                                    duration: duration_1,
                                                } }];
                                    }
                                    if (!(attempt < maxRetries && (statusCode >= 500 || statusCode === 429))) return [3 /*break*/, 3];
                                    delay_1 = retryDelay * Math.pow(2, attempt);
                                    logger.warn('Webhook delivery failed, retrying', {
                                        subscriptionId: subscription.id,
                                        attempt: attempt + 1,
                                        maxRetries: maxRetries + 1,
                                        statusCode: statusCode,
                                        delay: delay_1,
                                    });
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 2:
                                    _d.sent();
                                    return [2 /*return*/, "continue"];
                                case 3:
                                    lastError = new Error("HTTP ".concat(statusCode, ": ").concat(response.statusText));
                                    return [2 /*return*/, "break"];
                                case 4:
                                    error_2 = _d.sent();
                                    lastError = error_2;
                                    if (!(attempt < maxRetries)) return [3 /*break*/, 6];
                                    delay_2 = retryDelay * Math.pow(2, attempt);
                                    logger.warn('Webhook delivery network error, retrying', {
                                        subscriptionId: subscription.id,
                                        attempt: attempt + 1,
                                        maxRetries: maxRetries + 1,
                                        error: error_2.message,
                                        delay: delay_2,
                                    });
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_2); })];
                                case 5:
                                    _d.sent();
                                    return [2 /*return*/, "continue"];
                                case 6: return [2 /*return*/, "break"];
                                case 7: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _c.label = 2;
                case 2:
                    if (!(attempt <= maxRetries)) return [3 /*break*/, 5];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 3:
                    state_1 = _c.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    if (state_1 === "break")
                        return [3 /*break*/, 5];
                    _c.label = 4;
                case 4:
                    attempt++;
                    return [3 /*break*/, 2];
                case 5:
                    duration = Date.now() - startTime;
                    logger.error('Webhook delivery failed after retries', {
                        subscriptionId: subscription.id,
                        eventType: event.type,
                        error: lastError === null || lastError === void 0 ? void 0 : lastError.message,
                        duration: duration,
                    });
                    return [2 /*return*/, {
                            subscriptionId: subscription.id,
                            success: false,
                            statusCode: statusCode,
                            error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unknown error',
                            duration: duration,
                        }];
                case 6:
                    error_1 = _c.sent();
                    duration = Date.now() - startTime;
                    errorMessage = error_1.message;
                    logger.error('Webhook delivery error', {
                        subscriptionId: subscription.id,
                        error: errorMessage,
                        duration: duration,
                    });
                    return [2 /*return*/, {
                            subscriptionId: subscription.id,
                            success: false,
                            error: errorMessage,
                            duration: duration,
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Triggers webhook event to all active subscriptions
 */
function triggerWebhookEvent(db, event) {
    return __awaiter(this, void 0, void 0, function () {
        var subscriptions, results, _i, results_1, result, deliveryResult, subscriptionRef, logEntry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getActiveSubscriptions(db, event.type, event.organizationId)];
                case 1:
                    subscriptions = _a.sent();
                    if (subscriptions.length === 0) {
                        logger.debug('No active webhook subscriptions for event', {
                            eventType: event.type,
                            organizationId: event.organizationId,
                        });
                        return [2 /*return*/, []];
                    }
                    logger.info('Triggering webhook event', {
                        eventType: event.type,
                        organizationId: event.organizationId,
                        subscriptionCount: subscriptions.length,
                    });
                    return [4 /*yield*/, Promise.allSettled(subscriptions.map(function (subscription) { return deliverWebhook(subscription, event); }))];
                case 2:
                    results = _a.sent();
                    _i = 0, results_1 = results;
                    _a.label = 3;
                case 3:
                    if (!(_i < results_1.length)) return [3 /*break*/, 8];
                    result = results_1[_i];
                    if (!(result.status === 'fulfilled')) return [3 /*break*/, 7];
                    deliveryResult = result.value;
                    subscriptionRef = db.collection(WEBHOOKS_COLLECTION).doc(deliveryResult.subscriptionId);
                    if (!deliveryResult.success) return [3 /*break*/, 5];
                    return [4 /*yield*/, subscriptionRef.update({
                            failureCount: 0,
                            lastSuccessAt: new Date(),
                            lastTriggeredAt: new Date(),
                        })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, subscriptionRef.update({
                        failureCount: admin.firestore.FieldValue.increment(1),
                        lastTriggeredAt: new Date(),
                    })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    logEntry = {
                        eventId: event.id,
                        eventType: event.type,
                        organizationId: event.organizationId,
                        timestamp: new Date(),
                        results: results.map(function (r) {
                            return r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' };
                        }),
                    };
                    return [4 /*yield*/, db.collection(WEBHOOK_DELIVERY_LOGS).add(logEntry)];
                case 9:
                    _a.sent();
                    return [2 /*return*/, results.map(function (r) {
                            return r.status === 'fulfilled' ? r.value : { subscriptionId: 'unknown', success: false, error: 'Promise rejected', duration: 0 };
                        })];
            }
        });
    });
}
/**
 * Creates a webhook event object
 */
function createWebhookEvent(type, data, organizationId, userId) {
    return {
        id: crypto.randomUUID(),
        type: type,
        data: data,
        timestamp: new Date(),
        organizationId: organizationId,
        userId: userId,
    };
}
/**
 * Helper functions for common webhook triggers
 */
exports.webhookHelpers = {
    patientCreated: function (db, patientData, organizationId, userId) {
        var event = createWebhookEvent(WebhookEventType.PATIENT_CREATED, { patient: patientData }, organizationId, userId);
        return triggerWebhookEvent(db, event);
    },
    appointmentCreated: function (db, appointmentData, organizationId, userId) {
        var event = createWebhookEvent(WebhookEventType.APPOINTMENT_CREATED, { appointment: appointmentData }, organizationId, userId);
        return triggerWebhookEvent(db, event);
    },
    appointmentCompleted: function (db, appointmentData, organizationId) {
        var event = createWebhookEvent(WebhookEventType.APPOINTMENT_COMPLETED, { appointment: appointmentData }, organizationId);
        return triggerWebhookEvent(db, event);
    },
    paymentReceived: function (db, paymentData, organizationId) {
        var event = createWebhookEvent(WebhookEventType.PAYMENT_RECEIVED, { payment: paymentData }, organizationId);
        return triggerWebhookEvent(db, event);
    },
    sessionCompleted: function (db, sessionData, organizationId, userId) {
        var event = createWebhookEvent(WebhookEventType.SESSION_COMPLETED, { session: sessionData }, organizationId, userId);
        return triggerWebhookEvent(db, event);
    },
};
var admin = require("firebase-admin");
