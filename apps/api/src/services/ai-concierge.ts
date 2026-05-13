import { Env } from "../types/env";
import { runAi, generateEmbedding } from "../lib/ai-native";

export interface ConciergeResponse {
  reply: string;
  intent: "scheduling" | "information" | "urgent" | "other";
  patientData?: {
    name?: string;
    condition?: string;
    insurance?: string;
  };
}

/**
 * AI Concierge Service — 24/7 Intelligent WhatsApp Triage
 */
export class AIConciergeService {
  /**
   * Processes an incoming message from a new lead and generates an intelligent response
   */
  static async processMessage(
    env: Env,
    orgId: string,
    message: string,
    history: any[] = []
  ): Promise<ConciergeResponse> {
    
    // 1. Semantic Context: Search Wiki for clinic info if relevant
    let clinicalContext = "";
    try {
      const vector = await generateEmbedding(env, message);
      const wikiMatches = await env.CLINICAL_KNOWLEDGE?.query(vector, {
        topK: 2,
        namespace: "wiki",
        returnMetadata: true,
      });
      
      clinicalContext = (wikiMatches?.matches ?? [])
        .map((m: any) => `${m.metadata.title}: ${m.metadata.text || ""}`)
        .join("\n\n");
    } catch (e) {
      console.warn("[AI Concierge] Wiki search failed:", e);
    }

    // 2. LLM Triage & Response Generation
    const systemPrompt = `
      Você é o AI Concierge da clínica de fisioterapia Mooca Fisio.
      Seu objetivo é realizar a triagem de novos pacientes via WhatsApp 24/7.
      
      CONTEXTO DA CLÍNICA (WIKI):
      ${clinicalContext || "Clínica especializada em Traumato-Ortopedia, Pilates e Reabilitação Funcional."}
      
      DIRETRIZES:
      - Seja extremamente acolhedor, profissional e ágil.
      - Se o paciente quiser agendar, tente extrair: Nome, Queixa Principal e se tem Plano de Saúde.
      - Se for uma urgência (dor muito forte), priorize avisar que a equipe humana entrará em contato IMEDIATAMENTE.
      - Use o contexto da Wiki para responder dúvidas sobre horários, valores ou tipos de tratamento.
      - Responda em Português Brasileiro, de forma concisa para WhatsApp.
      
      Retorne APENAS um JSON válido neste formato:
      {
        "reply": "sua resposta aqui",
        "intent": "scheduling" | "information" | "urgent" | "other",
        "patientData": { "name": "...", "condition": "...", "insurance": "..." }
      }
    `.trim();

    try {
      const response = await runAi(
        env,
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: "user", content: message }
          ],
          response_format: { type: "json_object" }
        },
        { cache: false }
      );

      const raw = (response as any).response as string;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch?.[0] ?? "{}") as ConciergeResponse;
      
      return result;
    } catch (error) {
      console.error("[AI Concierge] LLM Error:", error);
      return {
        reply: "Olá! Recebemos sua mensagem. Um de nossos especialistas vai te retornar em instantes para te ajudar. 😊",
        intent: "other"
      };
    }
  }
}
