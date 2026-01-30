/**
 * Stripe Webhook HTTP Endpoint
 *
 * Endpoint HTTP para receber webhooks do Stripe
 * Este é um endpoint HTTP público (não authenticated)
 *
 * @module stripe/webhook
 */

import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from 'firebase-admin';
import Stripe from 'stripe';
import * as logger from 'firebase-functions/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * HTTP Endpoint para Webhooks do Stripe
 *
 * Este endpoint recebe eventos do Stripe sobre pagamentos
 */
export const stripeWebhookHttp = onRequest({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request, response) => {
  const sig = request.headers['stripe-signature'] as string;
  const body = request.rawBody.toString('utf8');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error);
    return response.status(401).json({ error: 'Assinatura inválida' });
  }

  logger.info(`Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return response.json({ received: true });
  } catch (error: any) {
    logger.error('Error processing webhook:', error);
    return response.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// ============================================================================================
// EVENT HANDLERS
// ============================================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const { userId, voucherType, patientId, patientName, patientEmail, patientPhone } = metadata;

  if (!userId) {
    logger.error('No userId in session metadata');
    return;
  }

  // Buscar detalhes do pagamento
  let amount = 0;
  let currency = 'brl';

  if (session.mode === 'payment' && session.payment_intent) {
    const paymentIntentId = session.payment_intent as string;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    amount = paymentIntent.amount;
    currency = paymentIntent.currency;
  } else if (session.mode === 'subscription' && session.subscription) {
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    amount = subscription.items.data[0].price.unit_amount || 0;
    currency = subscription.items.data[0].price.currency;
  }

  // Definir sessões baseado no tipo
  const sessionsMap: Record<string, number> = {
    'single_session': 1,
    'sessions_5': 5,
    'sessions_10': 10,
    'monthly_unlimited': -1,
  };

  const sessionsTotal = sessionsMap[voucherType] || 1;

  // Criar voucher no Firestore
  const voucherRef = await firestore()
    .collection('user_vouchers')
    .add({
      userId,
      patientId: patientId || null,
      stripeCustomerId: session.customer as string,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      stripeSubscriptionId: session.subscription as string || null,
      voucherType,
      name: getVoucherName(voucherType),
      sessionsTotal,
      sessionsRemaining: sessionsTotal,
      amountPaid: amount,
      currency,
      status: 'active',
      purchasedAt: firestore.FieldValue.serverTimestamp(),
      expiresAt: calculateExpiryDate(sessionsTotal === -1 ? 'monthly' : 'sessions'),
      patientName,
      patientEmail,
      patientPhone,
    });

  // Atualizar sessão de checkout
  await firestore()
    .collection('checkout_sessions')
    .doc(session.id)
    .set({
      sessionId: session.id,
      userId,
      voucherType,
      patientId,
      status: 'completed',
      voucherId: voucherRef.id,
      completedAt: firestore.FieldValue.serverTimestamp(),
      createdAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

  // Log de auditoria
  await firestore()
    .collection('audit_logs')
    .add({
      action: 'voucher_purchased',
      userId,
      voucherId: voucherRef.id,
      voucherType,
      amount,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

  logger.info(`Voucher created: ${voucherRef.id} for user: ${userId}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.error(`Payment failed: ${paymentIntent.id}`);

  const checkoutSessions = await firestore()
    .collection('checkout_sessions')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .get();

  if (!checkoutSessions.empty) {
    const doc = checkoutSessions.docs[0];
    await doc.ref.update({
      status: 'failed',
      failedAt: firestore.FieldValue.serverTimestamp(),
      errorMessage: paymentIntent.last_payment_error?.message || 'Pagamento falhou',
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  logger.info(`Invoice paid: ${invoice.id}`);

  if (!invoice.subscription) return;

  const vouchers = await firestore()
    .collection('user_vouchers')
    .where('stripeSubscriptionId', '==', invoice.subscription)
    .where('status', '==', 'active')
    .get();

  if (!vouchers.empty) {
    const voucher = vouchers.docs[0];
    await voucher.ref.update({
      sessionsRemaining: -1,
      renewedAt: firestore.FieldValue.serverTimestamp(),
      expiresAt: calculateExpiryDate('monthly'),
    });

    logger.info(`Voucher renewed: ${voucher.id}`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.error(`Invoice payment failed: ${invoice.id}`);

  if (!invoice.subscription) return;

  const vouchers = await firestore()
    .collection('user_vouchers')
    .where('stripeSubscriptionId', '==', invoice.subscription)
    .get();

  if (!vouchers.empty) {
    const voucher = vouchers.docs[0];
    await voucher.ref.update({
      status: 'past_due',
      lastPaymentFailedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info(`Subscription deleted: ${subscription.id}`);

  const vouchers = await firestore()
    .collection('user_vouchers')
    .where('stripeSubscriptionId', '==', subscription.id)
    .get();

  for (const doc of vouchers.docs) {
    await doc.ref.update({
      status: 'cancelled',
      cancelledAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================

function getVoucherName(type: string): string {
  const names: Record<string, string> = {
    'single_session': 'Sessão Única',
    'sessions_5': 'Pacote de 5 Sessões',
    'sessions_10': 'Pacote de 10 Sessões',
    'monthly_unlimited': 'Mensal Ilimitado',
  };
  return names[type] || 'Voucher';
}

function calculateExpiryDate(type: 'monthly' | 'sessions'): Date {
  const now = new Date();

  if (type === 'monthly') {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
}
