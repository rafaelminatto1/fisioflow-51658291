import { describe, it, expect } from "vitest";
import { resolveTab, VALID_TABS } from "../tabRedirects";

describe("resolveTab", () => {
  it("retorna a primeira aba quando vazio/desconhecido", () => {
    expect(resolveTab(null)).toBe("funcionamento");
    expect(resolveTab("xyz")).toBe("funcionamento");
  });

  it("mantém abas válidas", () => {
    for (const t of VALID_TABS) expect(resolveTab(t)).toBe(t);
  });

  it("redireciona abas legadas para o novo grupo", () => {
    expect(resolveTab("horarios")).toBe("funcionamento");
    expect(resolveTab("capacidade")).toBe("funcionamento");
    expect(resolveTab("status")).toBe("atendimentos");
    expect(resolveTab("tipos")).toBe("atendimentos");
    expect(resolveTab("bloqueios")).toBe("disponibilidade");
    expect(resolveTab("politicas")).toBe("politicas");
    expect(resolveTab("aparencia")).toBe("aparencia");
    expect(resolveTab("overview")).toBe("funcionamento");
    expect(resolveTab("visual")).toBe("aparencia");
  });
});
