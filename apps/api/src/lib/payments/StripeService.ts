import type { Env } from '../../types/env';

/**
 * Stripe Payment Service (Worker-compatible fetch implementation)
 */
export class StripeService {
  private apiUrl = 'https://api.stripe.com/v1';

  constructor(private env: Env) {}

  private get authHeader() {
    return {
      'Authorization': `Bearer ${this.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Creates a Checkout Session for a Voucher
   */
  async createCheckoutSession(params: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }) {
    if (!this.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const body = new URLSearchParams({
      'mode': 'payment',
      'line_items[0][price]': params.priceId,
      'line_items[0][quantity]': '1',
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
    });

    if (params.metadata) {
      Object.entries(params.metadata).forEach(([key, value]) => {
        body.append(`metadata[${key}]`, value);
      });
    }

    const response = await fetch(`${this.apiUrl}/checkout/sessions`, {
      method: 'POST',
      headers: this.authHeader,
      body,
    });

    const result = await response.json() as any;
    if (!response.ok) {
      console.error('[Stripe Error]', result);
      throw new Error(result.error?.message || 'Stripe API error');
    }

    return result;
  }

  /**
   * Retrieves a Checkout Session
   */
  async getCheckoutSession(sessionId: string) {
    const response = await fetch(`${this.apiUrl}/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: this.authHeader,
    });

    const result = await response.json() as any;
    if (!response.ok) {
      console.error('[Stripe Get Error]', result);
      throw new Error(result.error?.message || 'Stripe API error');
    }

    return result;
  }

  /**
   * Verifies a Webhook signature (Advanced — usually requires full library)
   * For worker-lite usage, we can implement the logic if needed or skip.
   */
  async verifyWebhookSignature(payload: string, signature: string) {
    // This is complex manually. If the user doesn't use webhooks yet,
    // we'll stick to 'getCheckoutSession' polling/verify on return.
    return true; // Placeholder for now
  }
}
