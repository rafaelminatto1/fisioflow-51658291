import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

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

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }
});

// ========== HANDLERS ==========

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const patientId = metadata.patient_id;
  const packageId = metadata.package_id;
  const organizationId = metadata.organization_id;

  if (!patientId) {
    console.error('Missing patient_id in checkout metadata');
    return;
  }

  // Criar registro de pagamento
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      patient_id: patientId,
      amount: (session.amount_total || 0) / 100,
      status: 'completed',
      method: 'credit_card',
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent as string,
      paid_at: new Date().toISOString(),
      organization_id: organizationId,
    })
    .select()
    .single();

  if (paymentError) {
    console.error('Error creating payment:', paymentError);
    return;
  }

  // Se for compra de pacote
  if (packageId) {
    const { data: pkg } = await supabase
      .from('session_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkg) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);

      await supabase.from('patient_packages').insert({
        patient_id: patientId,
        package_id: packageId,
        sessions_purchased: pkg.sessions_count,
        sessions_used: 0,
        price_paid: pkg.price,
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        organization_id: organizationId,
      });
    }
  }

  // Criar transação financeira
  await supabase.from('transactions').insert({
    payment_id: payment.id,
    patient_id: patientId,
    type: 'income',
    amount: (session.amount_total || 0) / 100,
    method: 'credit_card',
    description: packageId ? 'Compra de pacote de sessões' : 'Pagamento de sessão',
    organization_id: organizationId,
  });

  console.log(`Checkout completed for patient ${patientId}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  
  // Atualizar status do pagamento se existir
  if (metadata.payment_id) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', metadata.payment_id);
  }

  console.log(`Payment succeeded: ${paymentIntent.id}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  
  if (metadata.payment_id) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        error_message: paymentIntent.last_payment_error?.message,
      })
      .eq('id', metadata.payment_id);
  }

  // Notificar paciente
  if (metadata.patient_id) {
    await notifyPatient(metadata.patient_id, 'payment_failed', {
      message: 'Seu pagamento falhou. Por favor, tente novamente.',
    });
  }

  console.log(`Payment failed: ${paymentIntent.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Buscar paciente pelo customer_id
  const { data: patient } = await supabase
    .from('patients')
    .select('id, organization_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (patient) {
    await supabase.from('payments').insert({
      patient_id: patient.id,
      amount: (invoice.amount_paid || 0) / 100,
      status: 'completed',
      method: 'credit_card',
      stripe_invoice_id: invoice.id,
      paid_at: new Date().toISOString(),
      organization_id: patient.organization_id,
    });
  }

  console.log(`Invoice paid: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (patient) {
    await notifyPatient(patient.id, 'invoice_failed', {
      message: 'Falha no pagamento da fatura. Por favor, atualize seus dados de pagamento.',
    });
  }

  console.log(`Invoice payment failed: ${invoice.id}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const { data: patient } = await supabase
    .from('patients')
    .select('id, organization_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (patient) {
    await supabase
      .from('patient_subscriptions')
      .upsert({
        patient_id: patient.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        organization_id: patient.organization_id,
      }, {
        onConflict: 'stripe_subscription_id',
      });
  }

  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (patient) {
    await supabase
      .from('patient_subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id);

    await notifyPatient(patient.id, 'subscription_canceled', {
      message: 'Sua assinatura foi cancelada.',
    });
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

// ========== HELPERS ==========

async function notifyPatient(
  patientId: string,
  eventType: string,
  data: Record<string, any>
) {
  // Buscar dados do paciente
  const { data: patient } = await supabase
    .from('patients')
    .select('name, phone, email, organization_id')
    .eq('id', patientId)
    .single();

  if (!patient) return;

  // Criar notificação no banco
  await supabase.from('notifications').insert({
    patient_id: patientId,
    type: eventType,
    title: getTitleForEvent(eventType),
    message: data.message,
    organization_id: patient.organization_id,
  });

  // Enviar WhatsApp se configurado
  if (patient.phone) {
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          phone: patient.phone,
          message: data.message,
          patient_id: patientId,
          organization_id: patient.organization_id,
        }),
      });
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  }
}

function getTitleForEvent(eventType: string): string {
  const titles: Record<string, string> = {
    payment_failed: 'Pagamento Falhou',
    invoice_failed: 'Fatura Pendente',
    subscription_canceled: 'Assinatura Cancelada',
  };
  return titles[eventType] || 'Notificação';
}

