"use strict";
/**
 * Stripe Webhook HTTP Endpoint
 *
 * Endpoint HTTP para receber webhooks do Stripe
 * Este é um endpoint HTTP público (não authenticated)
 *
 * @module stripe/webhook
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
exports.stripeWebhookHttp = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const stripe_1 = __importDefault(require("stripe"));
const logger = __importStar(require("firebase-functions/logger"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
/**
 * HTTP Endpoint para Webhooks do Stripe
 *
 * Este endpoint recebe eventos do Stripe sobre pagamentos
 */
exports.stripeWebhookHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request, response) => {
    const sig = request.headers['stripe-signature'];
    const body = request.rawBody.toString('utf8');
    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
    catch (error) {
        logger.error('Webhook signature verification failed:', error);
        return response.status(401).json({ error: 'Assinatura inválida' });
    }
    logger.info(`Webhook received: ${event.type}`);
    try {
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
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }
        return response.json({ received: true });
    }
    catch (error) {
        logger.error('Error processing webhook:', error);
        return response.status(500).json({ error: 'Erro ao processar webhook' });
    }
});
// ============================================================================================
// EVENT HANDLERS
// ============================================================================================
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
    // Definir sessões baseado no tipo
    const sessionsMap = {
        'single_session': 1,
        'sessions_5': 5,
        'sessions_10': 10,
        'monthly_unlimited': -1,
    };
    const sessionsTotal = sessionsMap[voucherType] || 1;
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
        sessionsTotal,
        sessionsRemaining: sessionsTotal,
        amountPaid: amount,
        currency,
        status: 'active',
        purchasedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        expiresAt: calculateExpiryDate(sessionsTotal === -1 ? 'monthly' : 'sessions'),
        patientName,
        patientEmail,
        patientPhone,
    });
    // Atualizar sessão de checkout
    await (0, firebase_admin_1.firestore)()
        .collection('checkout_sessions')
        .doc(session.id)
        .set({
        sessionId: session.id,
        userId,
        voucherType,
        patientId,
        status: 'completed',
        voucherId: voucherRef.id,
        completedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
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
}
async function handlePaymentSucceeded(paymentIntent) {
    logger.info(`Payment succeeded: ${paymentIntent.id}`);
}
async function handlePaymentFailed(paymentIntent) {
    logger.error(`Payment failed: ${paymentIntent.id}`);
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
async function handleInvoicePaid(invoice) {
    logger.info(`Invoice paid: ${invoice.id}`);
    if (!invoice.subscription)
        return;
    const vouchers = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .where('stripeSubscriptionId', '==', invoice.subscription)
        .where('status', '==', 'active')
        .get();
    if (!vouchers.empty) {
        const voucher = vouchers.docs[0];
        await voucher.ref.update({
            sessionsRemaining: -1,
            renewedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
            expiresAt: calculateExpiryDate('monthly'),
        });
        logger.info(`Voucher renewed: ${voucher.id}`);
    }
}
async function handleInvoicePaymentFailed(invoice) {
    logger.error(`Invoice payment failed: ${invoice.id}`);
    if (!invoice.subscription)
        return;
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
    }
}
async function handleSubscriptionDeleted(subscription) {
    logger.info(`Subscription deleted: ${subscription.id}`);
    const vouchers = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .where('stripeSubscriptionId', '==', subscription.id)
        .get();
    for (const doc of vouchers.docs) {
        await doc.ref.update({
            status: 'cancelled',
            cancelledAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
    }
}
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
function getVoucherName(type) {
    const names = {
        'single_session': 'Sessão Única',
        'sessions_5': 'Pacote de 5 Sessões',
        'sessions_10': 'Pacote de 10 Sessões',
        'monthly_unlimited': 'Mensal Ilimitado',
    };
    return names[type] || 'Voucher';
}
function calculateExpiryDate(type) {
    const now = new Date();
    if (type === 'monthly') {
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
}
//# sourceMappingURL=webhook.js.map