import { describe, it, expect } from "vitest";
import { normalizeText } from "../string";

describe("normalizeText", () => {
  it("converte para minúsculas", () => {
    expect(normalizeText("JOÃO")).toBe("joao");
  });

  it("remove acentos", () => {
    expect(normalizeText("Áéíóú àèìòù âêîôû ãõ ñ ç")).toBe("aeiou aeiou aeiou ao n c");
  });

  it("lida com strings mistas", () => {
    expect(normalizeText("Fisioterapia Avançada")).toBe("fisioterapia avancada");
  });

  it("mantém números e símbolos básicos", () => {
    expect(normalizeText("Paciente 123!")).toBe("paciente 123!");
  });
});
