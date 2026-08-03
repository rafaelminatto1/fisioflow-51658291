import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redactPII, logEvent } from "../logger";
import type { Env } from "../../types/env";

describe("redactPII", () => {
  it("redige campos sensíveis no primeiro nível", () => {
    const result = redactPII({ cpf: "12345678900", level: "info" });
    expect(result.cpf).toBe("[REDACTED]");
    expect(result.level).toBe("info");
  });

  it("redige campos sensíveis aninhados", () => {
    const result = redactPII({
      context: { patientName: "Maria Silva", patientId: "abc-123", sessionId: "s-1" },
    });
    expect(result.context.patientName).toBe("[REDACTED]");
    expect(result.context.patientId).toBe("[REDACTED]");
    expect(result.context.sessionId).toBe("s-1");
  });

  it("redige dentro de arrays", () => {
    const result = redactPII([{ phone: "11999998888" }, { phone: "11999997777" }]);
    expect(result[0].phone).toBe("[REDACTED]");
    expect(result[1].phone).toBe("[REDACTED]");
  });

  it("não muta o objeto original", () => {
    const original = { cpf: "12345678900" };
    redactPII(original);
    expect(original.cpf).toBe("12345678900");
  });

  it("preserva valores não-objeto", () => {
    expect(redactPII("texto")).toBe("texto");
    expect(redactPII(null)).toBe(null);
  });
});

describe("logEvent", () => {
  const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("emite JSON estruturado com nível, mensagem e ambiente", async () => {
    const env = { ENVIRONMENT: "production" } as Env;
    await logEvent(env, ctx, { level: "error", message: "falhou", route: "/api/x" });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe("error");
    expect(payload.message).toBe("falhou");
    expect(payload.environment).toBe("production");
    expect(payload.route).toBe("/api/x");
    expect(typeof payload._time).toBe("string");
  });

  it("redige PII antes de emitir", async () => {
    const env = { ENVIRONMENT: "production" } as Env;
    await logEvent(env, ctx, { level: "info", message: "ok", cpf: "12345678900" });

    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.cpf).toBe("[REDACTED]");
  });

  it("não faz chamada de rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const env = { ENVIRONMENT: "staging" } as Env;
    await logEvent(env, ctx, { level: "info", message: "ok" });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
