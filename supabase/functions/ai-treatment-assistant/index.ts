import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, action } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do paciente
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    // Buscar histórico SOAP
    const { data: soapRecords } = await supabase
      .from("soap_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Buscar patologias
    const { data: pathologies } = await supabase
      .from("patient_pathologies")
      .select("*")
      .eq("patient_id", patientId);

    // Buscar medições recentes
    const { data: measurements } = await supabase
      .from("evolution_measurements")
      .select("*")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(10);

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "suggest_treatment") {
      systemPrompt = `Você é um assistente de IA especializado em fisioterapia. 
Analise o histórico do paciente e sugira condutas baseadas em evidências científicas.
Seja específico, prático e considere a progressão do tratamento.`;

      userPrompt = `
PACIENTE: ${patient?.name}
CONDIÇÕES: ${pathologies?.map(p => p.pathology_name).join(", ") || "Não especificado"}

HISTÓRICO RECENTE (SOAP):
${soapRecords?.map(s => `
Data: ${s.record_date}
Subjetivo: ${s.subjective || "N/A"}
Objetivo: ${s.objective || "N/A"}
Avaliação: ${s.assessment || "N/A"}
Plano: ${s.plan || "N/A"}
`).join("\n---\n") || "Sem histórico"}

MEDIÇÕES RECENTES:
${measurements?.map(m => `${m.measurement_name}: ${m.value} ${m.unit || ""} (${m.measured_at})`).join("\n") || "Sem medições"}

Com base nestes dados, sugira:
1. Conduta fisioterapêutica recomendada
2. Exercícios específicos (3-5)
3. Parâmetros de progressão
4. Alertas ou precauções
5. Tempo estimado de tratamento
`;
    } else if (action === "predict_adherence") {
      systemPrompt = `Você é um assistente de IA especializado em análise preditiva de aderência ao tratamento.
Avalie o risco de abandono do tratamento baseado nos dados do paciente.`;

      userPrompt = `
PACIENTE: ${patient?.name}
SESSÕES REGISTRADAS: ${soapRecords?.length || 0}
CONDIÇÕES: ${pathologies?.map(p => p.pathology_name).join(", ") || "Não especificado"}

HISTÓRICO DE PRESENÇA:
${soapRecords?.map(s => `Data: ${s.record_date}`).join("\n") || "Sem histórico"}

Analise e retorne:
1. Risco de abandono (Baixo/Médio/Alto)
2. Fatores de risco identificados
3. Recomendações para melhorar aderência
4. Estratégias de engajamento
`;
    } else if (action === "generate_report") {
      systemPrompt = `Você é um assistente de IA especializado em elaboração de relatórios médicos.
Crie um relatório profissional e detalhado do progresso do paciente.`;

      userPrompt = `
PACIENTE: ${patient?.name}
CONDIÇÕES: ${pathologies?.map(p => p.pathology_name).join(", ") || "Não especificado"}

EVOLUÇÃO DO TRATAMENTO:
${soapRecords?.map(s => `
Data: ${s.record_date}
Subjetivo: ${s.subjective || "N/A"}
Objetivo: ${s.objective || "N/A"}
Avaliação: ${s.assessment || "N/A"}
Plano: ${s.plan || "N/A"}
`).join("\n---\n") || "Sem histórico"}

MEDIÇÕES:
${measurements?.map(m => `${m.measurement_name}: ${m.value} ${m.unit || ""}`).join("\n") || "Sem medições"}

Gere um relatório profissional incluindo:
1. Resumo do caso
2. Evolução clínica
3. Progressão funcional
4. Resultados objetivos
5. Prognóstico e recomendações
`;
    }

    // Chamar Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0].message.content;

    // Salvar sugestão no banco para histórico
    await supabase.from("ai_suggestions").insert({
      patient_id: patientId,
      action_type: action,
      suggestion_text: suggestion,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no assistente de IA:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
