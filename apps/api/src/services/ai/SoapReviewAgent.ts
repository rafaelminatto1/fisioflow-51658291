import { z } from "zod";
import { callAI } from "../../lib/ai/callAI";
import type { Env } from "../../types/env";

export interface SoapReviewResult {
  hasChanges: boolean;
  score: number;
  suggestions: string[];
  improvedText: string | null;
}

const SoapReviewSchema = z.object({
  hasChanges: z.boolean(),
  score: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  improvedText: z.string().nullable().optional(),
});

const FALLBACK: SoapReviewResult = {
  hasChanges: false,
  score: 50,
  suggestions: ["Não foi possível processar a revisão. Verifique o texto manualmente."],
  improvedText: null,
};

export class SoapReviewAgent {
  constructor(private env: Env) {}

  async reviewSoapNote(text: string): Promise<SoapReviewResult> {
    const prompt = `Você é um agente revisor clínico especialista em evoluções SOAP de fisioterapia.
Analise o rascunho de evolução SOAP a seguir e retorne SOMENTE JSON válido neste formato:
{
  "hasChanges": true/false,
  "score": 0-100,
  "suggestions": ["sugestão 1", "sugestão 2"],
  "improvedText": "texto melhorado ou null"
}

Critérios:
1. Verifique se Subjetivo, Objetivo, Avaliação e Plano estão claros e completos.
2. Identifique dados objetivos ausentes (escala de dor, ADM, testes específicos).
3. Sugira padronização de terminologia clínica em PT-BR.
4. Se o texto precisar de melhorias, forneça versão reescrita em improvedText; caso contrário null.
5. Score 0-100 indica qualidade clínica (100 = excelente).

EVOLUÇÃO SOAP:
"""
${text}
"""`;

    try {
      const aiResult = await callAI(this.env, {
        task: "soap-review",
        prompt,
        organizationId: "system",
      });

      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return FALLBACK;

      const parsed = SoapReviewSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (!parsed.success) {
        console.error("[SoapReviewAgent] Schema validation failed:", parsed.error.issues);
        return FALLBACK;
      }

      return {
        hasChanges: parsed.data.hasChanges,
        score: parsed.data.score,
        suggestions: parsed.data.suggestions,
        improvedText: parsed.data.improvedText ?? null,
      };
    } catch (error) {
      console.error("[SoapReviewAgent] Error reviewing SOAP note:", error);
      return FALLBACK;
    }
  }
}
