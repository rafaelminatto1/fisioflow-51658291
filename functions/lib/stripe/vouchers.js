"use strict";
/**
 * Stripe Integration - Voucher Payment System
 *
 * Implementa checkout de vouchers usando Stripe Payment Intents
 *
 * @module stripe/vouchers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserVouchers = exports.listAvailableVouchers = exports.stripeWebhook = exports.createVoucherCheckout = exports.VoucherType = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const stripe_1 = __importDefault(require("stripe"));
const logger = __importStar(require("firebase-functions/logger"));
// Configuração do Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
});
// Webhook secret para verificar assinaturas
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
const VOUCHER_PRICES = {
    [VoucherType.SINGLE_SESSION]: 15000, // R$ 150,00
    [VoucherType.SESSIONS_5]: 65000, // R$ 650,00 (13% de desconto)
    [VoucherType.SESSIONS_10]: 120000, // R$ 1.200,00 (20% de desconto)
    [VoucherType.MONTHLY_UNLIMITED]: 29990, // R$ 299,90/mês
};
/**
 * Quantidade de sessões por voucher
 */
const VOUCHER_SESSIONS = {
    [VoucherType.SINGLE_SESSION]: 1,
    [VoucherType.SESSIONS_5]: 5,
    [VoucherType.SESSIONS_10]: 10,
    [VoucherType.MONTHLY_UNLIMITED]: -1, // -1 = ilimitado
};
/**
 * Cloud Function: Criar checkout session para voucher
 *
 * Cria uma sessão de checkout no Stripe para pagamento de voucher
 */
exports.createVoucherCheckout = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const { voucherType, patientId, successUrl, cancelUrl } = request.data;
    // Validar tipo de voucher
    if (!Object.values(VoucherType).includes(voucherType)) {
        throw new https_1.HttpsError('invalid-argument', 'Tipo de voucher inválido');
    }
    // Buscar dados do usuário
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(userId)
        .get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
    }
    const userData = userDoc.data();
    // Buscar dados do paciente (se fornecido)
    let patientData = null;
    if (patientId) {
        const patientDoc = await (0, firebase_admin_1.firestore)()
            .collection('patients')
            .doc(patientId)
            .get();
        if (patientDoc.exists) {
            patientData = patientDoc.data();
        }
    }
    try {
        // Criar checkout session
        const session = await stripe.checkout.sessions.create({
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
            success_url: successUrl || `${request.rawRequest.headers.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${request.rawRequest.headers.origin}/checkout/cancel`,
            customer_email: userData?.email || undefined,
            metadata: {
                userId,
                voucherType,
                patientId: patientId || '',
                // Armazenar dados do paciente para criar voucher após pagamento
                patientName: patientData?.full_name || userData?.displayName || '',
                patientEmail: patientData?.email || userData?.email || '',
                patientPhone: patientData?.phone || userData?.phoneNumber || '',
            },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
        });
        // Salvar referência da sessão no Firestore
        await (0, firebase_admin_1.firestore)()
            .collection('checkout_sessions')
            .doc(session.id)
            .set({
            sessionId: session.id,
            userId,
            voucherType,
            patientId,
            createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            expiresAt: session.expires_at,
            status: 'pending',
        });
        logger.info(`Checkout session created: ${session.id} for user: ${userId}`);
        return {
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id,
        };
    }
    catch (error) {
        logger.error('Error creating checkout session:', error);
        throw new https_1.HttpsError('internal', `Erro ao criar checkout: ${error.message}`);
    }
});
/**
 * Cloud Function: Webhook do Stripe
 *
 * Processa eventos de webhook do Stripe (pagamentos confirmados, etc)
 */
exports.stripeWebhook = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    // Este endpoint deve ser acessível publicamente pelo Stripe
    // Usar verificação de assinatura é crítico
    const sig = request.rawRequest.headers['stripe-signature'];
    const body = request.rawRequest.body;
    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
    catch (error) {
        logger.error('Webhook signature verification failed:', error);
        throw new https_1.HttpsError('permission-denied', 'Assinatura inválida');
    }
    logger.info(`Webhook received: ${event.type}`);
    // Processar eventos relevantes
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;
        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;
        case 'invoice.paid':
            await handleInvoicePaid(event.data.object);
            break;
        case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object);
            break;
        default:
            logger.info(`Unhandled event type: ${event.type}`);
    }
    return { received: true };
});
/**
 * Cloud Function: Listar vouchers disponíveis
 */
exports.listAvailableVouchers = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async () => {
    const vouchers = Object.values(VoucherType).map(type => ({
        type,
        name: getVoucherName(type),
        description: getVoucherDescription(type),
        price: VOUCHER_PRICES[type],
        sessions: VOUCHER_SESSIONS[type],
        currency: 'BRL',
    }));
    return { vouchers };
});
/**
 * Cloud Function: Obter vouchers do usuário
 */
exports.getUserVouchers = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const userId = request.auth.uid;
    const vouchersSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .orderBy('purchasedAt', 'desc')
        .get();
    const vouchers = vouchersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
    return { vouchers };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Retorna o nome do voucher
 */
