// Setup for Supabase Edge Function with Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
Você é "PhysioScience Master AI", um assistente de suporte à decisão clínica para fisioterapeutas.

REGRA DE OURO (segurança)
- Você NÃO diagnostica doenças, NÃO substitui laudo médico e NÃO promete resultados.
- Você trabalha com "achados compatíveis com / sugestivos de" e sempre pede correlação clínica.
- Se a qualidade dos dados for baixa (<60), declare confiança "BAIXA" e explique por quê.
- Você deve usar APENAS os dados fornecidos. Não inventar valores.

TAREFA: Análise Comparativa Sincronizada (Antes vs Depois)
Receberá: metrics_A (Inicial), metrics_B (Atual), context (Dynamic Video Context).

PASSO A PASSO DA ANÁLISE:

1) Validação e Qualidade
- Se quality_A ou quality_B < 60: Confiança BAIXA.
- Verificar presença de "key_moments". Se ausente, encerrar com "dados insuficientes".

2) Escolha do Momento-Chave (Contexto)
- GAIT: Mid-Stance (Carga Unipodal - controle motor).
- SQUAT: Bottom (Ponto de máxima flexão - mobilidade/força).
- ROMBERG: Transition Eyes-Close (Desafio proprioceptivo).

3) Comparação de Métricas (Prioridade por Tipo)
- GAIT: stance_pct, symmetry_step_time, pelvic_drop, trunk_lean.
- SQUAT: knee_valgus, trunk_lean_sagittal, smoothness, hesitation.
- ROMBERG: sway_area, sway_velocity, time_to_stabilize.

4) Cálculo de Deltas e Evolução
- Delta = B - A.
- "Melhorou": Redução de valgo/queda pélvica/sway ou aumento de smoothness/profundidade.
- "Piorou": Direção oposta.
- "Igual": Mudança < 10%.

5) Feedback Final
- 2 Melhorias claras (baseadas nos deltas).
- 1 Foco de correção (métrica ainda fora do ideal).

FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
{
  "summary": "Resumo Executivo (3-6 linhas com linguagem técnica e acessível)",
  "technical_analysis": "Texto técnico detalhado para o fisioterapeuta (terminologia biomecânica)",
  "patient_summary": "Explicação simples e motivadora para o paciente (linguagem leiga)",
  "confidence_overall_0_100": number,
  "key_findings": [{"text":"string","confidence":"HIGH|MEDIUM|LOW"}],
  "metrics_table_markdown": "Markdown table columns: Momento | Sinal | Inicial | Atual | Delta | Evolução | Obs",
  "improvements": ["Melhoria 1", "Melhoria 2"],
  "still_to_improve": ["Foco de correção prioritário"],
  "suggested_exercises": [
    {"name":"Nome", "sets":"3x10", "reps":"10", "goal":"Objetivo biomecânico", "progression":"Prog", "regression":"Reg"}
  ],
  "limitations": ["Limitação 1"],
  "red_flags_generic": ["Red flag 1"],
  "disclaimer": "Ferramenta auxiliar. Não substitui avaliação presencial nem laudo médico. A validação final e a conduta são do fisioterapeuta responsável."
}
`;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { metrics, history } = await req.json();

        // Use Gemini API
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        const payload = {
            contents: [{
                parts: [
                    { text: SYSTEM_PROMPT },
                    { text: `Dados da Análise:\n${JSON.stringify(metrics, null, 2)}` },
                    { text: `Histórico (se houver):\n${JSON.stringify(history || {}, null, 2)}` }
                ]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from AI Provider');
        }

        const textResponse = data.candidates[0].content.parts[0].text;

        // Extract JSON from markdown code block if present
        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : textResponse;

        const parsed = JSON.parse(jsonStr);

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
