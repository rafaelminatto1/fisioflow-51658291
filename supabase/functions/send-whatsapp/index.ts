import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { parseAndValidate, errorResponse } from '../_shared/validation.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { captureException, captureMessage } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const whatsappMessageSchema = z.object({
  to: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(20, 'Telefone muito longo'),
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(4096, 'Mensagem muito longa (máx 4096 caracteres)'),
  templateKey: z.string().optional(),
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'send-whatsapp');
    if (!rateLimitResult.allowed) {
      await captureMessage(`Rate limit excedido para send-whatsapp: ${rateLimitResult.current_count}/${rateLimitResult.limit}`, 'warning');
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Validate input
    const { data, error: validationError } = await parseAndValidate(req, whatsappMessageSchema, corsHeaders);
    if (validationError) {
      return validationError;
    }

    const { to, message } = data;

    // Obter credenciais do WhatsApp Business API
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      await captureException(new Error('Credenciais do WhatsApp Business não configuradas'), { function: 'send-whatsapp' });
      return errorResponse('Credenciais do WhatsApp Business não configuradas', 500, corsHeaders);
    }

    // Formatar número de telefone (remover caracteres especiais)
    const formattedPhone = to.replace(/\D/g, '');
    
    await captureMessage(`Enviando mensagem WhatsApp para ${formattedPhone}`, 'info');

    // Chamar API do WhatsApp Business
    const whatsappResponse = await fetch(
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
          text: {
            preview_url: false,
            body: message
          }
        }),
      }
    );

    const responseData = await whatsappResponse.json();
    
    if (!whatsappResponse.ok) {
      const error = new Error(responseData.error?.message || 'Erro ao enviar mensagem via WhatsApp');
      await captureException(error, { function: 'send-whatsapp', responseData });
      throw error;
    }

    await captureMessage('Mensagem WhatsApp enviada com sucesso', 'info', { messageId: responseData.messages?.[0]?.id });
    
    const enhancedHeaders = addRateLimitHeaders(
      { ...corsHeaders, 'Content-Type': 'application/json' },
      rateLimitResult
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Mensagem enviada com sucesso",
        to: formattedPhone,
        messageId: responseData.messages?.[0]?.id,
        timestamp: new Date().toISOString()
      }),
      {
        headers: enhancedHeaders,
      }
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'send-whatsapp' });
    return errorResponse(err.message || 'Erro ao enviar mensagem WhatsApp', 500, corsHeaders);
  }
});
