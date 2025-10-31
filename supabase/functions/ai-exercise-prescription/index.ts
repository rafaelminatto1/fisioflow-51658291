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
    const { patientId } = await req.json();
    
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

    // Buscar patologias
    const { data: pathologies } = await supabase
      .from("patient_pathologies")
      .select("*")
      .eq("patient_id", patientId);

    // Buscar últimos SOAP records
    const { data: soapRecords } = await supabase
      .from("soap_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("record_date", { ascending: false })
      .limit(3);

    // Buscar medições recentes
    const { data: measurements } = await supabase
      .from("evolution_measurements")
      .select("*")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(5);

    // Buscar exercícios já prescritos
    const { data: currentExercises } = await supabase
      .from("patient_exercises")
      .select("exercises(name, description)")
      .eq("patient_id", patientId)
      .limit(10);

    const systemPrompt = `Você é um fisioterapeuta especialista em prescrição de exercícios terapêuticos.
Analise o histórico do paciente e prescreva exercícios baseados em evidências científicas.
Seja específico com repetições, séries, frequência e progressão.`;

    const userPrompt = `
PACIENTE: ${patient?.name}
IDADE: ${patient?.birth_date ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear() : "N/A"}

CONDIÇÕES/PATOLOGIAS:
${pathologies?.map(p => `- ${p.pathology_name} (${p.severity || "não especificado"})`).join("\n") || "Não especificado"}

HISTÓRICO RECENTE (SOAP):
${soapRecords?.map(s => `
Data: ${s.record_date}
Subjetivo: ${s.subjective || "N/A"}
Objetivo: ${s.objective || "N/A"}
Avaliação: ${s.assessment || "N/A"}
`).join("\n---\n") || "Sem histórico"}

MEDIÇÕES FUNCIONAIS:
${measurements?.map(m => `${m.measurement_name}: ${m.value} ${m.unit || ""}`).join("\n") || "Sem medições"}

EXERCÍCIOS ATUAIS:
${currentExercises?.map(e => e.exercises?.name).join(", ") || "Nenhum exercício prescrito"}

PRESCREVA:
1. Protocolo de Exercícios Personalizados (5-7 exercícios)
   Para cada exercício inclua:
   - Nome do exercício
   - Objetivo terapêutico
   - Descrição técnica detalhada
   - Repetições e séries
   - Frequência semanal
   - Progressão (quando aumentar dificuldade)
   - Precauções e contraindicações
   
2. Ordem de execução ideal
3. Tempo total estimado de sessão
4. Critérios de progressão para próxima fase
5. Sinais de alerta que exigem pausa

Formato: JSON estruturado
`;

    // Chamar Lovable AI com tool calling para resposta estruturada
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
        tools: [
          {
            type: "function",
            function: {
              name: "prescribe_exercises",
              description: "Prescrever protocolo de exercícios terapêuticos",
              parameters: {
                type: "object",
                properties: {
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        objective: { type: "string" },
                        description: { type: "string" },
                        sets: { type: "number" },
                        reps: { type: "string" },
                        frequency: { type: "string" },
                        progression: { type: "string" },
                        precautions: { type: "string" }
                      },
                      required: ["name", "objective", "description", "sets", "reps", "frequency"]
                    }
                  },
                  execution_order: { type: "string" },
                  total_time: { type: "string" },
                  progression_criteria: { type: "string" },
                  warning_signs: { type: "string" }
                },
                required: ["exercises", "total_time"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "prescribe_exercises" } },
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    const prescription = JSON.parse(toolCall.function.arguments);

    // Salvar prescrição
    await supabase.from("ai_exercise_prescriptions").insert({
      patient_id: patientId,
      prescription_data: prescription,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ prescription }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao prescrever exercícios:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
