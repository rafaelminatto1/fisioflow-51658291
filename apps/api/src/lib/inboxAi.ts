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

export const SUGGEST_SYSTEM_PROMPT = `
Você é um atendente de uma clínica de fisioterapia respondendo no WhatsApp em
português (PT-BR). Com base no histórico, escreva UMA sugestão de resposta curta,
cordial e natural para a última mensagem do cliente. Responda apenas com o texto
da mensagem sugerida, sem aspas e sem comentários.
`.trim();
