import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helper
function validateConductPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido' }
  }
  
  if (!payload.subjective || typeof payload.subjective !== 'string' || payload.subjective.length > 2000) {
    return { valid: false, error: 'subjective é obrigatório (máximo 2000 caracteres)' }
  }
  
  if (!payload.objective || typeof payload.objective !== 'string' || payload.objective.length > 2000) {
    return { valid: false, error: 'objective é obrigatório (máximo 2000 caracteres)' }
  }
  
  if (payload.patientHistory && (typeof payload.patientHistory !== 'string' || payload.patientHistory.length > 5000)) {
    return { valid: false, error: 'patientHistory deve ter no máximo 5000 caracteres' }
  }
  
  if (payload.pathology && (typeof payload.pathology !== 'string' || payload.pathology.length > 200)) {
    return { valid: false, error: 'pathology deve ter no máximo 200 caracteres' }
  }
  
  return { valid: true }
}

// Generic error response for security
function safeErrorResponse(requestId: string) {
  return new Response(
    JSON.stringify({ 
      error: 'Erro ao processar requisição. Tente novamente mais tarde.',
      requestId 
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID()

  try {
    // Parse and validate payload
    let payload
    try {
      payload = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validation = validateConductPayload(payload)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { subjective, objective, patientHistory, pathology } = payload
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('[ai-suggest-conduct] Missing API key:', {
        requestId,
        timestamp: new Date().toISOString()
      })
      return safeErrorResponse(requestId)
    }

    const systemPrompt = `Você é um fisioterapeuta especialista com vasta experiência clínica.
Com base nas informações fornecidas, sugira uma conduta terapêutica completa e personalizada.

Sua sugestão deve incluir:
1. **Técnicas Manuais**: Mobilizações, manipulações, liberação miofascial
2. **Exercícios Terapêuticos**: Específicos para a condição, com séries e repetições
3. **Modalidades**: Recursos eletrotermofototerapêuticos se apropriado
4. **Orientações**: Cuidados, precauções e atividades a evitar
5. **Progressão**: Como evoluir o tratamento nas próximas sessões

Seja específico, técnico e baseado em evidências científicas atuais.
Use linguagem profissional mas clara.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `**Informações do Paciente:**

**Subjetivo:** ${subjective}

**Objetivo:** ${objective}

**Patologia:** ${pathology || 'Não especificada'}

**Histórico Relevante:** ${patientHistory || 'Sem histórico adicional'}

Sugira uma conduta terapêutica completa para esta sessão.`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('[ai-suggest-conduct] API error:', {
        requestId,
        status: response.status,
        timestamp: new Date().toISOString()
      })
      return safeErrorResponse(requestId)
    }

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ suggestion }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[ai-suggest-conduct] Unexpected error:', {
      requestId,
      error,
      timestamp: new Date().toISOString()
    })
    return safeErrorResponse(requestId)
  }
});
