import { describe, it, expect } from "vitest";
import { computeLeadScore } from "../leadScore";

const NOW = new Date("2026-07-01T12:00:00Z");

describe("computeLeadScore", () => {
  it("lead novo e frio pontua baixo", () => {
    const s = computeLeadScore({ stage: "lead", now: NOW });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(30);
  });

  it("estágio mais avançado pontua mais que estágio inicial", () => {
    const early = computeLeadScore({ stage: "lead", now: NOW });
    const late = computeLeadScore({ stage: "efetivado", now: NOW });
    expect(late).toBeGreaterThan(early);
  });

  it("recência da última mensagem esquenta o lead", () => {
    const base = { stage: "em_contato", now: NOW } as const;
    const recent = computeLeadScore({ ...base, lastInboundAt: "2026-07-01T11:00:00Z" });
    const old = computeLeadScore({ ...base, lastInboundAt: "2026-05-01T11:00:00Z" });
    expect(recent).toBeGreaterThan(old);
  });

  it("intenção de urgência/agendamento adiciona pontos", () => {
    const base = { stage: "em_contato", now: NOW } as const;
    expect(computeLeadScore({ ...base, intent: "urgent" })).toBeGreaterThan(
      computeLeadScore({ ...base, intent: "information" }),
    );
    expect(computeLeadScore({ ...base, intent: "scheduling" })).toBeGreaterThan(
      computeLeadScore(base),
    );
  });

  it("engajamento (nº de mensagens) contribui, com teto", () => {
    const base = { stage: "lead", now: NOW } as const;
    expect(computeLeadScore({ ...base, messageCount: 8 })).toBeGreaterThan(
      computeLeadScore({ ...base, messageCount: 0 }),
    );
    // teto: 50 msgs não estoura o limite de 100
    expect(computeLeadScore({ stage: "efetivado", messageCount: 50, intent: "urgent", lastInboundAt: NOW.toISOString(), now: NOW })).toBeLessThanOrEqual(100);
  });

  it("sempre retorna inteiro entre 0 e 100", () => {
    const s = computeLeadScore({ stage: "alta", messageCount: 3, intent: "urgent", now: NOW });
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
