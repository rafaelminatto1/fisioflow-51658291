import { describe, it, expect } from "vitest";
import { soapToObservacaoHtml } from "../soapToObservacao";

describe("soapToObservacaoHtml", () => {
  it("converte texto ditado (subjective) em parágrafo HTML", () => {
    expect(soapToObservacaoHtml({ subjective: "Paciente relata melhora.", objective: "", assessment: "", plan: "" }))
      .toBe("<p>Paciente relata melhora.</p>");
  });
  it("junta múltiplos campos não-vazios em parágrafos", () => {
    expect(soapToObservacaoHtml({ subjective: "A", objective: " B ", assessment: "", plan: "C" }))
      .toBe("<p>A</p><p>B</p><p>C</p>");
  });
  it("retorna vazio quando não há texto", () => {
    expect(soapToObservacaoHtml({ subjective: "  ", objective: "", assessment: "", plan: "" })).toBe("");
  });
  it("escapa HTML no texto ditado", () => {
    expect(soapToObservacaoHtml({ subjective: "dor < 3 & melhora", objective: "", assessment: "", plan: "" }))
      .toBe("<p>dor &lt; 3 &amp; melhora</p>");
  });
});
