import { RetrievedContext } from "./ragClinicalContext";

export function buildClinicalContextPrompt(query: string, contexts: RetrievedContext[], maxTokens: number = 3000): string {
  if (contexts.length === 0) {
    return `Query: ${query}\n\nContexto: Insuficiente. Não responda com invenções. Diga que não há contexto clínico salvo suficiente.`;
  }

  // concatena contexts até atingir aprox maxTokens (assumindo 3 caracteres por token para folga)
  let contextText = "";
  for (const c of contexts) {
    const nextLine = `- Evolução [${c.evolutionId}]: ${c.contentSummary}\n`;
    
    if ((contextText.length + nextLine.length) / 3 > maxTokens) {
      break;
    }
    contextText += nextLine;
  }

  return `
Você é um assistente clínico de IA do FisioFlow.
Sua tarefa é responder à pergunta do fisioterapeuta baseando-se ESTRI-TAMENTE no contexto do histórico longitudinal do paciente abaixo.

REGRAS:
1. Se o contexto não tiver a resposta, responda EXATAMENTE: "Não há informação suficiente salva no histórico clínico para responder a essa pergunta."
2. NUNCA invente exames, datas, sintomas ou melhoras que não estejam no contexto.
3. Não prescreva medicamentos.
4. Mantenha um tom profissional e conciso.

CONTEXTO CLÍNICO:
${contextText}

PERGUNTA:
${query}
`;
}
