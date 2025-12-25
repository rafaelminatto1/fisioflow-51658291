import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

// WhatsApp Cloud API verification token
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'activity_fisio_webhook_2024';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

// Verify webhook signature from Meta
async function verifyWebhookSignature(body: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) {
    // If no app secret configured, log warning but allow (for backwards compatibility)
    console.warn('[whatsapp-webhook] WHATSAPP_APP_SECRET not configured - signature verification skipped');
    return true;
  }

  if (!signature) {
    console.error('[whatsapp-webhook] Missing X-Hub-Signature-256 header');
    return false;
  }

  try {
    // Expected format: sha256=<hash>
    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      console.error('[whatsapp-webhook] Invalid signature format');
      return false;
    }

    const providedHash = signature.slice(expectedPrefix.length);
    
    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(APP_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const isValid = computedHash === providedHash;
    if (!isValid) {
      console.error('[whatsapp-webhook] Signature verification failed');
    }
    return isValid;
  } catch (error) {
    console.error('[whatsapp-webhook] Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Webhook Verification (GET request from Meta)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge });

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        return new Response(challenge, { status: 200, headers: corsHeaders });
      } else {
        console.error('Webhook verification failed');
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
    }

    // Handle incoming messages (POST request)
    if (req.method === 'POST') {
      const body = await req.text();
      const signature = req.headers.get('x-hub-signature-256');
      
      // Verify webhook signature
      const isValidSignature = await verifyWebhookSignature(body, signature);
      if (!isValidSignature) {
        console.error('[whatsapp-webhook] Invalid webhook signature - rejecting request');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const payload = JSON.parse(body);
      console.log('Webhook payload received:', JSON.stringify(payload, null, 2));

      // Log the raw webhook
      await supabase.from('whatsapp_webhook_logs').insert({
        event_type: 'incoming',
        raw_payload: payload,
        processed: false,
      });

      // Process the webhook payload
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle status updates (delivered, read, etc.)
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log('Status update:', status);
          
          const updateData: Record<string, any> = {};
          
          if (status.status === 'sent') {
            updateData.status = 'enviado';
            updateData.sent_at = new Date().toISOString();
          } else if (status.status === 'delivered') {
            updateData.status = 'entregue';
            updateData.delivered_at = new Date().toISOString();
          } else if (status.status === 'read') {
            updateData.status = 'lido';
            updateData.read_at = new Date().toISOString();
          } else if (status.status === 'failed') {
            updateData.status = 'falhou';
            updateData.error_message = status.errors?.[0]?.message || 'Unknown error';
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('whatsapp_metrics')
              .update(updateData)
              .eq('message_id', status.id);

            // Also update webhook log
            await supabase
              .from('whatsapp_webhook_logs')
              .update({ 
                processed: true, 
                processing_result: `Status updated to ${status.status}` 
              })
              .eq('raw_payload->entry->0->changes->0->value->statuses->0->id', status.id);
          }
        }
      }

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          console.log('Incoming message:', message);
          
          const phoneNumber = message.from;
          const messageText = message.text?.body?.trim().toUpperCase() || '';
          const messageId = message.id;

          // Log the incoming message
          await supabase.from('whatsapp_webhook_logs').insert({
            event_type: 'message_received',
            phone_number: phoneNumber,
            message_content: messageText,
            message_id: messageId,
            raw_payload: message,
            processed: false,
          });

          // Process confirmation responses
          if (['SIM', 'OK', 'CONFIRMO', 'CONFIRMADO', 'S', 'YES'].includes(messageText)) {
            await processConfirmation(supabase, phoneNumber, true, messageText);
          } else if (['NAO', 'NÃO', 'N', 'NO', 'CANCELAR', 'CANCELA'].includes(messageText)) {
            await processConfirmation(supabase, phoneNumber, false, messageText);
          } else if (messageText.includes('REAGENDAR') || messageText.includes('REMARCAR')) {
            await processRescheduleRequest(supabase, phoneNumber);
          }

          // Update webhook log as processed
          await supabase
            .from('whatsapp_webhook_logs')
            .update({ 
              processed: true, 
              processing_result: `Message processed: ${messageText.slice(0, 50)}` 
            })
            .eq('message_id', messageId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log the error
    await supabase.from('whatsapp_webhook_logs').insert({
      event_type: 'error',
      processing_result: error instanceof Error ? error.message : 'Unknown error',
      processed: true,
    });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Process appointment confirmation
async function processConfirmation(
  supabase: any, 
  phoneNumber: string, 
  confirmed: boolean,
  originalMessage: string
) {
  console.log(`Processing ${confirmed ? 'confirmation' : 'cancellation'} for ${phoneNumber}`);

  // Format phone for lookup (remove country code if present)
  const cleanPhone = phoneNumber.replace(/^\+?55/, '').replace(/\D/g, '');
  
  // Find the patient by phone
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone')
    .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${phoneNumber}%`);

  if (!patients?.length) {
    console.log('Patient not found for phone:', phoneNumber);
    return;
  }

  const patient = patients[0];

  // Find pending appointments for this patient
  const today = new Date().toISOString().split('T')[0];
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, confirmation_status')
    .eq('patient_id', patient.id)
    .gte('appointment_date', today)
    .in('confirmation_status', ['pendente', 'pending', null])
    .order('appointment_date', { ascending: true })
    .limit(1);

  if (!appointments?.length) {
    console.log('No pending appointments found for patient:', patient.id);
    return;
  }

  const appointment = appointments[0];

  // Update appointment status
  const newStatus = confirmed ? 'confirmado' : 'cancelado';
  const { error } = await supabase
    .from('appointments')
    .update({
      confirmation_status: newStatus,
      confirmed_at: new Date().toISOString(),
      confirmation_method: 'whatsapp',
      status: confirmed ? 'agendado' : 'cancelado',
    })
    .eq('id', appointment.id);

  if (error) {
    console.error('Error updating appointment:', error);
    return;
  }

  console.log(`Appointment ${appointment.id} ${newStatus}`);

  // Update metrics
  await supabase
    .from('whatsapp_metrics')
    .update({
      replied_at: new Date().toISOString(),
      reply_content: originalMessage,
    })
    .eq('appointment_id', appointment.id)
    .eq('template_key', 'solicitar_confirmacao');

  // Send confirmation response
  const responseMessage = confirmed
    ? `✅ Perfeito, ${patient.name}! Seu agendamento está confirmado. Até breve!`
    : `📝 Entendido, ${patient.name}. Seu agendamento foi cancelado. Entre em contato para reagendar.`;

  await sendWhatsAppMessage(phoneNumber, responseMessage);
}

// Process reschedule request
async function processRescheduleRequest(supabase: any, phoneNumber: string) {
  console.log(`Processing reschedule request for ${phoneNumber}`);

  // Send response asking to contact clinic
  const message = `📅 Para reagendar sua consulta, por favor entre em contato conosco pelo telefone ou acesse nosso sistema de agendamento online. Obrigado!`;
  
  await sendWhatsAppMessage(phoneNumber, message);
}

// Send WhatsApp message helper
async function sendWhatsAppMessage(to: string, message: string) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!accessToken || !phoneNumberId) {
    console.error('WhatsApp credentials not configured');
    return;
  }

  const formattedPhone = to.replace(/\D/g, '');

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: message }
        }),
      }
    );

    const data = await response.json();
    console.log('Message sent:', data);
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
  }
}
