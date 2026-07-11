import { describe, it, expect } from "vitest";
import { normalizeForWer, wordErrorRate } from "../wer";

describe("normalizeForWer", () => {
  it("ignora caixa, pontuação e espaços múltiplos, mantendo acentos", () => {
    expect(normalizeForWer("Paciente relata MELHORA, da  dor!")).toBe("paciente relata melhora da dor");
    expect(normalizeForWer("mobilização grau três")).toBe("mobilização grau três");
  });
});

describe("wordErrorRate", () => {
  it("é 0 para transcrição idêntica (mesmo variando caixa/pontuação)", () => {
    const r = wordErrorRate("Paciente relata melhora da dor.", "paciente relata melhora da dor");
    expect(r.wer).toBe(0);
    expect(r.words).toBe(5);
  });
  it("conta substituições: 1 erro em 10 palavras = 0.1", () => {
    const ref = "um dois três quatro cinco seis sete oito nove dez";
    const hyp = "um dois TRAS quatro cinco seis sete oito nove dez";
    expect(wordErrorRate(ref, hyp).wer).toBeCloseTo(0.1);
  });
  it("conta inserções e deleções", () => {
    const ref = "realizamos mobilização articular no joelho direito";
    expect(wordErrorRate(ref, "realizamos mobilização no joelho direito").wer).toBeCloseTo(1 / 6);
    expect(wordErrorRate(ref, "hoje realizamos mobilização articular no joelho direito").wer).toBeCloseTo(1 / 6);
  });
  it("hipótese vazia = 100% de erro; referência vazia lança", () => {
    expect(wordErrorRate("uma frase qualquer", "").wer).toBe(1);
    expect(() => wordErrorRate("", "algo")).toThrow();
  });
});
