import { describe, it, expect } from "vitest";
import {
  resolveWebchatConciergeConfig,
  buildConciergeHistory,
} from "../ai-concierge";

describe("resolveWebchatConciergeConfig", () => {
  it("defaults: habilitado com delay de 10s quando não há config", () => {
    expect(resolveWebchatConciergeConfig(null)).toEqual({
      enabled: true,
      delayMs: 10_000,
    });
    expect(resolveWebchatConciergeConfig(undefined)).toEqual({
      enabled: true,
      delayMs: 10_000,
    });
    expect(resolveWebchatConciergeConfig({})).toEqual({
      enabled: true,
      delayMs: 10_000,
    });
  });

  it("aceita config vinda como string JSON (jsonb)", () => {
    expect(
      resolveWebchatConciergeConfig('{"enabled":true,"webchatAutoReply":true}'),
    ).toEqual({ enabled: true, delayMs: 10_000 });
    expect(resolveWebchatConciergeConfig("not-json")).toEqual({
      enabled: true,
      delayMs: 10_000,
    });
  });

  it("concierge desligado desativa o webchat", () => {
    expect(resolveWebchatConciergeConfig({ enabled: false }).enabled).toBe(
      false,
    );
  });

  it("webchatAutoReply=false desativa só o webchat", () => {
    expect(
      resolveWebchatConciergeConfig({ enabled: true, webchatAutoReply: false })
        .enabled,
    ).toBe(false);
  });

  it("autoReplyNewLeads NÃO controla o webchat (controle independente)", () => {
    expect(
      resolveWebchatConciergeConfig({ enabled: true, autoReplyNewLeads: false })
        .enabled,
    ).toBe(true);
  });

  it("webchatReplyDelaySeconds configura o delay com clamp 0–20s", () => {
    expect(
      resolveWebchatConciergeConfig({ webchatReplyDelaySeconds: 5 }).delayMs,
    ).toBe(5_000);
    expect(
      resolveWebchatConciergeConfig({ webchatReplyDelaySeconds: 0 }).delayMs,
    ).toBe(0);
    expect(
      resolveWebchatConciergeConfig({ webchatReplyDelaySeconds: -3 }).delayMs,
    ).toBe(0);
    expect(
      resolveWebchatConciergeConfig({ webchatReplyDelaySeconds: 999 }).delayMs,
    ).toBe(20_000);
    expect(
      resolveWebchatConciergeConfig({ webchatReplyDelaySeconds: "7" }).delayMs,
    ).toBe(10_000);
  });
});

describe("buildConciergeHistory — conteúdo jsonb", () => {
  it("aceita content como string com aspas (jsonb) e objeto {text}", () => {
    const rows = [
      { direction: "inbound", content: '"oi, tudo bem?"' },
      { direction: "outbound", content: { text: "Olá! Como posso ajudar?" } },
      { direction: "inbound", content: { body: "quero agendar" } },
    ];
    expect(buildConciergeHistory(rows)).toEqual([
      { role: "user", content: "oi, tudo bem?" },
      { role: "assistant", content: "Olá! Como posso ajudar?" },
      { role: "user", content: "quero agendar" },
    ]);
  });
});
