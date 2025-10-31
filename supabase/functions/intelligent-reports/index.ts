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
    const { patientId, reportType, dateRange } = await req.json();
    
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

    // Buscar appointments no período
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId)
      .gte("start_time", dateRange.start)
      .lte("start_time", dateRange.end)
      .order("start_time", { ascending: false });

    // Buscar SOAP records
    const { data: soapRecords } = await supabase
      .from("soap_records")
      .select("*")
      .eq("patient_id", patientId)
      .gte("record_date", dateRange.start)
      .lte("record_date", dateRange.end)
      .order("record_date", { ascending: false });

    // Buscar medições
    const { data: measurements } = await supabase
      .from("evolution_measurements")
      .select("*")
      .eq("patient_id", patientId)
      .gte("measured_at", dateRange.start)
      .lte("measured_at", dateRange.end)
      .order("measured_at", { ascending: false });

    // Buscar gamificação
    const { data: gamification } = await supabase
      .from("patient_gamification")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    let systemPrompt = `Você é um especialista em fisioterapia e geração de relatórios médicos profissionais.
Crie um relatório detalhado, técnico e baseado em evidências científicas.
Use linguagem médica apropriada e estrutura profissional.`;

    let userPrompt = `
RELATÓRIO ${reportType.toUpperCase()}

DADOS DO PACIENTE:
Nome: ${patient?.name}
ID: ${patient?.id}
Período: ${dateRange.start} a ${dateRange.end}

HISTÓRICO DE ATENDIMENTOS:
Total de sessões: ${appointments?.length || 0}
${appointments?.map(a => `- ${a.start_time}: ${a.status}`).join("\n") || "Sem atendimentos"}

EVOLUÇÃO CLÍNICA (SOAP):
${soapRecords?.map(s => `
Data: ${s.record_date}
Subjetivo: ${s.subjective || "N/A"}
Objetivo: ${s.objective || "N/A"}
Avaliação: ${s.assessment || "N/A"}
Plano: ${s.plan || "N/A"}
`).join("\n---\n") || "Sem registros SOAP"}

MEDIÇÕES E PROGRESSÃO:
${measurements?.map(m => `${m.measurement_name}: ${m.value} ${m.unit || ""} (${m.measured_at})`).join("\n") || "Sem medições"}

GAMIFICAÇÃO E ENGAJAMENTO:
${gamification ? `
Nível: ${gamification.level}
XP Total: ${gamification.total_xp}
Streak atual: ${gamification.current_streak} dias
Melhor streak: ${gamification.best_streak} dias
Conquistas: ${gamification.achievements?.length || 0}
` : "Sem dados de gamificação"}

Gere um relatório profissional completo incluindo:
1. Resumo Executivo
2. Histórico de Tratamento
3. Análise de Evolução Funcional
4. Resultados Objetivos e Medições
5. Análise de Aderência ao Tratamento
6. Prognóstico e Recomendações
7. Considerações Finais

Formato: Markdown profissional com seções bem estruturadas.
`;

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
    const report = aiData.choices[0].message.content;

    // Salvar relatório no banco
    const { data: savedReport } = await supabase
      .from("generated_reports")
      .insert({
        patient_id: patientId,
        report_type: reportType,
        content: report,
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
        generated_by: req.headers.get("authorization")?.split(" ")[1] || null,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ report, reportId: savedReport?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
