"use strict";
/**
 * Webhook Management Functions
 * Functions for managing webhook subscriptions and testing
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookEventTypes = exports.getWebhookEventTypesHandler = exports.testWebhook = exports.testWebhookHandler = exports.listWebhooks = exports.listWebhooksHandler = exports.unsubscribeWebhook = exports.unsubscribeWebhookHandler = exports.subscribeWebhook = exports.subscribeWebhookHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var webhooks_1 = require("../lib/webhooks");
var db = admin.firestore();
var subscribeWebhookHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, url, events, secret, organizationId, headers, retryConfig, validEvents, _i, events_1, event_1, subscriptionId, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, url = _a.url, events = _a.events, secret = _a.secret, organizationId = _a.organizationId, headers = _a.headers, retryConfig = _a.retryConfig;
                // Validate input
                if (!url || !events || events.length === 0 || !organizationId) {
                    throw new https_1.HttpsError('invalid-argument', 'URL, events array, and organizationId are required');
                }
                // Validate URL format
                try {
                    new URL(url);
                }
                catch (_d) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid URL format');
                }
                validEvents = Object.values(webhooks_1.WebhookEventType);
                for (_i = 0, events_1 = events; _i < events_1.length; _i++) {
                    event_1 = events_1[_i];
                    if (!validEvents.includes(event_1)) {
                        throw new https_1.HttpsError('invalid-argument', "Invalid event type: ".concat(event_1));
                    }
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, webhooks_1.subscribeToWebhook)(db, {
                        url: url,
                        events: events,
                        secret: secret,
                        organizationId: organizationId,
                        active: true,
                        headers: headers,
                        retryConfig: retryConfig,
                    })];
            case 2:
                subscriptionId = _c.sent();
                return [2 /*return*/, { success: true, subscriptionId: subscriptionId }];
            case 3:
                error_1 = _c.sent();
                throw new https_1.HttpsError('internal', "Failed to create subscription: ".concat(error_1.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.subscribeWebhookHandler = subscribeWebhookHandler;
exports.subscribeWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.subscribeWebhookHandler);
/**
 * Unsubscribe from webhook events
 * Deletes an existing webhook subscription
 */
var unsubscribeWebhookHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, subscriptionId, organizationId, deleted, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, subscriptionId = _a.subscriptionId, organizationId = _a.organizationId;
                if (!subscriptionId || !organizationId) {
                    throw new https_1.HttpsError('invalid-argument', 'subscriptionId and organizationId are required');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, webhooks_1.unsubscribeFromWebhook)(db, subscriptionId, organizationId)];
            case 2:
                deleted = _c.sent();
                if (!deleted) {
                    throw new https_1.HttpsError('not-found', 'Webhook subscription not found');
                }
                return [2 /*return*/, { success: true }];
            case 3:
                error_2 = _c.sent();
                if (error_2.code === 'not-found') {
                    throw error_2;
                }
                throw new https_1.HttpsError('internal', "Failed to delete subscription: ".concat(error_2.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.unsubscribeWebhookHandler = unsubscribeWebhookHandler;
exports.unsubscribeWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.unsubscribeWebhookHandler);
/**
 * List webhook subscriptions
 * Returns all webhook subscriptions for an organization
 */
var listWebhooksHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, organizationId, snapshot, subscriptions, error_3;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data;
                userId = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                organizationId = data.organizationId;
                if (!organizationId) {
                    throw new https_1.HttpsError('invalid-argument', 'organizationId is required');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db
                        .collection('webhook_subscriptions')
                        .where('organizationId', '==', organizationId)
                        .get()];
            case 2:
                snapshot = _b.sent();
                subscriptions = snapshot.docs.map(function (doc) {
                    var data = doc.data();
                    // Don't expose the secret
                    var secret = data.secret, safeData = __rest(data, ["secret"]);
                    return __assign({ id: doc.id }, safeData);
                });
                return [2 /*return*/, { subscriptions: subscriptions }];
            case 3:
                error_3 = _b.sent();
                throw new https_1.HttpsError('internal', "Failed to list subscriptions: ".concat(error_3.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.listWebhooksHandler = listWebhooksHandler;
exports.listWebhooks = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.listWebhooksHandler);
/**
 * Test webhook delivery
 * Sends a test event to a webhook subscription
 */
var testWebhookHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, subscriptionId, organizationId, subscriptionDoc, subscription, testEvent, deliverWebhook, result, error_4;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                data = request.data;
                userId = (_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, subscriptionId = _a.subscriptionId, organizationId = _a.organizationId;
                if (!subscriptionId || !organizationId) {
                    throw new https_1.HttpsError('invalid-argument', 'subscriptionId and organizationId are required');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, db
                        .collection('webhook_subscriptions')
                        .doc(subscriptionId)
                        .get()];
            case 2:
                subscriptionDoc = _c.sent();
                if (!subscriptionDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Webhook subscription not found');
                }
                subscription = subscriptionDoc.data();
                testEvent = (0, webhooks_1.createWebhookEvent)('test.event', {
                    test: true,
                    message: 'This is a test webhook event from FisioFlow',
                    timestamp: new Date().toISOString(),
                }, organizationId, userId);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('../lib/webhooks'); })];
            case 3:
                deliverWebhook = (_c.sent()).deliverWebhook;
                return [4 /*yield*/, deliverWebhook(subscription, testEvent)];
            case 4:
                result = _c.sent();
                return [2 /*return*/, {
                        success: result.success,
                        statusCode: result.statusCode,
                        error: result.error,
                        duration: result.duration,
                    }];
            case 5:
                error_4 = _c.sent();
                if (error_4.code === 'not-found') {
                    throw error_4;
                }
                throw new https_1.HttpsError('internal', "Failed to test webhook: ".concat(error_4.message));
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.testWebhookHandler = testWebhookHandler;
exports.testWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    timeoutSeconds: 60,
}, exports.testWebhookHandler);
/**
 * Webhook event types list
 * Returns available event types for subscription
 */
var getWebhookEventTypesHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventTypes, grouped;
    return __generator(this, function (_a) {
        // CORS handling
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return [2 /*return*/];
        }
        if (req.method !== 'GET') {
            res.status(405).json({ error: 'Method not allowed' });
            return [2 /*return*/];
        }
        eventTypes = Object.values(webhooks_1.WebhookEventType).map(function (type) { return ({
            type: type,
            category: type.split('.')[0],
            description: getEventTypeDescription(type),
        }); });
        grouped = eventTypes.reduce(function (acc, eventType) {
            if (!acc[eventType.category]) {
                acc[eventType.category] = [];
            }
            acc[eventType.category].push(eventType);
            return acc;
        }, {});
        res.json({
            eventTypes: grouped,
        });
        return [2 /*return*/];
    });
}); };
exports.getWebhookEventTypesHandler = getWebhookEventTypesHandler;
exports.getWebhookEventTypes = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.getWebhookEventTypesHandler);
function getEventTypeDescription(type) {
    var _a;
    var descriptions = (_a = {},
        _a[webhooks_1.WebhookEventType.PATIENT_CREATED] = 'Triggered when a new patient is registered',
        _a[webhooks_1.WebhookEventType.PATIENT_UPDATED] = 'Triggered when patient information is updated',
        _a[webhooks_1.WebhookEventType.PATIENT_DELETED] = 'Triggered when a patient is deleted',
        _a[webhooks_1.WebhookEventType.APPOINTMENT_CREATED] = 'Triggered when an appointment is scheduled',
        _a[webhooks_1.WebhookEventType.APPOINTMENT_UPDATED] = 'Triggered when an appointment is modified',
        _a[webhooks_1.WebhookEventType.APPOINTMENT_CANCELLED] = 'Triggered when an appointment is cancelled',
        _a[webhooks_1.WebhookEventType.APPOINTMENT_COMPLETED] = 'Triggered when an appointment is completed',
        _a[webhooks_1.WebhookEventType.TREATMENT_STARTED] = 'Triggered when a treatment plan is started',
        _a[webhooks_1.WebhookEventType.TREATMENT_COMPLETED] = 'Triggered when a treatment plan is completed',
        _a[webhooks_1.WebhookEventType.SESSION_COMPLETED] = 'Triggered when a treatment session is completed',
        _a[webhooks_1.WebhookEventType.ASSESSMENT_CREATED] = 'Triggered when an assessment is created',
        _a[webhooks_1.WebhookEventType.ASSESSMENT_COMPLETED] = 'Triggered when an assessment is completed',
        _a[webhooks_1.WebhookEventType.PAYMENT_RECEIVED] = 'Triggered when a payment is received',
        _a[webhooks_1.WebhookEventType.PAYMENT_FAILED] = 'Triggered when a payment fails',
        _a[webhooks_1.WebhookEventType.EXERCISE_ASSIGNED] = 'Triggered when exercises are assigned to a patient',
        _a[webhooks_1.WebhookEventType.EXERCISE_COMPLETED] = 'Triggered when patient completes exercises',
        _a);
    return descriptions[type] || 'Event description not available';
}
