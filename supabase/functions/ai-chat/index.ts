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
    const rateLimitResult = await checkRateLimit(req, 'ai-chat');
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido para ai-chat: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurado");
    }

    const systemPrompt = `Você é um assistente especializado em fisioterapia da Activity Fisioterapia. 

Suas responsabilidades:
- Fornecer orientações sobre exercícios e tratamentos fisioterapêuticos
- Explicar condições musculoesqueléticas de forma clara
- Sugerir exercícios apropriados para diferentes condições
- Orientar sobre prevenção de lesões
- Explicar técnicas de reabilitação

Diretrizes importantes:
- Sempre reforce que suas orientações são informativas e não substituem avaliação presencial
- Use linguagem acessível mas tecnicamente correta
- Seja empático e acolhedor
- Para casos graves ou dor intensa, sempre recomende avaliação médica urgente
- Forneça recomendações práticas e aplicáveis
- Explique os benefícios de cada exercício ou técnica

Tom: Profissional, acolhedor e educativo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("Erro no gateway AI:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Adicionar headers de rate limit na resposta
    const enhancedHeaders = addRateLimitHeaders(
      { ...corsHeaders, "Content-Type": "text/event-stream" },
      rateLimitResult
    );

    return new Response(response.body, {
      headers: enhancedHeaders,
    });
  } catch (e) {
    console.error("Erro no chat:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