function getVoucherName(type) {
    const names = {
        [VoucherType.SINGLE_SESSION]: 'Sessão Única',
        [VoucherType.SESSIONS_5]: 'Pacote de 5 Sessões',
        [VoucherType.SESSIONS_10]: 'Pacote de 10 Sessões',
        [VoucherType.MONTHLY_UNLIMITED]: 'Mensal Ilimitado',
    };
    return names[type];
}
/**
 * Retorna a descrição do voucher
 */
function getVoucherDescription(type) {
    const descriptions = {
        [VoucherType.SINGLE_SESSION]: 'Uma sessão de fisioterapia',
        [VoucherType.SESSIONS_5]: 'Pacote com 13% de desconto',
        [VoucherType.SESSIONS_10]: 'Pacote com 20% de desconto',
        [VoucherType.MONTHLY_UNLIMITED]: 'Acesso ilimitado durante 30 dias',
    };
    return descriptions[type];
}
/**
 * Processa checkout completado
 */
async function handleCheckoutCompleted(session) {
    const { userId, voucherType, patientId, patientName, patientEmail, patientPhone } = session.metadata;
    if (!userId) {
        logger.error('No userId in session metadata');
        return;
    }
    // Buscar detalhes do pagamento
    let amount = 0;
    let currency = 'brl';
    if (session.mode === 'payment' && session.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        amount = paymentIntent.amount;
        currency = paymentIntent.currency;
    }
    else if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        amount = subscription.items.data[0].price.unit_amount || 0;
        currency = subscription.items.data[0].price.currency;
    }
    // Criar voucher no Firestore
    const voucherRef = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .add({
        userId,
        patientId: patientId || null,
        stripeCustomerId: session.customer,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        stripeSubscriptionId: session.subscription || null,
        voucherType,
        name: getVoucherName(voucherType),
        sessionsTotal: VOUCHER_SESSIONS[voucherType],
        sessionsRemaining: VOUCHER_SESSIONS[voucherType],
        amountPaid: amount,
        currency,
        status: 'active',
        purchasedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        expiresAt: calculateExpiryDate(voucherType),
        patientName,
        patientEmail,
        patientPhone,
    });
    // Atualizar sessão de checkout
    await (0, firebase_admin_1.firestore)()
        .collection('checkout_sessions')
        .doc(session.id)
        .update({
        status: 'completed',
        voucherId: voucherRef.id,
        completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'voucher_purchased',
        userId,
        voucherId: voucherRef.id,
        voucherType,
        amount,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`Voucher created: ${voucherRef.id} for user: ${userId}`);
    // Enviar email de confirmação
    // await sendVoucherConfirmationEmail(userId, voucherRef.id);
}
/**
 * Processa pagamento bem-sucedido
 */
async function handlePaymentSucceeded(paymentIntent) {
    logger.info(`Payment succeeded: ${paymentIntent.id}`);
    // Pagamentos únicos já são tratados em handleCheckoutCompleted
}
/**
 * Processa pagamento falhado
 */
async function handlePaymentFailed(paymentIntent) {
    logger.error(`Payment failed: ${paymentIntent.id}`);
    // Buscar sessão associada
    const checkoutSessions = await (0, firebase_admin_1.firestore)()
        .collection('checkout_sessions')
        .where('stripePaymentIntentId', '==', paymentIntent.id)
        .get();
    if (!checkoutSessions.empty) {
        const doc = checkoutSessions.docs[0];
        await doc.ref.update({
            status: 'failed',
            failedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            errorMessage: paymentIntent.last_payment_error?.message || 'Pagamento falhou',
        });
    }
}
/**
 * Processa invoice paga (para assinaturas recorrentes)
 */
async function handleInvoicePaid(invoice) {
    logger.info(`Invoice paid: ${invoice.id}`);
    if (!invoice.subscription)
        return;
    // Buscar voucher associado à assinatura
    const vouchers = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .where('stripeSubscriptionId', '==', invoice.subscription)
        .where('status', '==', 'active')
        .get();
    if (!vouchers.empty) {
        const voucher = vouchers.docs[0];
        // Renovar voucher (resetar sessões para mensal ilimitado)
        await voucher.ref.update({
            sessionsRemaining: -1, // Ilimitado
            renewedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpiryDate(VoucherType.MONTHLY_UNLIMITED),
        });
        logger.info(`Voucher renewed: ${voucher.id}`);
    }
}
/**
 * Processa falha de pagamento de invoice
 */
async function handleInvoicePaymentFailed(invoice) {
    logger.error(`Invoice payment failed: ${invoice.id}`);
    if (!invoice.subscription)
        return;
    // Buscar voucher associado
    const vouchers = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .where('stripeSubscriptionId', '==', invoice.subscription)
        .get();
    if (!vouchers.empty) {
        const voucher = vouchers.docs[0];
        await voucher.ref.update({
            status: 'past_due',
            lastPaymentFailedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
        // Notificar usuário sobre pagamento falhado
        // await sendPaymentFailedEmail(voucher.data().userId);
    }
}
/**
 * Calcula data de expiração do voucher
 */
function calculateExpiryDate(voucherType) {
    const now = new Date();
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
//# sourceMappingURL=vouchers.js.map