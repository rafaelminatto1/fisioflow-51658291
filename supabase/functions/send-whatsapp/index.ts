import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'send-whatsapp');
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido para send-whatsapp: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { to, message } = await req.json();
    
    // Validação básica
    if (!to || !message) {
      throw new Error("Telefone e mensagem são obrigatórios");
    }

    // Obter credenciais do WhatsApp Business API
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      console.error('Credenciais do WhatsApp Business não configuradas');
      throw new Error("Credenciais do WhatsApp Business não configuradas");
    }

    // Formatar número de telefone (remover caracteres especiais)
    const formattedPhone = to.replace(/\D/g, '');
    
    console.log(`Enviando mensagem WhatsApp para ${formattedPhone}`);

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
      console.error('Erro da API WhatsApp:', responseData);
      throw new Error(responseData.error?.message || 'Erro ao enviar mensagem via WhatsApp');
    }

    console.log('Mensagem enviada com sucesso:', responseData);
    
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
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
