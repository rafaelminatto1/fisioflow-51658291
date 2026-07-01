import { describe, it, expect } from "vitest";
import { isCampaignDue, summarizeEnvios } from "../campaignMetrics";

const NOW = new Date("2026-07-01T12:00:00Z");

describe("isCampaignDue", () => {
  it("true quando agendada e a hora já chegou", () => {
    expect(
      isCampaignDue({ status: "agendada", agendada_em: "2026-07-01T11:00:00Z" }, NOW),
    ).toBe(true);
  });
  it("false quando ainda não chegou a hora", () => {
    expect(
      isCampaignDue({ status: "agendada", agendada_em: "2026-07-01T13:00:00Z" }, NOW),
    ).toBe(false);
  });
  it("false quando não está agendada ou sem data", () => {
    expect(isCampaignDue({ status: "concluida", agendada_em: "2026-07-01T11:00:00Z" }, NOW)).toBe(
      false,
    );
    expect(isCampaignDue({ status: "agendada", agendada_em: null }, NOW)).toBe(false);
  });
});

describe("summarizeEnvios", () => {
  it("conta por status normalizado", () => {
    const out = summarizeEnvios([
      { status: "enviado" },
      { status: "entregue" },
      { status: "entregue" },
      { status: "lido" },
      { status: "falha" },
    ]);
    expect(out).toEqual({ total: 5, enviados: 1, entregues: 2, lidos: 1, falhas: 1 });
  });
  it("lista vazia zera tudo", () => {
    expect(summarizeEnvios([])).toEqual({ total: 0, enviados: 0, entregues: 0, lidos: 0, falhas: 0 });
  });
});
