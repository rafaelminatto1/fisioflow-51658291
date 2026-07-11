import { describe, it, expect } from "vitest";
import { textToObservacaoHtml } from "../textToObservacao";

describe("textToObservacaoHtml", () => {
  it("converte texto ditado em parágrafo HTML", () => {
    expect(textToObservacaoHtml("Paciente relata melhora.")).toBe("<p>Paciente relata melhora.</p>");
  });
  it("separa parágrafos por linha em branco", () => {
    expect(textToObservacaoHtml("A\n\nB")).toBe("<p>A</p><p>B</p>");
  });
  it("retorna vazio quando não há texto", () => {
    expect(textToObservacaoHtml("  ")).toBe("");
  });
  it("escapa HTML no texto ditado", () => {
    expect(textToObservacaoHtml("dor < 3 & melhora")).toBe("<p>dor &lt; 3 &amp; melhora</p>");
  });
});
