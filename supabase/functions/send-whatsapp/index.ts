import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message } = await req.json();
    
    // Validação básica
    if (!to || !message) {
      throw new Error("Telefone e mensagem são obrigatórios");
    }

    // TODO: Integrar com API do WhatsApp Business
    // Por enquanto, apenas simula o envio
    console.log(`Enviando mensagem WhatsApp para ${to}:`, message);
    
    // Simulação de sucesso
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Mensagem enviada com sucesso",
        to,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
