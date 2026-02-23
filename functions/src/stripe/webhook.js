"use strict";
/**
 * Stripe Webhook HTTP Endpoint
 *
 * Endpoint HTTP para receber webhooks do Stripe
 * Este é um endpoint HTTP público (não authenticated)
 *
 * @module stripe/webhook
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
exports.stripeWebhookHttp = void 0;
// Firebase Functions v2 CORS - explicitly list allowed origins
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var stripe_1 = require("stripe");
var logger = require("firebase-functions/logger");
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
/**
 * HTTP Endpoint para Webhooks do Stripe
 *
 * Este endpoint recebe eventos do Stripe sobre pagamentos
 */
exports.stripeWebhookHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    cors: CORS_ORIGINS,
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
}, function (request, response) { return __awaiter(void 0, void 0, void 0, function () {
    var stripeSecretKey, webhookSecret, stripe, sig, body, event, _a, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                stripeSecretKey = process.env.STRIPE_SECRET_KEY;
                webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                stripe = new stripe_1.default(stripeSecretKey, {
                    apiVersion: '2025-02-24.acacia',
                    typescript: true,
                });
                sig = request.headers['stripe-signature'];
                body = request.rawBody.toString('utf8');
                try {
                    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
                }
                catch (error) {
                    logger.error('Webhook signature verification failed:', error);
                    response.status(401).json({ error: 'Assinatura inválida' });
                    return [2 /*return*/];
                }
                logger.info("Webhook received: ".concat(event.type));
                _b.label = 1;
            case 1:
                _b.trys.push([1, 16, , 17]);
                _a = event.type;
                switch (_a) {
                    case 'checkout.session.completed': return [3 /*break*/, 2];
                    case 'payment_intent.succeeded': return [3 /*break*/, 4];
                    case 'payment_intent.payment_failed': return [3 /*break*/, 6];
                    case 'invoice.paid': return [3 /*break*/, 8];
                    case 'invoice.payment_failed': return [3 /*break*/, 10];
                    case 'customer.subscription.deleted': return [3 /*break*/, 12];
                }
                return [3 /*break*/, 14];
            case 2: return [4 /*yield*/, handleCheckoutCompleted(event.data.object, stripe)];
            case 3:
                _b.sent();
                return [3 /*break*/, 15];
            case 4: return [4 /*yield*/, handlePaymentSucceeded(event.data.object)];
            case 5:
                _b.sent();
                return [3 /*break*/, 15];
            case 6: return [4 /*yield*/, handlePaymentFailed(event.data.object)];
            case 7:
                _b.sent();
                return [3 /*break*/, 15];
            case 8: return [4 /*yield*/, handleInvoicePaid(event.data.object)];
            case 9:
                _b.sent();
                return [3 /*break*/, 15];
            case 10: return [4 /*yield*/, handleInvoicePaymentFailed(event.data.object)];
            case 11:
                _b.sent();
                return [3 /*break*/, 15];
            case 12: return [4 /*yield*/, handleSubscriptionDeleted(event.data.object)];
            case 13:
                _b.sent();
                return [3 /*break*/, 15];
            case 14:
                logger.info("Unhandled event type: ".concat(event.type));
                _b.label = 15;
            case 15:
                response.json({ received: true });
                return [3 /*break*/, 17];
            case 16:
                error_1 = _b.sent();
                logger.error('Error processing webhook:', error_1);
                response.status(500).json({ error: 'Erro ao processar webhook' });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
// ============================================================================================
// EVENT HANDLERS
// ============================================================================================
function handleCheckoutCompleted(session, stripe) {
    return __awaiter(this, void 0, void 0, function () {
        var metadata, userId, voucherType, patientId, patientName, patientEmail, patientPhone, existingCheckout, amount, currency, paymentIntentId, paymentIntent, subscriptionId, subscription, sessionsMap, sessionsTotal, voucherRef;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    metadata = session.metadata || {};
                    userId = metadata.userId, voucherType = metadata.voucherType, patientId = metadata.patientId, patientName = metadata.patientName, patientEmail = metadata.patientEmail, patientPhone = metadata.patientPhone;
                    if (!userId) {
                        logger.error('No userId in session metadata');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('checkout_sessions')
                            .doc(session.id)
                            .get()];
                case 1:
                    existingCheckout = _b.sent();
                    if (existingCheckout.exists && ((_a = existingCheckout.data()) === null || _a === void 0 ? void 0 : _a.status) === 'completed') {
                        logger.info("Checkout session ".concat(session.id, " already processed, skipping"));
                        return [2 /*return*/];
                    }
                    amount = 0;
                    currency = 'brl';
                    if (!(session.mode === 'payment' && session.payment_intent)) return [3 /*break*/, 3];
                    paymentIntentId = session.payment_intent;
                    return [4 /*yield*/, stripe.paymentIntents.retrieve(paymentIntentId)];
                case 2:
                    paymentIntent = _b.sent();
                    amount = paymentIntent.amount;
                    currency = paymentIntent.currency;
                    return [3 /*break*/, 5];
                case 3:
                    if (!(session.mode === 'subscription' && session.subscription)) return [3 /*break*/, 5];
                    subscriptionId = session.subscription;
                    return [4 /*yield*/, stripe.subscriptions.retrieve(subscriptionId)];
                case 4:
                    subscription = _b.sent();
                    amount = subscription.items.data[0].price.unit_amount || 0;
                    currency = subscription.items.data[0].price.currency;
                    _b.label = 5;
                case 5:
                    sessionsMap = {
                        'single_session': 1,
                        'sessions_5': 5,
                        'sessions_10': 10,
                        'monthly_unlimited': -1,
                    };
                    sessionsTotal = sessionsMap[voucherType] || 1;
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('user_vouchers')
                            .add({
                            userId: userId,
                            patientId: patientId || null,
                            stripeCustomerId: session.customer,
                            stripeSessionId: session.id,
                            stripePaymentIntentId: session.payment_intent,
                            stripeSubscriptionId: session.subscription || null,
                            voucherType: voucherType,
                            name: getVoucherName(voucherType),
                            sessionsTotal: sessionsTotal,
                            sessionsRemaining: sessionsTotal,
                            amountPaid: amount,
                            currency: currency,
                            status: 'active',
                            purchasedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                            expiresAt: calculateExpiryDate(sessionsTotal === -1 ? 'monthly' : 'sessions'),
                            patientName: patientName,
                            patientEmail: patientEmail,
                            patientPhone: patientPhone,
                        })];
                case 6:
                    voucherRef = _b.sent();
                    // Atualizar sessão de checkout
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('checkout_sessions')
                            .doc(session.id)
                            .set({
                            sessionId: session.id,
                            userId: userId,
                            voucherType: voucherType,
                            patientId: patientId,
                            status: 'completed',
                            voucherId: voucherRef.id,
                            completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                            createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true })];
                case 7:
                    // Atualizar sessão de checkout
                    _b.sent();
                    // Log de auditoria
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('audit_logs')
                            .add({
                            action: 'voucher_purchased',
                            userId: userId,
                            voucherId: voucherRef.id,
                            voucherType: voucherType,
                            amount: amount,
                            timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 8:
                    // Log de auditoria
                    _b.sent();
                    logger.info("Voucher created: ".concat(voucherRef.id, " for user: ").concat(userId));
                    return [2 /*return*/];
            }
        });
    });
}
function handlePaymentSucceeded(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.info("Payment succeeded: ".concat(paymentIntent.id));
            return [2 /*return*/];
        });
    });
}
function handlePaymentFailed(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        var checkoutSessions, doc;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.error("Payment failed: ".concat(paymentIntent.id));
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('checkout_sessions')
                            .where('stripePaymentIntentId', '==', paymentIntent.id)
                            .get()];
                case 1:
                    checkoutSessions = _b.sent();
                    if (!!checkoutSessions.empty) return [3 /*break*/, 3];
                    doc = checkoutSessions.docs[0];
                    return [4 /*yield*/, doc.ref.update({
                            status: 'failed',
                            failedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                            errorMessage: ((_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Pagamento falhou',
                        })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handleInvoicePaid(invoice) {
    return __awaiter(this, void 0, void 0, function () {
        var vouchers, voucher;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info("Invoice paid: ".concat(invoice.id));
                    if (!invoice.subscription)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('user_vouchers')
                            .where('stripeSubscriptionId', '==', invoice.subscription)
                            .where('status', '==', 'active')
                            .get()];
                case 1:
                    vouchers = _a.sent();
                    if (!!vouchers.empty) return [3 /*break*/, 3];
                    voucher = vouchers.docs[0];
                    return [4 /*yield*/, voucher.ref.update({
                            sessionsRemaining: -1,
                            renewedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                            expiresAt: calculateExpiryDate('monthly'),
                        })];
                case 2:
                    _a.sent();
                    logger.info("Voucher renewed: ".concat(voucher.id));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handleInvoicePaymentFailed(invoice) {
    return __awaiter(this, void 0, void 0, function () {
        var vouchers, voucher;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.error("Invoice payment failed: ".concat(invoice.id));
                    if (!invoice.subscription)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('user_vouchers')
                            .where('stripeSubscriptionId', '==', invoice.subscription)
                            .get()];
                case 1:
                    vouchers = _a.sent();
                    if (!!vouchers.empty) return [3 /*break*/, 3];
                    voucher = vouchers.docs[0];
                    return [4 /*yield*/, voucher.ref.update({
                            status: 'past_due',
                            lastPaymentFailedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handleSubscriptionDeleted(subscription) {
    return __awaiter(this, void 0, void 0, function () {
        var vouchers, _i, _a, doc;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.info("Subscription deleted: ".concat(subscription.id));
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('user_vouchers')
                            .where('stripeSubscriptionId', '==', subscription.id)
                            .get()];
                case 1:
                    vouchers = _b.sent();
                    _i = 0, _a = vouchers.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    doc = _a[_i];
                    return [4 /*yield*/, doc.ref.update({
                            status: 'cancelled',
                            cancelledAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
function getVoucherName(type) {
    var names = {
        'single_session': 'Sessão Única',
        'sessions_5': 'Pacote de 5 Sessões',
        'sessions_10': 'Pacote de 10 Sessões',
        'monthly_unlimited': 'Mensal Ilimitado',
    };
    return names[type] || 'Voucher';
}
function calculateExpiryDate(type) {
    var now = new Date();
    if (type === 'monthly') {
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
}
