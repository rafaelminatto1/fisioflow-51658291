"use strict";
/**
 * Stripe Integration - Voucher Payment System
 *
 * Implementa checkout de vouchers usando Stripe Payment Intents
 *
 * @module stripe/vouchers
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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserVouchers = exports.listAvailableVouchers = exports.stripeWebhook = exports.createVoucherCheckout = exports.VoucherType = void 0;
// Configuração do Stripe
var https_1 = require("firebase-functions/v2/https");
var firebase_admin_1 = require("firebase-admin");
var stripe_1 = require("stripe");
var logger = require("firebase-functions/logger");
var resend_templates_1 = require("../communications/resend-templates");
var stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
});
// Webhook secret para verificar assinaturas
var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
// Firebase Functions v2 CORS - explicitly list allowed origins
var CORS_ORIGINS = [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    /moocafisio\.com\.br$/,
    /fisioflow\.web\.app$/,
];
/**
 * Tipos de voucher disponíveis
 */
var VoucherType;
(function (VoucherType) {
    VoucherType["SINGLE_SESSION"] = "single_session";
    VoucherType["SESSIONS_5"] = "sessions_5";
    VoucherType["SESSIONS_10"] = "sessions_10";
    VoucherType["MONTHLY_UNLIMITED"] = "monthly_unlimited";
})(VoucherType || (exports.VoucherType = VoucherType = {}));
/**
 * Preços dos vouchers (em centavos)
 */
var VOUCHER_PRICES = (_a = {},
    _a[VoucherType.SINGLE_SESSION] = 15000,
    _a[VoucherType.SESSIONS_5] = 65000,
    _a[VoucherType.SESSIONS_10] = 120000,
    _a[VoucherType.MONTHLY_UNLIMITED] = 29990,
    _a);
/**
 * Quantidade de sessões por voucher
 */
var VOUCHER_SESSIONS = (_b = {},
    _b[VoucherType.SINGLE_SESSION] = 1,
    _b[VoucherType.SESSIONS_5] = 5,
    _b[VoucherType.SESSIONS_10] = 10,
    _b[VoucherType.MONTHLY_UNLIMITED] = -1,
    _b);
/**
 * Cloud Function: Criar checkout session para voucher
 *
 * Cria uma sessão de checkout no Stripe para pagamento de voucher
 */
exports.createVoucherCheckout = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, voucherType, patientId, successUrl, cancelUrl, userDoc, userData, patientData, patientDoc, session, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                _a = request.data, voucherType = _a.voucherType, patientId = _a.patientId, successUrl = _a.successUrl, cancelUrl = _a.cancelUrl;
                // Validar tipo de voucher
                if (!Object.values(VoucherType).includes(voucherType)) {
                    throw new https_1.HttpsError('invalid-argument', 'Tipo de voucher inválido');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(userId)
                        .get()];
            case 1:
                userDoc = _b.sent();
                if (!userDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
                }
                userData = userDoc.data();
                patientData = null;
                if (!patientId) return [3 /*break*/, 3];
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(patientId)
                        .get()];
            case 2:
                patientDoc = _b.sent();
                if (patientDoc.exists) {
                    patientData = patientDoc.data();
                }
                _b.label = 3;
            case 3:
                _b.trys.push([3, 6, , 7]);
                return [4 /*yield*/, stripe.checkout.sessions.create({
                        payment_method_types: ['card', 'pix'],
                        line_items: [
                            {
                                price_data: {
                                    currency: 'brl',
                                    product_data: {
                                        name: getVoucherName(voucherType),
                                        description: getVoucherDescription(voucherType),
                                        images: [
                                            'https://fisioflow.app/assets/voucher-card.png',
                                        ],
                                    },
                                    unit_amount: VOUCHER_PRICES[voucherType],
                                },
                                quantity: 1,
                            },
                        ],
                        mode: VoucherType.MONTHLY_UNLIMITED === voucherType ? 'subscription' : 'payment',
                        success_url: successUrl || "".concat(request.rawRequest.headers.origin, "/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
                        cancel_url: cancelUrl || "".concat(request.rawRequest.headers.origin, "/checkout/cancel"),
                        customer_email: (userData === null || userData === void 0 ? void 0 : userData.email) || undefined,
                        metadata: {
                            userId: userId,
                            voucherType: voucherType,
                            patientId: patientId || '',
                            // Armazenar dados do paciente para criar voucher após pagamento
                            patientName: (patientData === null || patientData === void 0 ? void 0 : patientData.full_name) || (userData === null || userData === void 0 ? void 0 : userData.displayName) || '',
                            patientEmail: (patientData === null || patientData === void 0 ? void 0 : patientData.email) || (userData === null || userData === void 0 ? void 0 : userData.email) || '',
                            patientPhone: (patientData === null || patientData === void 0 ? void 0 : patientData.phone) || (userData === null || userData === void 0 ? void 0 : userData.phoneNumber) || '',
                        },
                        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
                    })];
            case 4:
                session = _b.sent();
                // Salvar referência da sessão no Firestore
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('checkout_sessions')
                        .doc(session.id)
                        .set({
                        sessionId: session.id,
                        userId: userId,
                        voucherType: voucherType,
                        patientId: patientId,
                        createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        expiresAt: session.expires_at,
                        status: 'pending',
                    })];
            case 5:
                // Salvar referência da sessão no Firestore
                _b.sent();
                logger.info("Checkout session created: ".concat(session.id, " for user: ").concat(userId));
                return [2 /*return*/, {
                        success: true,
                        checkoutUrl: session.url,
                        sessionId: session.id,
                    }];
            case 6:
                error_1 = _b.sent();
                logger.error('Error creating checkout session:', error_1);
                throw new https_1.HttpsError('internal', "Erro ao criar checkout: ".concat(error_1.message));
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * Cloud Function: Webhook do Stripe
 *
 * Processa eventos de webhook do Stripe (pagamentos confirmados, etc)
 */
