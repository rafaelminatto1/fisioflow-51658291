import { describe, it, expect } from "vitest";
import {
  isGreetingReply,
  shouldSkipGreeting,
  buildConciergeHistory,
  type ConciergeHistoryItem,
} from "../ai-concierge";

const apresentacao =
  "Bom dia, tudo bem?\nSou o Rafael da Activity Fisioterapia.\nComo posso ajudar?";

describe("ai-concierge — anti-repetição da saudação", () => {
  it("isGreetingReply detecta a apresentação (qualquer saudação)", () => {
    expect(isGreetingReply(apresentacao)).toBe(true);
    expect(
      isGreetingReply("Boa noite, tudo bem?\nSou o Rafael da Activity Fisioterapia.\nComo posso ajudar?"),
    ).toBe(true);
    expect(isGreetingReply("Nosso endereço é na Rua X, 123.")).toBe(false);
  });

  it("shouldSkipGreeting: pula quando já houve uma saudação do assistente antes", () => {
    const history: ConciergeHistoryItem[] = [
      { role: "user", content: "oi" },
      { role: "assistant", content: apresentacao },
    ];
    expect(shouldSkipGreeting(apresentacao, history)).toBe(true);
  });

  it("shouldSkipGreeting: NÃO pula a primeira saudação da conversa", () => {
    expect(shouldSkipGreeting(apresentacao, [])).toBe(false);
  });

  it("shouldSkipGreeting: nunca pula uma resposta que não é saudação", () => {
    const history: ConciergeHistoryItem[] = [{ role: "assistant", content: apresentacao }];
    expect(shouldSkipGreeting("Nosso horário é das 7h às 19h.", history)).toBe(false);
  });

  it("buildConciergeHistory mapeia inbound→user, outbound→assistant e ignora vazios/internos", () => {
    const rows = [
      { direction: "inbound", content: "oi", message_type: "text" },
      { direction: "outbound", content: apresentacao, message_type: "text" },
      { direction: "internal", content: "nota interna", message_type: "text" },
      { direction: "inbound", content: "", message_type: "image" },
    ];
    expect(buildConciergeHistory(rows)).toEqual([
      { role: "user", content: "oi" },
      { role: "assistant", content: apresentacao },
    ]);
  });
});
