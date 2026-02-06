/**
 * Stripe Integration
 * Integração real com Stripe Payments API
 */

import Stripe from 'stripe';
import {

  CheckoutSession,
  Customer,
  Subscription,
  Invoice,
  WebhookEvent,
} from '@/types/integrations';

// ============================================================================
// Cliente Stripe
// ============================================================================

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
}

// ============================================================================
// Customer Operations
// ============================================================================

/**
 * Cria ou busca cliente Stripe
 */
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  fisioflowUserId: string,
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Customer> {
  // Buscar cliente existente
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return {
      id: existingCustomers.data[0].id,
      fisioflow_user_id: fisioflowUserId,
      email: existingCustomers.data[0].email || '',
      name: existingCustomers.data[0].name || undefined,
      created_at: new Date(existingCustomers.data[0].created * 1000),
    };
  }

  // Criar novo cliente
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      fisioflow_user_id: fisioflowUserId,
      ...metadata,
    },
  });

  return {
    id: customer.id,
    fisioflow_user_id: fisioflowUserId,
    email: customer.email || '',
    name: customer.name || undefined,
    created_at: new Date(customer.created * 1000),
  };
}

/**
 * Busca cliente por ID
 */
export async function getStripeCustomer(
  stripe: Stripe,
  customerId: string
): Promise<Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return null;
    }

    return {
      id: customer.id,
      fisioflow_user_id: customer.metadata.fisioflow_user_id || '',
      email: customer.email || '',
      name: customer.name || undefined,
      created_at: new Date(customer.created * 1000),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Checkout Sessions
// ============================================================================

/**
 * Cria sessão de checkout para pagamento avulso
 */
export async function createCheckoutSession(
  stripe: Stripe,
  params: {
    customerId: string;
    amount: number; // em centavos
    currency: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }
): Promise<CheckoutSession> {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: params.description,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });

  return {
    id: session.id,
    customer_id: session.customer as string,
    payment_status: session.payment_status,
    url: session.url || '',
    amount_total: session.amount_total || 0,
    currency: session.currency || '',
    created_at: new Date(session.created * 1000),
  };
}

/**
 * Cria sessão de checkout para assinatura
 */
export async function createSubscriptionCheckoutSession(
  stripe: Stripe,
  params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
  }
): Promise<CheckoutSession> {
  const subscriptionData: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  };

  if (params.trialPeriodDays) {
    subscriptionData.trial_period_days = params.trialPeriodDays;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId,
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: subscriptionData,
    metadata: params.metadata,
  });

  return {
    id: session.id,
    customer_id: session.customer as string,
    payment_status: session.payment_status,
    url: session.url || '',
    amount_total: session.amount_total || 0,
    currency: session.currency || '',
    created_at: new Date(session.created * 1000),
  };
}

// ============================================================================
// Subscription Operations
// ============================================================================

/**
 * Cria preço recorrente
 */
export async function createRecurringPrice(
  stripe: Stripe,
  params: {
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    intervalCount?: number;
    productName: string;
    productDescription?: string;
  }
): Promise<string> {
  const product = await stripe.products.create({
    name: params.productName,
    description: params.productDescription,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: params.amount,
    currency: params.currency,
    recurring: {
      interval: params.interval,
      interval_count: params.intervalCount || 1,
    },
  });

  return price.id;
}

/**
 * Busca assinatura
 */
export async function getSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      id: subscription.id,
      customer_id: subscription.customer as string,
      price_id: subscription.items.data[0].price.id,
      status: subscription.status as Subscription['status'],
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      created_at: new Date(subscription.created * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Cancela assinatura
 */
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string,
  atPeriodEnd: boolean = true
): Promise<void> {
  if (atPeriodEnd) {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    await stripe.subscriptions.cancel(subscriptionId);
  }
}

// ============================================================================
// Invoice Operations
// ============================================================================

/**
 * Cria invoice para pagamento fora do checkout
 */
export async function createInvoice(
  stripe: Stripe,
  params: {
    customerId: string;
    amount: number;
    currency: string;
    description: string;
    dueDays?: number;
  }
): Promise<Invoice> {
  const invoiceItem = await stripe.invoiceItems.create({
    customer: params.customerId,
    amount: params.amount,
    currency: params.currency,
    description: params.description,
  });

  const invoice = await stripe.invoices.create({
    customer: params.customerId,
    default_tax_rates: [],
    auto_advance: true,
    collection_method: 'send_invoice',
    days_until_due: params.dueDays || 7,
  });

  await stripe.invoices.sendInvoice(invoice.id);

  return {
    id: invoice.id,
    customer_id: invoice.customer as string,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    currency: invoice.currency || '',
    status: invoice.status as Invoice['status'],
    created_at: new Date(invoice.created * 1000),
  };
}

/**
 * Lista invoices de um cliente
 */
export async function getCustomerInvoices(
  stripe: Stripe,
  customerId: string,
  limit: number = 10
): Promise<Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    customer_id: invoice.customer as string,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    currency: invoice.currency || '',
    status: invoice.status as Invoice['status'],
    created_at: new Date(invoice.created * 1000),
  }));
}

// ============================================================================
// Webhook Handler
// ============================================================================

/**
 * Verifica assinatura do webhook
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stripe = require('stripe');
  const webhookEndpoint = stripe.webhooks;

  return webhookEndpoint.constructEvent(payload, signature, webhookSecret);
}

/**
 * Processa evento de webhook
 */
export async function handleWebhookEvent(
  event: Stripe.Event,
  handlers: {
    onCheckoutCompleted?: (session: Stripe.Checkout.Session) => Promise<void>;
    onInvoicePaid?: (invoice: Stripe.Invoice) => Promise<void>;
    onInvoiceFailed?: (invoice: Stripe.Invoice) => Promise<void>;
    onSubscriptionCreated?: (subscription: Stripe.Subscription) => Promise<void>;
    onSubscriptionUpdated?: (subscription: Stripe.Subscription) => Promise<void>;
    onSubscriptionDeleted?: (subscription: Stripe.Subscription) => Promise<void>;
  }
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handlers.onCheckoutCompleted?.(session);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlers.onInvoicePaid?.(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handlers.onInvoiceFailed?.(failedInvoice);
      break;
    }

    case 'customer.subscription.created': {
      const newSub = event.data.object as Stripe.Subscription;
      await handlers.onSubscriptionCreated?.(newSub);
      break;
    }

    case 'customer.subscription.updated': {
      const updatedSub = event.data.object as Stripe.Subscription;
      await handlers.onSubscriptionUpdated?.(updatedSub);
      break;
    }

    case 'customer.subscription.deleted': {
      const deletedSub = event.data.object as Stripe.Subscription;
      await handlers.onSubscriptionDeleted?.(deletedSub);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface StripeConfig {
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
  default_price_id?: string;
  trial_period_days?: number;
}
