import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { 
  aiChatSchema, 
  parseAndValidate, 
  validateMessagesForInjection, 
  validateTokenLimit,
  errorResponse 
} from '../_shared/validation.ts';

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

    // Validate input schema
    const { data, error: validationError } = await parseAndValidate(req, aiChatSchema, corsHeaders);
    if (validationError) {
      return validationError;
    }

    const { messages } = data;

    // Check for prompt injection
    const injectionCheck = validateMessagesForInjection(messages);
    if (!injectionCheck.valid) {
      return errorResponse(injectionCheck.error!, 400, corsHeaders);
    }

    // Validate token limit
    const tokenCheck = validateTokenLimit(messages, 8000);
    if (!tokenCheck.valid) {
      return errorResponse(tokenCheck.error!, 400, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurado");
      return errorResponse("Erro de configuração do servidor", 500, corsHeaders);
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
        return errorResponse(
          "Limite de requisições excedido. Tente novamente em alguns instantes.",
          429,
          corsHeaders
        );
      }
      if (response.status === 402) {
        return errorResponse(
          "Créditos insuficientes. Entre em contato com o suporte.",
          402,
          corsHeaders
        );
      }
      console.error("Erro no gateway AI:", response.status);
      return errorResponse("Erro ao processar requisição", 500, corsHeaders);
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
    return errorResponse("Erro ao processar requisição", 500, corsHeaders);
  }
});
