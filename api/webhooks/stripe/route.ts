/**
 * Vercel Function for Stripe Webhooks
 * Using Node.js runtime for better crypto library support
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return jsonResponse({ error: 'No signature provided' }, 400);
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    const event = JSON.parse(body);

    // Verify signature (you'll need to implement this or use Stripe SDK)
    // For now, we'll trust the request came from Stripe
    // In production, use Stripe SDK to verify signature

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Handle successful checkout
        console.log('Checkout completed:', session.id);
        // TODO: Update database, send notifications, etc.
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        // Handle successful payment
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.failed': {
        const paymentIntent = event.data.object;
        // Handle failed payment
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        // Handle successful subscription payment
        console.log('Invoice paid:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // Handle failed subscription payment
        console.log('Invoice payment failed:', invoice.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return jsonResponse(
      {
        error: 'Webhook handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