exports.stripeWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var sig, body, event, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sig = request.rawRequest.headers['stripe-signature'];
                body = request.rawRequest.body;
                try {
                    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
                }
                catch (error) {
                    logger.error('Webhook signature verification failed:', error);
                    throw new https_1.HttpsError('permission-denied', 'Assinatura inválida');
                }
                logger.info("Webhook received: ".concat(event.type));
                _a = event.type;
                switch (_a) {
                    case 'checkout.session.completed': return [3 /*break*/, 1];
                    case 'payment_intent.succeeded': return [3 /*break*/, 3];
                    case 'payment_intent.payment_failed': return [3 /*break*/, 5];
                    case 'invoice.paid': return [3 /*break*/, 7];
                    case 'invoice.payment_failed': return [3 /*break*/, 9];
                }
                return [3 /*break*/, 11];
            case 1: return [4 /*yield*/, handleCheckoutCompleted(event.data.object)];
            case 2:
                _b.sent();
                return [3 /*break*/, 12];
            case 3: return [4 /*yield*/, handlePaymentSucceeded(event.data.object)];
            case 4:
                _b.sent();
                return [3 /*break*/, 12];
            case 5: return [4 /*yield*/, handlePaymentFailed(event.data.object)];
            case 6:
                _b.sent();
                return [3 /*break*/, 12];
            case 7: return [4 /*yield*/, handleInvoicePaid(event.data.object)];
            case 8:
                _b.sent();
                return [3 /*break*/, 12];
            case 9: return [4 /*yield*/, handleInvoicePaymentFailed(event.data.object)];
            case 10:
                _b.sent();
                return [3 /*break*/, 12];
            case 11:
                logger.info("Unhandled event type: ".concat(event.type));
                _b.label = 12;
            case 12: return [2 /*return*/, { received: true }];
        }
    });
}); });
/**
 * Cloud Function: Listar vouchers disponíveis
 */
exports.listAvailableVouchers = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var vouchers;
    return __generator(this, function (_a) {
        vouchers = Object.values(VoucherType).map(function (type) { return ({
            type: type,
            name: getVoucherName(type),
            description: getVoucherDescription(type),
            price: VOUCHER_PRICES[type],
            sessions: VOUCHER_SESSIONS[type],
            currency: 'BRL',
        }); });
        return [2 /*return*/, { vouchers: vouchers }];
    });
}); });
/**
 * Cloud Function: Obter vouchers do usuário
 */
