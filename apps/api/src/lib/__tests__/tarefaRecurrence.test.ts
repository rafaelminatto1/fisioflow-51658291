import { describe, it, expect } from "vitest";
import { computeNextDueDate, parseRecurrence } from "../tarefaRecurrence";

describe("parseRecurrence", () => {
  it("aceita freq válida e normaliza interval", () => {
    expect(parseRecurrence({ freq: "weekly" })).toEqual({ freq: "weekly", interval: 1 });
    expect(parseRecurrence({ freq: "daily", interval: 3 })).toEqual({
      freq: "daily",
      interval: 3,
    });
  });

  it("rejeita valores inválidos", () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence("weekly")).toBeNull();
    expect(parseRecurrence({ freq: "yearly" })).toBeNull();
    expect(parseRecurrence({})).toBeNull();
  });

  it("interval inválido vira 1", () => {
    expect(parseRecurrence({ freq: "weekly", interval: 0 })).toEqual({
      freq: "weekly",
      interval: 1,
    });
    expect(parseRecurrence({ freq: "weekly", interval: "x" })).toEqual({
      freq: "weekly",
      interval: 1,
    });
  });
});

describe("computeNextDueDate", () => {
  it("daily soma 1 dia", () => {
    expect(computeNextDueDate({ freq: "daily" }, "2026-07-09")).toBe("2026-07-10");
  });

  it("weekly soma 7 dias", () => {
    expect(computeNextDueDate({ freq: "weekly" }, "2026-07-09")).toBe("2026-07-16");
  });

  it("biweekly soma 14 dias", () => {
    expect(computeNextDueDate({ freq: "biweekly" }, "2026-07-09")).toBe("2026-07-23");
  });

  it("monthly soma 1 mês mantendo o dia", () => {
    expect(computeNextDueDate({ freq: "monthly" }, "2026-07-09")).toBe("2026-08-09");
  });

  it("monthly clampa para o fim do mês", () => {
    expect(computeNextDueDate({ freq: "monthly" }, "2026-01-31")).toBe("2026-02-28");
    expect(computeNextDueDate({ freq: "monthly" }, "2028-01-31")).toBe("2028-02-29");
  });

  it("respeita interval", () => {
    expect(computeNextDueDate({ freq: "weekly", interval: 2 }, "2026-07-09")).toBe("2026-07-23");
    expect(computeNextDueDate({ freq: "monthly", interval: 3 }, "2026-07-09")).toBe("2026-10-09");
  });

  it("vira mês/ano corretamente", () => {
    expect(computeNextDueDate({ freq: "daily" }, "2026-12-31")).toBe("2027-01-01");
  });

  it("aceita timestamp ISO cortando a hora", () => {
    expect(computeNextDueDate({ freq: "daily" }, "2026-07-09T00:00:00.000Z")).toBe("2026-07-10");
  });
});
