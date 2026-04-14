import type { Env } from "../../types/env";

/**
 * EvolutionSummarizer - Resume e estrutura a evolução clínica do paciente via Workers AI.
 * Transforma notas rápidas ou transcrições no padrão clínico S.O.A.P.
 */
export class EvolutionSummarizer {
  constructor(private env: Env) {}

  async summarize(content: string): Promise<{ subjective: string, objective: string, assessment: string, plan: string }> {
    const prompt = `
      Você é um Fisioterapeuta experiente da FisioFlow.
      Converta a nota bruta abaixo em uma Evolução Clínica estruturada seguindo o padrão S.O.A.P. (Subjetivo, Objetiva, Avaliação, Plano).
      Escreva em Português do Brasil de forma clara e profissional.
      Se algum campo não for identificável, retorne vazio para aquele campo.

      Nota Bruta:
      "${content}"

      Retorne APENAS um JSON com os campos { subjective: string, objective: string, assessment: string, plan: string }.
    `;

    try {
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "Você é um assistente especializado em redação clínica de fisioterapia. Retorne apenas JSON." },
          { role: "user", content: prompt }
        ],
        max_tokens: 512,
        temperature: 0.2,
      });

      // Se a resposta for uma string que contém JSON (padrão de modelos Instruct)
      const rawResponse = response.response || "";
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { subjective: content, objective: "", assessment: "", plan: "" };
    } catch (error) {
      console.error("Erro EvolutionSummarizer:", error);
      throw new Error("Falha ao resumir evolução via IA.");
    }
  }
}
