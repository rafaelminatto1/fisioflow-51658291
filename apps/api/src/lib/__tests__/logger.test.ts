import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redactPII, logEvent, maskEmail } from "../logger";
import type { Env } from "../../types/env";

describe("redactPII", () => {
  it("redige campos sensíveis no primeiro nível", () => {
    const result = redactPII({ cpf: "12345678900", level: "info" });
    expect(result.cpf).toBe("[REDACTED]");
    expect(result.level).toBe("info");
  });

  it("redige campos sensíveis aninhados", () => {
    const result = redactPII({
      context: { patientName: "Maria Silva", sessionId: "s-1" },
    });
    expect(result.context.patientName).toBe("[REDACTED]");
    expect(result.context.sessionId).toBe("s-1");
  });

  it("PRESERVA patientId: é UUID e a única alça para depurar chamada clínica de IA", () => {
    const result = redactPII({
      patientId: "abc-123",
      context: { patientId: "def-456", patientName: "Maria Silva" },
    });
    expect(result.patientId).toBe("abc-123");
    expect(result.context.patientId).toBe("def-456");
    expect(result.context.patientName).toBe("[REDACTED]");
  });

  it("redige as demais chaves identificantes", () => {
    const result = redactPII({
      email: "a@b.com",
      fullName: "Maria Silva",
      name: "Maria",
      password: "x",
    });
    expect(result.email).toBe("[REDACTED]");
    expect(result.fullName).toBe("[REDACTED]");
    expect(result.name).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
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

describe("maskEmail", () => {
  it("mantém o primeiro caractere e o domínio", () => {
    expect(maskEmail("rafael@gmail.com")).toBe("r***@gmail.com");
  });

  it("retorna string vazia para undefined", () => {
    expect(maskEmail(undefined)).toBe("");
  });

  it("retorna string vazia para vazio", () => {
    expect(maskEmail("")).toBe("");
  });

  it("não lança para valor sem @", () => {
    expect(maskEmail("naoehemail")).toBe("***");
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
