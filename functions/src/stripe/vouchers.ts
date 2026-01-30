/**
 * Stripe Integration - Voucher Payment System
 *
 * Implementa checkout de vouchers usando Stripe Payment Intents
 *
 * @module stripe/vouchers
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { firestore } from 'firebase-admin';
import Stripe from 'stripe';
import * as logger from 'firebase-functions/logger';

// Configuração do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// Webhook secret para verificar assinaturas
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Tipos de voucher disponíveis
 */
export enum VoucherType {
  SINGLE_SESSION = 'single_session',
  SESSIONS_5 = 'sessions_5',
  SESSIONS_10 = 'sessions_10',
  MONTHLY_UNLIMITED = 'monthly_unlimited',
}

/**
 * Preços dos vouchers (em centavos)
 */
const VOUCHER_PRICES: Record<VoucherType, number> = {
  [VoucherType.SINGLE_SESSION]: 15000,    // R$ 150,00
  [VoucherType.SESSIONS_5]: 65000,       // R$ 650,00 (13% de desconto)
  [VoucherType.SESSIONS_10]: 120000,     // R$ 1.200,00 (20% de desconto)
  [VoucherType.MONTHLY_UNLIMITED]: 29990, // R$ 299,90/mês
};

/**
 * Quantidade de sessões por voucher
 */
const VOUCHER_SESSIONS: Record<VoucherType, number> = {
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
export const createVoucherCheckout = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;
  const { voucherType, patientId, successUrl, cancelUrl } = request.data as {
    voucherType: VoucherType;
    patientId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  // Validar tipo de voucher
  if (!Object.values(VoucherType).includes(voucherType)) {
    throw new HttpsError('invalid-argument', 'Tipo de voucher inválido');
  }

  // Buscar dados do usuário
  const userDoc = await firestore()
    .collection('users')
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuário não encontrado');
  }

  const userData = userDoc.data();

  // Buscar dados do paciente (se fornecido)
  let patientData: any = null;
  if (patientId) {
    const patientDoc = await firestore()
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
    await firestore()
      .collection('checkout_sessions')
      .doc(session.id)
      .set({
        sessionId: session.id,
        userId,
        voucherType,
        patientId,
        createdAt: firestore.FieldValue.serverTimestamp(),
        expiresAt: session.expires_at,
        status: 'pending',
      });

    logger.info(`Checkout session created: ${session.id} for user: ${userId}`);

    return {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    };

  } catch (error: any) {
    logger.error('Error creating checkout session:', error);
    throw new HttpsError('internal', `Erro ao criar checkout: ${error.message}`);
  }
});

/**
 * Cloud Function: Webhook do Stripe
 *
 * Processa eventos de webhook do Stripe (pagamentos confirmados, etc)
 */
export const stripeWebhook = onCall({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  // Este endpoint deve ser acessível publicamente pelo Stripe
  // Usar verificação de assinatura é crítico

  const sig = request.rawRequest.headers['stripe-signature'] as string;
  const body = request.rawRequest.body;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error);
    throw new HttpsError('permission-denied', 'Assinatura inválida');
  }

  logger.info(`Webhook received: ${event.type}`);

  // Processar eventos relevantes
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

    default:
      logger.info(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
});

/**
 * Cloud Function: Listar vouchers disponíveis
 */
export const listAvailableVouchers = onCall({
  cors: true,
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
export const getUserVouchers = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const userId = request.auth.uid;

  const vouchersSnapshot = await firestore()
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
function getVoucherName(type: VoucherType): string {
  const names: Record<VoucherType, string> = {
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
function getVoucherDescription(type: VoucherType): string {
  const descriptions: Record<VoucherType, string> = {
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
      name: getVoucherName(voucherType as VoucherType),
      sessionsTotal: VOUCHER_SESSIONS[voucherType as VoucherType],
      sessionsRemaining: VOUCHER_SESSIONS[voucherType as VoucherType],
      amountPaid: amount,
      currency,
      status: 'active',
      purchasedAt: firestore.FieldValue.serverTimestamp(),
      expiresAt: calculateExpiryDate(voucherType as VoucherType),
      patientName,
      patientEmail,
      patientPhone,
    });

  // Atualizar sessão de checkout
  await firestore()
    .collection('checkout_sessions')
    .doc(session.id)
    .update({
      status: 'completed',
      voucherId: voucherRef.id,
      completedAt: firestore.FieldValue.serverTimestamp(),
    });

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

  // Enviar email de confirmação
  // await sendVoucherConfirmationEmail(userId, voucherRef.id);
}

/**
 * Processa pagamento bem-sucedido
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);
  // Pagamentos únicos já são tratados em handleCheckoutCompleted
}

/**
 * Processa pagamento falhado
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.error(`Payment failed: ${paymentIntent.id}`);

  // Buscar sessão associada
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

/**
 * Processa invoice paga (para assinaturas recorrentes)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  logger.info(`Invoice paid: ${invoice.id}`);

  if (!invoice.subscription) return;

  // Buscar voucher associado à assinatura
  const vouchers = await firestore()
    .collection('user_vouchers')
    .where('stripeSubscriptionId', '==', invoice.subscription)
    .where('status', '==', 'active')
    .get();

  if (!vouchers.empty) {
    const voucher = vouchers.docs[0];
    // Renovar voucher (resetar sessões para mensal ilimitado)
    await voucher.ref.update({
      sessionsRemaining: -1, // Ilimitado
      renewedAt: firestore.FieldValue.serverTimestamp(),
      expiresAt: calculateExpiryDate(VoucherType.MONTHLY_UNLIMITED),
    });

    logger.info(`Voucher renewed: ${voucher.id}`);
  }
}

/**
 * Processa falha de pagamento de invoice
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.error(`Invoice payment failed: ${invoice.id}`);

  if (!invoice.subscription) return;

  // Buscar voucher associado
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

    // Notificar usuário sobre pagamento falhado
    // await sendPaymentFailedEmail(voucher.data().userId);
  }
}

/**
 * Calcula data de expiração do voucher
 */
function calculateExpiryDate(voucherType: VoucherType): Date {
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
