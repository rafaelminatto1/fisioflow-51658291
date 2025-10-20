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

    // TODO: Integrar com API do WhatsApp Business
    // Por enquanto, apenas simula o envio
    console.log(`Enviando mensagem WhatsApp para ${to}:`, message);
    
    // Simulação de sucesso
    // Adicionar headers de rate limit
    const enhancedHeaders = addRateLimitHeaders(
      { ...corsHeaders, 'Content-Type': 'application/json' },
      rateLimitResult
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Mensagem enviada com sucesso",
        to,
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
