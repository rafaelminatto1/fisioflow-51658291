import { Hono } from "hono";
import { retrieveClinicalContext } from "../../lib/ai/ragClinicalContext";
import { buildClinicalContextPrompt } from "../../lib/ai/clinicalContextBuilder";
import { AIRouter } from "../../lib/ai/aiRouter";

const app = new Hono<{ Bindings: any }>();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { organizationId, patientId, query } = body;

    if (!organizationId || !patientId || !query) {
      return c.json({ error: "organizationId, patientId e query são obrigatórios." }, 400);
    }

    // 1. Semantic Retrieval (pgvector)
    const retrievedContext = await retrieveClinicalContext(c.env, null /* pass db instance */, {
      organizationId,
      patientId,
      query,
      topK: 5
    });

    // 2. Monta o Prompt de Contexto
    const finalPrompt = buildClinicalContextPrompt(query, retrievedContext);
    
    let answer = "";
    let requiresHumanReview = true; // Por padrão exige revisão
    let confidenceScore = retrievedContext.length > 0 ? retrievedContext[0].similarity : 0;
    
    if (retrievedContext.length === 0) {
      answer = "Não há informação suficiente salva no histórico clínico para responder a essa pergunta.";
      requiresHumanReview = false;
    } else {
      // 3. Envia para o AI Router (onde a LGPD sanitization, cost e fallback ocorrem)
      const router = new AIRouter({
        env: c.env,
        organizationId,
        userId: body.userId || "system",
        patientId,
        taskType: "rag_answer" 
        // Em rag_answer, o level é "none" ou "minimal", pois os próprios chunks (clinicalNotes)
        // já devem ter sido higienizados antes do embedding. 
      });
      
      const model = c.env.AI_DEFAULT_CHEAP_MODEL || "@cf/meta/llama-3-8b-instruct";
      answer = await router.run(finalPrompt, model);
    }

    return c.json({
      answer,
      retrievedContext,
      internalSources: retrievedContext.map(ctx => ctx.evolutionId),
      confidenceScore,
      warnings: [],
      requiresHumanReview
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
