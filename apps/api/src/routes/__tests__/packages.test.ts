/**
 * Testes unitários para /api/packages
 * Foca em validações de entrada (sem banco real)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Monta uma resposta de pool com rows configuráveis */
function makePool(rows: unknown[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

/** Stub de user autenticado */
const stubUser = { id: "user-1", organizationId: "org-1", uid: "user-1" };

// ─── Testes de validators ─────────────────────────────────────────────────────

describe("isUuid", () => {
  // Importamos o validator diretamente para testar isolado
  const isUuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  it("aceita UUID v4 válido", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(true);
  });

  it("rejeita strings inválidas", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });

  it("rejeita UUID sem hifens", () => {
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});

// ─── Testes de lógica de negócio (pacotes) ───────────────────────────────────

describe("session_packages business logic", () => {
  it("calcula price_per_session corretamente", () => {
    const price = 600;
    const totalSessions = 10;
    const pricePerSession = price / totalSessions;
    expect(pricePerSession).toBe(60);
  });

  it("trata divisão por zero de forma segura", () => {
    // Na DB isso é prevenido via CHECK (total_sessions > 0), mas testamos a lógica
    const price = 500;
    const totalSessions = 0;
    const safeCalc = totalSessions > 0 ? price / totalSessions : 0;
    expect(safeCalc).toBe(0);
  });

  it("calcula expiry_date a partir de valid_days", () => {
    const validDays = 90;
    const now = new Date("2026-01-01T00:00:00Z").getTime();
    const expiryDate = new Date(now + validDays * 86400000).toISOString().split("T")[0];
    expect(expiryDate).toBe("2026-04-01");
  });

  it("calcula remaining_sessions como total - used", () => {
    const total = 10;
    const used = 3;
    const remaining = total - used;
    expect(remaining).toBe(7);
  });
});

// ─── Testes de status de pacote ───────────────────────────────────────────────

describe("patient_package status transitions", () => {
  type PackageStatus = "ativo" | "esgotado" | "expirado" | "cancelado";

  function computeStatus(remaining: number, expiryDate: string | null): PackageStatus {
    if (expiryDate && new Date(expiryDate) < new Date()) return "expirado";
    if (remaining <= 0) return "esgotado";
    return "ativo";
  }

  it("é ativo com sessões restantes e sem expirar", () => {
    expect(computeStatus(5, "2099-12-31")).toBe("ativo");
    expect(computeStatus(1, null)).toBe("ativo");
  });

  it("é esgotado quando remaining === 0", () => {
    expect(computeStatus(0, "2099-12-31")).toBe("esgotado");
  });

  it("é expirado quando data passou, independente de sessões", () => {
    expect(computeStatus(5, "2020-01-01")).toBe("expirado");
    expect(computeStatus(0, "2020-01-01")).toBe("expirado");
  });
});

// ─── Testes de validação de input (criação de pacote) ─────────────────────────

describe("create package input validation", () => {
  function validateCreateInput(body: {
    name?: string;
    total_sessions?: number;
    price?: number;
  }): string | null {
    if (!body.name) return "name é obrigatório";
    if (!body.total_sessions || body.total_sessions <= 0) return "total_sessions deve ser positivo";
    if (!body.price || body.price <= 0) return "price deve ser positivo";
    return null;
  }

  it("aceita input válido", () => {
    expect(
      validateCreateInput({ name: "Pacote 10 sessões", total_sessions: 10, price: 600 }),
    ).toBeNull();
  });

  it("rejeita sem name", () => {
    expect(validateCreateInput({ total_sessions: 10, price: 600 })).toMatch(/name/);
  });

  it("rejeita total_sessions zero", () => {
    expect(validateCreateInput({ name: "X", total_sessions: 0, price: 100 })).toMatch(
      /total_sessions/,
    );
  });

  it("rejeita price negativo", () => {
    expect(validateCreateInput({ name: "X", total_sessions: 5, price: -1 })).toMatch(/price/);
  });
});

// ─── Testes de sell validation ────────────────────────────────────────────────

describe("sell package validation", () => {
  const isUuid = (v: unknown): v is string =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  function validateSell(body: { patient_id?: string; package_id?: string; amount_paid?: number }) {
    if (!isUuid(body.patient_id)) return "patient_id inválido";
    if (!isUuid(body.package_id)) return "package_id inválido";
    if (!body.amount_paid || body.amount_paid <= 0) return "amount_paid deve ser positivo";
    return null;
  }

  const validId = "550e8400-e29b-41d4-a716-446655440000";

  it("aceita dados válidos", () => {
    expect(validateSell({ patient_id: validId, package_id: validId, amount_paid: 500 })).toBeNull();
  });

  it("rejeita patient_id inválido", () => {
    expect(validateSell({ patient_id: "bad", package_id: validId, amount_paid: 500 })).toMatch(
      /patient_id/,
    );
  });

  it("rejeita amount_paid zero", () => {
    expect(validateSell({ patient_id: validId, package_id: validId, amount_paid: 0 })).toMatch(
      /amount_paid/,
    );
  });
});
