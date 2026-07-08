import { describe, it, expect } from "vitest";
import {
  isGreetingReply,
  shouldSkipGreeting,
  stripGreetingIntro,
  buildConciergeHistory,
  humanOwnsConversation,
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

  it("isGreetingReply detecta saudação genérica (sem a assinatura)", () => {
    expect(isGreetingReply("Boa tarde, tudo bem? Como posso ajudar?")).toBe(true);
    expect(isGreetingReply("Olá! Sim, fazemos parcerias.")).toBe(true);
    expect(isGreetingReply("Oi, tudo bem?")).toBe(true);
    expect(isGreetingReply("Bom dia! Atendemos das 8h às 18h.")).toBe(true);
    // "olá"/"oi" só no início contam como saudação.
    expect(isGreetingReply("Podemos marcar sua avaliação, tudo bem?")).toBe(false);
    expect(isGreetingReply("Nosso horário é das 7h às 19h.")).toBe(false);
  });

  it("shouldSkipGreeting: pula quando um humano já saudou (saudação genérica no histórico)", () => {
    const history: ConciergeHistoryItem[] = [
      { role: "user", content: "Olá tudo bem? Boa tarde" },
      // Fala do atendente humano (outbound → assistant).
      { role: "assistant", content: "Boa tarde, tudo bem? Sou o Rafael da Activity Fisioterapia." },
    ];
    // O bot tentaria saudar de novo genericamente → deve pular.
    expect(shouldSkipGreeting("Boa tarde, tudo bem? Como posso ajudar?", history)).toBe(true);
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

  it("stripGreetingIntro remove a apresentação E a saudação (não repete 'Boa tarde')", () => {
    expect(stripGreetingIntro(apresentacao)).toBe("Como posso ajudar?");
  });

  it("stripGreetingIntro remove a apresentação inline + saudação, mantém o resto", () => {
    expect(
      stripGreetingIntro(
        "Boa noite, tudo bem? Sou o Rafael da Activity Fisioterapia. Como posso ajudar?",
      ),
    ).toBe("Como posso ajudar?");
  });

  it("stripGreetingIntro remove saudação genérica e mantém o conteúdo útil", () => {
    expect(stripGreetingIntro("Boa tarde! Atendemos das 8h às 18h.")).toBe(
      "Atendemos das 8h às 18h.",
    );
    expect(stripGreetingIntro("Olá, tudo bem? Sim, fazemos parcerias.")).toBe(
      "Sim, fazemos parcerias.",
    );
  });

  it("stripGreetingIntro cai no fallback quando a resposta é só a saudação", () => {
    expect(stripGreetingIntro("Sou o Rafael da Activity Fisioterapia.")).toBe(
      "Como posso ajudar?",
    );
    expect(stripGreetingIntro("Boa tarde, tudo bem?")).toBe("Como posso ajudar?");
  });

  it("stripGreetingIntro não altera respostas sem saudação", () => {
    expect(stripGreetingIntro("Nosso horário é das 7h às 19h.")).toBe(
      "Nosso horário é das 7h às 19h.",
    );
  });

  describe("humanOwnsConversation — takeover unificado (WhatsApp/Instagram/webchat)", () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30min atrás
    const old = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5h atrás

    it("sem fala humana → bot pode responder", () => {
      expect(humanOwnsConversation(null, "pending", {})).toBe(false);
      expect(humanOwnsConversation(undefined, "open", { humanReplyPauseHours: 2 })).toBe(false);
    });

    it("default (0) → pausa enquanto a conversa não é resolvida/fechada", () => {
      expect(humanOwnsConversation(old, "pending", {})).toBe(true);
      expect(humanOwnsConversation(old, "open", {})).toBe(true);
      expect(humanOwnsConversation(old, "resolved", {})).toBe(false);
      expect(humanOwnsConversation(old, "closed", {})).toBe(false);
    });

    it("janela finita (>0) → pausa só dentro da janela de horas", () => {
      expect(humanOwnsConversation(recent, "pending", { humanReplyPauseHours: 1 })).toBe(true);
      expect(humanOwnsConversation(old, "pending", { humanReplyPauseHours: 1 })).toBe(false);
    });
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