exports.getUserVouchers = (0, https_1.onCall)({
    cors: CORS_ORIGINS,
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, vouchersSnapshot, vouchers;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                userId = request.auth.uid;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_vouchers')
                        .where('userId', '==', userId)
                        .where('status', '==', 'active')
                        .orderBy('purchasedAt', 'desc')
                        .get()];
            case 1:
                vouchersSnapshot = _a.sent();
                vouchers = vouchersSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [2 /*return*/, { vouchers: vouchers }];
        }
    });
}); });
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Retorna o nome do voucher
 */
function getVoucherName(type) {
    var _a;
    var names = (_a = {},
        _a[VoucherType.SINGLE_SESSION] = 'Sessão Única',
        _a[VoucherType.SESSIONS_5] = 'Pacote de 5 Sessões',
        _a[VoucherType.SESSIONS_10] = 'Pacote de 10 Sessões',
        _a[VoucherType.MONTHLY_UNLIMITED] = 'Mensal Ilimitado',
        _a);
    return names[type];
}
/**
 * Retorna a descrição do voucher
 */
function getVoucherDescription(type) {
    var _a;
    var descriptions = (_a = {},
        _a[VoucherType.SINGLE_SESSION] = 'Uma sessão de fisioterapia',
        _a[VoucherType.SESSIONS_5] = 'Pacote com 13% de desconto',
        _a[VoucherType.SESSIONS_10] = 'Pacote com 20% de desconto',
        _a[VoucherType.MONTHLY_UNLIMITED] = 'Acesso ilimitado durante 30 dias',
        _a);
    return descriptions[type];
}
/**
 * Processa checkout completado
 */
function handleCheckoutCompleted(session) {
    return __awaiter(this, void 0, void 0, function () {
        var metadata, userId, voucherType, patientId, patientName, patientEmail, patientPhone, amount, currency, paymentIntentId, paymentIntent, subscriptionId, subscription, voucherRef, voucherData, _a, emailError_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    metadata = session.metadata || {};
                    userId = metadata.userId, voucherType = metadata.voucherType, patientId = metadata.patientId, patientName = metadata.patientName, patientEmail = metadata.patientEmail, patientPhone = metadata.patientPhone;
                    if (!userId) {
                        logger.error('No userId in session metadata');
                        return [2 /*return*/];
                    }
                    amount = 0;
                    currency = 'brl';
                    if (!(session.mode === 'payment' && session.payment_intent)) return [3 /*break*/, 2];
                    paymentIntentId = session.payment_intent;
                    return [4 /*yield*/, stripe.paymentIntents.retrieve(paymentIntentId)];
                case 1:
                    paymentIntent = _b.sent();
                    amount = paymentIntent.amount;
                    currency = paymentIntent.currency;
                    return [3 /*break*/, 4];
                case 2:
                    if (!(session.mode === 'subscription' && session.subscription)) return [3 /*break*/, 4];
                    subscriptionId = session.subscription;
                    return [4 /*yield*/, stripe.subscriptions.retrieve(subscriptionId)];
                case 3:
                    subscription = _b.sent();
                    amount = subscription.items.data[0].price.unit_amount || 0;
                    currency = subscription.items.data[0].price.currency;
                    _b.label = 4;
                case 4: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
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
                        sessionsTotal: VOUCHER_SESSIONS[voucherType],
                        sessionsRemaining: VOUCHER_SESSIONS[voucherType],
                        amountPaid: amount,
                        currency: currency,
                        status: 'active',
                        purchasedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        expiresAt: calculateExpiryDate(voucherType),
                        patientName: patientName,
                        patientEmail: patientEmail,
                        patientPhone: patientPhone,
                    })];
                case 5:
                    voucherRef = _b.sent();
                    // Atualizar sessão de checkout
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('checkout_sessions')
                            .doc(session.id)
                            .update({
                            status: 'completed',
                            voucherId: voucherRef.id,
                            completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 6:
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
                case 7:
                    // Log de auditoria
                    _b.sent();
                    logger.info("Voucher created: ".concat(voucherRef.id, " for user: ").concat(userId));
                    _b.label = 8;
                case 8:
                    _b.trys.push([8, 14, , 15]);
                    if (!voucherRef.id) return [3 /*break*/, 10];
                    return [4 /*yield*/, voucherRef.get()];
                case 9:
                    _a = (_b.sent()).data();
                    return [3 /*break*/, 11];
                case 10:
                    _a = null;
                    _b.label = 11;
                case 11:
                    voucherData = _a;
                    if (!(voucherData && patientEmail)) return [3 /*break*/, 13];
                    return [4 /*yield*/, (0, resend_templates_1.sendVoucherConfirmationEmail)(patientEmail, {
                            customerName: patientName || (userData === null || userData === void 0 ? void 0 : userData.displayName) || 'Cliente',
                            voucherName: voucherData.name || getVoucherName(voucherType),
                            voucherType: voucherData.voucherType || voucherType,
                            sessionsTotal: voucherData.sessionsTotal || VOUCHER_SESSIONS[voucherType],
                            amountPaid: ((amount || voucherData.amountPaid) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            expirationDate: voucherData.expiresAt || calculateExpiryDate(voucherType).toISOString(),
                            organizationName: 'FisioFlow',
                        })];
                case 12:
                    _b.sent();
                    logger.info("Voucher confirmation email sent to: ".concat(patientEmail));
                    _b.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    emailError_1 = _b.sent();
                    logger.error('Failed to send voucher confirmation email:', emailError_1);
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/];
            }
        });
    });
}
/**
 * Processa pagamento bem-sucedido
 */
