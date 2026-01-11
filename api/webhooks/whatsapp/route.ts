/**
 * Vercel Function for WhatsApp Webhooks
 * Using Node.js runtime for better performance and library support
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

function textResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    // Verify webhook - WhatsApp sends a GET request first
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      return textResponse(challenge || '');
    }

    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Verify webhook signature if needed
      // const signature = req.headers.get('x-hub-signature');

      // Process webhook events
      if (body.object === 'page') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              const messages = change.value.messages;
              for (const message of messages) {
                // Process incoming message
                console.log('Received message:', message);

                // TODO: Process message, send auto-reply, etc.
                // You can call Supabase functions or other services here
              }
            }
          }
        }

        return jsonResponse({ received: true });
      }

      return jsonResponse({ received: true });
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return jsonResponse(
        {
          error: 'Webhook handler failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
