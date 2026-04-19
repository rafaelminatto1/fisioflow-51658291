import type { Env } from "../../types/env";
import { callGeminiStructured } from "../../lib/ai-gemini-v2";
import { SoapSchema, type Soap } from "../../schemas/ai-schemas";

/**
 * EvolutionSummarizer - Resume e estrutura a evolução clínica do paciente via Gemini V2.
 * Transforma notas rápidas ou transcrições no padrão clínico S.O.A.P.
 */
export class EvolutionSummarizer {
  constructor(private env: Env) {}

  async summarize(content: string): Promise<Soap> {
    const prompt = `
      Converta a nota bruta abaixo em uma Evolução Clínica estruturada seguindo o padrão S.O.A.P. (Subjetivo, Objetiva, Avaliação, Plano).
      
      Nota Bruta:
      "${content}"
    `;

    const systemInstruction = 
      "Você é um fisioterapeuta experiente da FisioFlow. Escreva em Português do Brasil de forma clara e profissional. " +
      "Cada seção do SOAP deve ser preenchida com base no conteúdo clínico disponível.";

    try {
      return await callGeminiStructured(this.env, {
        schema: SoapSchema,
        prompt,
        model: "gemini-3-flash-preview",
        thinkingLevel: "MEDIUM",
        systemInstruction,
        temperature: 0.3,
      });
    } catch (error) {
      console.error("Erro EvolutionSummarizer:", error);
      // Fallback básico em caso de erro crítico da IA
      return {
        subjective: content,
        objective: "Avaliação objetiva pendente.",
        assessment: "Seguimento clínico.",
        plan: "Manter conduta."
      };
    }
  }
}
