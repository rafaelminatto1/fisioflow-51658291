import { describe, expect, it } from "vitest";
import { isInternalRole, mapAskSources, resolveAskOutcome } from "../wikiAsk";
import type { AiSearchSource } from "../cloudflareAiSearch";

const source = (score: number, metadata: Record<string, unknown> = {}): AiSearchSource => ({
  id: "s1",
  filename: "wiki/abc.md",
  content: "Conteúdo relevante",
  metadata,
  score,
});

describe("isInternalRole", () => {
  it("aceita papéis internos da clínica", () => {
    for (const role of ["admin", "owner", "fisioterapeuta", "professional", "estagiario", "intern"]) {
      expect(isInternalRole(role)).toBe(true);
    }
  });

  it("rejeita paciente, viewer e ausente", () => {
    expect(isInternalRole("paciente")).toBe(false);
    expect(isInternalRole("patient")).toBe(false);
    expect(isInternalRole("viewer")).toBe(false);
    expect(isInternalRole(null)).toBe(false);
    expect(isInternalRole(undefined)).toBe(false);
  });
});

describe("resolveAskOutcome", () => {
  it("responde quando há fonte acima do threshold e texto de resposta", () => {
    const outcome = resolveAskOutcome("Use crioterapia nas primeiras 48h.", [source(0.8)], 0.3);
    expect(outcome.answered).toBe(true);
    expect(outcome.topScore).toBe(0.8);
  });

  it("não responde quando todas as fontes ficam abaixo do threshold", () => {
    const outcome = resolveAskOutcome("Resposta inventada", [source(0.1)], 0.3);
    expect(outcome.answered).toBe(false);
  });

  it("não responde quando não há fontes", () => {
    const outcome = resolveAskOutcome("Qualquer texto", [], 0.3);
    expect(outcome.answered).toBe(false);
    expect(outcome.topScore).toBe(0);
  });

  it("não responde quando a resposta vem vazia", () => {
    const outcome = resolveAskOutcome("   ", [source(0.9)], 0.3);
    expect(outcome.answered).toBe(false);
  });
});

describe("mapAskSources", () => {
  it("extrai title/slug/category/type da metadata e filtra por threshold", () => {
    const sources = [
      source(0.9, { title: "Protocolo LCA", slug: "protocolo-lca", category: "protocolos", source: "wiki" }),
      source(0.05, { title: "Irrelevante" }),
    ];
    const mapped = mapAskSources(sources, 0.3);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      title: "Protocolo LCA",
      slug: "protocolo-lca",
      category: "protocolos",
      type: "wiki",
      score: 0.9,
    });
  });

  it("usa filename como fallback de título", () => {
    const mapped = mapAskSources([source(0.5)], 0.3);
    expect(mapped[0].title).toBe("wiki/abc.md");
    expect(mapped[0].type).toBe("wiki");
  });
});
