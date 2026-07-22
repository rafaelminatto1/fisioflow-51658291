/**
 * Helpers para os recursos de IA do inbox (resumir conversa / sugerir resposta).
 * Puro e testável — os endpoints em routes/whatsapp-inbox.ts montam a chamada ao
 * gateway (`runAi`/`readAiText`) com estes utilitários.
 */

export type AiHistoryItem = { role: "user" | "assistant"; content: string };

/** Extrai texto de um content que pode ser string, JSON string ou objeto. */
export function extractText(content: unknown): string {
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractText(JSON.parse(trimmed));
      } catch {
        return content;
      }
    }
    return content;
  }
  if (content && typeof content === "object") {
    const rec = content as Record<string, unknown>;
    if (typeof rec.text === "string") return rec.text;
    if (typeof rec.body === "string") return rec.body;
  }
  return "";
}

type RawMessage = { direction?: string; content?: unknown };

/**
 * Converte as mensagens da conversa (mais antigas → mais novas) em histórico
 * para o modelo: inbound = "user", outbound = "assistant". Ignora notas internas
 * e mensagens sem texto, e mantém apenas as últimas `limit`.
 */
export function buildAiHistory(messages: RawMessage[], limit = 20): AiHistoryItem[] {
  const mapped: AiHistoryItem[] = [];
  for (const m of messages) {
    if (m.direction !== "inbound" && m.direction !== "outbound") continue;
    const text = extractText(m.content).trim();
    if (!text) continue;
    mapped.push({ role: m.direction === "inbound" ? "user" : "assistant", content: text });
  }
  return mapped.slice(-limit);
}

export const SUMMARY_SYSTEM_PROMPT = `
Você é um assistente de uma clínica de fisioterapia. Resuma a conversa de WhatsApp
abaixo em português (PT-BR) para o atendente humano. Seja objetivo: em 2-4 frases,
diga quem é o contato, o que ele quer, o estágio da negociação e qual é a pendência
atual. Não invente informações que não estejam na conversa.
`.trim();

export const NEXT_ACTION_SYSTEM_PROMPT = `
Você ajuda um atendente de uma clínica de fisioterapia a avançar leads no WhatsApp.
Com base no histórico, sugira a PRÓXIMA AÇÃO objetiva e acionável que o atendente
deve tomar (ex.: "Confirmar horário da avaliação", "Enviar tabela de valores do
convênio"). Responda em português com UMA frase curta, sem aspas e sem comentários.
`.trim();

export const SUGGEST_SYSTEM_PROMPT = `
Você é um atendente de uma clínica de fisioterapia respondendo no WhatsApp em
português (PT-BR). Com base no histórico, escreva UMA sugestão de resposta curta,
cordial e natural para a última mensagem do cliente. Responda apenas com o texto
da mensagem sugerida, sem aspas e sem comentários.
`.trim();

/**
 * Variante fundamentada na base de conhecimento clínico. O rascunho é para um
 * ATENDENTE revisar antes de enviar a um paciente/lead — por isso é seguro:
 * linguagem leiga, sem diagnóstico nem prescrição, orientando a confirmar com o
 * fisioterapeuta quando a dúvida for clínica específica.
 */
export const SUGGEST_KB_SYSTEM_PROMPT = `
Você é um atendente de uma clínica de fisioterapia respondendo no WhatsApp em
português (PT-BR). Use os trechos da base de conhecimento da clínica (fornecidos
abaixo) apenas como APOIO para escrever UMA resposta curta, cordial e em linguagem
simples para a última mensagem do cliente. Regras de segurança: NÃO dê diagnóstico,
NÃO prescreva exercícios, cargas, doses ou condutas específicas, e NÃO copie jargão
técnico. Se a dúvida for clínica específica, oriente de forma geral e sugira
confirmar com o fisioterapeuta ou agendar uma avaliação. Se os trechos não ajudarem,
responda apenas de forma cordial e acolhedora. Responda apenas com o texto da
mensagem sugerida, sem aspas e sem comentários.
`.trim();

/** Texto da última mensagem recebida do cliente (role "user"); "" se não houver. */
export function lastInboundText(history: AiHistoryItem[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].content;
  }
  return "";
}

/** Formata trechos da KB para o prompt; retorna "" quando não há trechos. */
export function buildKbContextBlock(snippets: string[]): string {
  const clean = snippets.map((s) => s.trim()).filter((s) => s !== "");
  if (clean.length === 0) return "";
  return `Trechos da base de conhecimento da clínica (apoio):\n${clean
    .map((s) => `- ${s}`)
    .join("\n")}`;
}
