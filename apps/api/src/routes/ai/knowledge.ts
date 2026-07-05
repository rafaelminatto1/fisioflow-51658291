import { Hono } from "hono";
import { ingestKnowledge, removeKnowledge, KnowledgeDocument } from "../../lib/ai/knowledgeIngestion";
import { searchKnowledge } from "../../lib/ai/aiSearchService";
import { AIRouter } from "../../lib/ai/aiRouter";

const app = new Hono<{ Bindings: any }>();

// Sincronização Administrativa (Inserir/Atualizar Documento)
app.post("/sync", async (c) => {
  try {
    const body = await c.req.json() as KnowledgeDocument;
    await ingestKnowledge(c.env, body);
    return c.json({ success: true, message: `Documento ${body.id} indexado.` });
  } catch (err: any) {
    return c.json({ error: err.message }, 400); // 400 for security violations
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await removeKnowledge(c.env, id);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Busca e Construção de Resposta (AutoRAG)
app.post("/search", async (c) => {
  try {
    const { query, organizationId, patientVisible, userId } = await c.req.json();
    
    // Recupera contexto do Vectorize
    const results = await searchKnowledge(c.env, query, {
      organizationId,
      patientVisible
    });
    
    if (results.length === 0) {
      return c.json({ 
        answer: "Não encontrei informações validadas na base de conhecimento da clínica sobre isso.", 
        sources: [] 
      });
    }

    // O texto completo deve vir do D1 ou R2 usando o result.id
    // Aqui usamos um mock para demonstração
    let contextText = "";
    results.forEach((match, idx) => {
       contextText += `[${idx+1}] Fonte: ${match.metadata.source} - Conteúdo Recuperado no ID ${match.id}\n`;
    });
    
    const prompt = `
Você é um assistente da Base de Conhecimento Institucional do FisioFlow.
Responda à pergunta baseando-se EXCLUSIVAMENTE nas referências institucionais abaixo.
Sempre cite a fonte utilizada [Ex: Fonte: X].

REFERÊNCIAS:
${contextText}

PERGUNTA:
${query}
    `;

    const router = new AIRouter({
        env: c.env,
        organizationId,
        userId: userId || "system",
        taskType: "rag_answer" 
        // nível 'none', sem dados de paciente
    });
    
    const answer = await router.run(prompt, c.env.AI_DEFAULT_CHEAP_MODEL || "@cf/meta/llama-3-8b-instruct");
    
    return c.json({
      answer,
      sources: results.map(r => r.metadata.source)
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