function handlePaymentSucceeded(paymentIntent) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.info("Payment succeeded: ".concat(paymentIntent.id));
            return [2 /*return*/];
        });
    });
}
/**
 * Processa pagamento falhado
 */
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
/**
 * Processa invoice paga (para assinaturas recorrentes)
 */
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
                    // Renovar voucher (resetar sessões para mensal ilimitado)
                    return [4 /*yield*/, voucher.ref.update({
                            sessionsRemaining: -1, // Ilimitado
                            renewedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                            expiresAt: calculateExpiryDate(VoucherType.MONTHLY_UNLIMITED),
                        })];
                case 2:
                    // Renovar voucher (resetar sessões para mensal ilimitado)
                    _a.sent();
                    logger.info("Voucher renewed: ".concat(voucher.id));
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Processa falha de pagamento de invoice
 */
function handleInvoicePaymentFailed(invoice) {
    return __awaiter(this, void 0, void 0, function () {
        var vouchers, voucher, voucherData, emailError_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.error("Invoice payment failed: ".concat(invoice.id));
                    if (!invoice.subscription)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                            .collection('user_vouchers')
                            .where('stripeSubscriptionId', '==', invoice.subscription)
                            .get()];
                case 1:
                    vouchers = _b.sent();
                    if (!!vouchers.empty) return [3 /*break*/, 7];
                    voucher = vouchers.docs[0];
                    voucherData = voucher.data();
                    return [4 /*yield*/, voucher.ref.update({
                            status: 'past_due',
                            lastPaymentFailedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    if (!voucherData.patientEmail) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, resend_templates_1.sendPaymentFailedEmail)(voucherData.patientEmail, {
                            customerName: voucherData.patientName || 'Cliente',
                            amount: ((invoice.amount_due || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            voucherName: voucherData.name || 'Voucher Mensal',
                            errorMessage: ((_a = invoice.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) || 'Pagamento não processado',
                            organizationName: 'FisioFlow',
                        })];
                case 4:
                    _b.sent();
                    logger.info("Payment failed email sent to: ".concat(voucherData.patientEmail));
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    emailError_2 = _b.sent();
                    logger.error('Failed to send payment failed email:', emailError_2);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Calcula data de expiração do voucher
 */
function calculateExpiryDate(voucherType) {
    var now = new Date();
    switch (voucherType) {
        case VoucherType.SINGLE_SESSION:
        case VoucherType.SESSIONS_5:
        case VoucherType.SESSIONS_10:
            // Vouchers de sessões expiram em 6 meses
            return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        case VoucherType.MONTHLY_UNLIMITED:
            // Mensal expira em 30 dias
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        default:
            return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    }
}
