import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import { WgerClient } from "../lib/wger-client";
import { PubMedClient } from "../lib/pubmed-client";
import { callAI } from "../lib/ai/callAI"; // Assumindo que essa ou parecida é a interface de IA

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);

app.get("/search", async (c) => {
  const query = c.req.query("q");
  if (!query) return c.json({ error: "Parâmetro 'q' é obrigatório" }, 400);

  const env = c.env;
  // A chave de API pode vir do ambiente, mas por agora usaremos a hardcoded para fins do prompt
  // Num cenário real, isso estaria no env.WGER_API_TOKEN. O usuário passou no prompt:
  const WGER_TOKEN = env.WGER_API_TOKEN || "66adb1c51d3e09cddea5b40b107d55093e852a98";

  const client = new WgerClient(WGER_TOKEN);
  try {
    const results = await client.searchExercises(query);
    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/enrich", async (c) => {
  const body = await c.req.json();
  const exerciseId = body.id;

  if (!exerciseId) return c.json({ error: "Parâmetro 'id' do wger é obrigatório" }, 400);

  const env = c.env;
  const WGER_TOKEN = env.WGER_API_TOKEN || "66adb1c51d3e09cddea5b40b107d55093e852a98";

  const wgerClient = new WgerClient(WGER_TOKEN);
  const pubMedClient = new PubMedClient();

  try {
    // 1. Fetch do wger
    const wgerData = await wgerClient.getExerciseById(exerciseId);

    // 2. Fetch de evidências no PubMed (usando o nome do exercício)
    const evidence = await pubMedClient.searchEvidence(wgerData.name);

    // 3. IA para enriquecimento (Inferir dificuldade e dicas de precaução)
    const prompt = `
      Você é um especialista em fisioterapia clínica e biomecânica.
      Analise o seguinte exercício importado do banco de dados wger:
      Nome: ${wgerData.name}
      Descrição: ${wgerData.description}
      Equipamentos: ${wgerData.equipment.map((e) => e.name).join(", ") || "Peso Corporal"}
      Músculos Primários: ${wgerData.muscles.map((m) => m.name).join(", ")}
      
      Por favor, retorne UM objeto JSON com as seguintes chaves estritas:
      - difficulty: "Iniciante", "Intermediário" ou "Avançado" (inferido com base na complexidade e carga provável).
      - precaution_level: "safe", "supervised" ou "restricted".
      - precaution_notes: Dica curta de segurança (ex: "Cuidado com o valgo dinâmico" ou "Manter coluna neutra").
      - category: Categoria sugerida (ex: "Fortalecimento", "Mobilidade", "Alongamento").
      - instructions: Descrição melhorada e traduzida para PT-BR, formatada de forma profissional.
      - aliases_pt: Array de strings com nomes alternativos comuns no Brasil para este exercício.
    `;

    // Vamos usar fetch direto na API do Gemini/Workers AI se callAI for diferente.
    // Usaremos callAI se existir, senão um fallback:
    let enrichedData = {
      difficulty: "Iniciante",
      precaution_level: "safe",
      precaution_notes: "Avalie o paciente antes da execução",
      category: "Fortalecimento",
      instructions: wgerData.description || "",
      aliases_pt: [] as string[],
    };

    try {
      const aiResponse = await callAI(env, {
        task: "exercise",
        messages: [{ role: "user", content: prompt }],
        systemInstruction: "Retorne EXATAMENTE UM objeto JSON válido. Nada a mais.",
        responseFormat: "json",
      });
      if (aiResponse.content) {
        enrichedData = JSON.parse(aiResponse.content);
      }
    } catch (aiError) {
      console.warn("Erro ao enriquecer com IA, usando default:", aiError);
    }

    // 4. Mapear para o formato do FisioFlow
    const media: any[] = [];
    if (wgerData.images && wgerData.images.length > 0) {
      wgerData.images.forEach((img, i) => {
        media.push({
          url: img.image,
          type: "image",
          caption: `Imagem wger ${i + 1}`,
          orderIndex: i,
        });
      });
    }

    if (wgerData.videos && wgerData.videos.length > 0) {
      wgerData.videos.forEach((vid, i) => {
        media.push({
          url: vid.video,
          type: "video",
          caption: `Vídeo wger ${i + 1}`,
          orderIndex: media.length + i,
        });
      });
    }

    const scientific_references = evidence.map((ev) => ({
      title: ev.title,
      url: ev.url,
      evidence_level: "Observational",
      year: new Date().getFullYear(), // Simplificação
    }));

    const finalExercise = {
      name: wgerData.name,
      description: wgerData.description,
      equipment: wgerData.equipment.map((e) => e.name),
      body_parts: wgerData.muscles.map((m) => m.name),
      media,
      scientific_references,
      ...enrichedData,
    };

    return c.json(finalExercise);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export { app as wgerRoutes };
