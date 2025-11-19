import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { audioData, patientId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Remove base64 prefix if present
    const base64Audio = audioData.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));

    // Step 1: Transcribe audio using Gemini
    const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: base64Audio,
        model: 'google/gemini-2.5-flash', // Using flash for speed
      }),
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Erro na transcrição:', errorText);
      throw new Error('Erro ao transcrever áudio');
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcribedText = transcriptionData.text || '';

    // Step 2: Structure transcription into SOAP format using Gemini
    const structureResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em estruturar notas de fisioterapia no formato SOAP.
            
Analise a transcrição fornecida e organize em 4 seções:

1. **Subjetivo (S)**: Queixas, sintomas e histórico relatado pelo paciente
2. **Objetivo (O)**: Observações físicas, testes, medições e avaliações realizadas
3. **Avaliação (A)**: Análise, diagnóstico funcional e progresso
4. **Plano (P)**: Condutas realizadas, exercícios prescritos e orientações

Retorne APENAS um JSON válido no formato:
{
  "subjective": "texto",
  "objective": "texto", 
  "assessment": "texto",
  "plan": "texto"
}`
          },
          {
            role: 'user',
            content: `Transcrição da sessão: "${transcribedText}"`
          }
        ],
      }),
    });

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error('Erro na estruturação:', errorText);
      throw new Error('Erro ao estruturar SOAP');
    }

    const structureData = await structureResponse.json();
    const soapText = structureData.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = soapText.match(/\{[\s\S]*\}/);
    const soapData = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      subjective: transcribedText,
      objective: '',
      assessment: '',
      plan: ''
    };

    return new Response(
      JSON.stringify({
        transcription: transcribedText,
        soapData,
        patientId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});