import { describe, it, expect } from "vitest";
import {
  CLINICAL_THRESHOLDS,
  deltaExplanation,
  deltaLabel,
  interpretDelta,
  LAUDO_DISCLAIMER,
} from "../clinicalThresholds";

/**
 * O que estes testes protegem.
 *
 * Sem MDC, a tela de comparação antes/depois desenharia seta verde para uma
 * variação de 3° no FPPA — número menor que o erro de medição do próprio
 * método. Declarar progresso onde há ruído é a forma mais silenciosa de um
 * software clínico mentir: ninguém questiona um gráfico que sobe.
 */

describe("interpretDelta — abaixo do MDC é ruído, não progresso", () => {
  it("FPPA: 3° NÃO é melhora (MDC 9,2°)", () => {
    expect(interpretDelta("fppa", -3)).toBe("sem_mudanca_detectavel");
    expect(interpretDelta("fppa", 3)).toBe("sem_mudanca_detectavel");
  });

  it("FPPA: fronteira do MDC", () => {
    expect(interpretDelta("fppa", -9.1)).toBe("sem_mudanca_detectavel");
    expect(interpretDelta("fppa", -9.3)).toBe("melhora");
  });

  it("FPPA menor é melhor — reduzir a excursão é melhora, aumentar é piora", () => {
    expect(interpretDelta("fppa", -12)).toBe("melhora");
    expect(interpretDelta("fppa", 12)).toBe("piora");
  });

  it("ROM de joelho maior é melhor — a polaridade é oposta à do FPPA", () => {
    expect(interpretDelta("knee_rom", 8)).toBe("melhora");
    expect(interpretDelta("knee_rom", -8)).toBe("piora");
    expect(interpretDelta("knee_rom", 4)).toBe("sem_mudanca_detectavel");
  });

  it("simetria: MDC de 13 p.p. — 6 pontos não é progresso", () => {
    expect(interpretDelta("symmetry", 6)).toBe("sem_mudanca_detectavel");
    expect(interpretDelta("symmetry", 15)).toBe("melhora");
    expect(interpretDelta("symmetry", -15)).toBe("piora");
  });

  it("dor: MCID de 2 pontos, e menos dor é melhor", () => {
    expect(interpretDelta("pain", -1)).toBe("sem_mudanca_detectavel");
    expect(interpretDelta("pain", -3)).toBe("melhora");
    expect(interpretDelta("pain", 3)).toBe("piora");
  });

  it("inclinação de tronco: menor é melhor", () => {
    expect(interpretDelta("trunk_inclination", -8)).toBe("melhora");
    expect(interpretDelta("trunk_inclination", 8)).toBe("piora");
  });

  it("métrica sem limiar publicado devolve indeterminado, não um palpite", () => {
    expect(interpretDelta("metrica_inexistente", 50)).toBe("indeterminado");
    expect(interpretDelta("jump_height", 10)).toBe("indeterminado");
  });

  it("NaN e Infinity não viram melhora", () => {
    expect(interpretDelta("knee_rom", NaN)).toBe("indeterminado");
    expect(interpretDelta("knee_rom", Infinity)).toBe("indeterminado");
  });

  it("delta zero é sempre sem mudança", () => {
    for (const key of Object.keys(CLINICAL_THRESHOLDS)) {
      expect(interpretDelta(key, 0)).toBe("sem_mudanca_detectavel");
    }
  });
});

describe("integridade da tabela de limiares", () => {
  it("toda métrica tem MDC positivo, unidade e citação com DOI ou periódico", () => {
    for (const [key, t] of Object.entries(CLINICAL_THRESHOLDS)) {
      expect(t.mdc, key).toBeGreaterThan(0);
      expect(t.unit, key).toBeTruthy();
      expect(t.source.length, key).toBeGreaterThan(20);
    }
  });

  it("o MDC nunca é menor que o SEM — seria incoerente", () => {
    for (const [key, t] of Object.entries(CLINICAL_THRESHOLDS)) {
      if (t.sem !== undefined) expect(t.mdc, key).toBeGreaterThanOrEqual(t.sem);
    }
  });

  it("as métricas do pipeline têm limiar definido", () => {
    for (const key of ["fppa", "knee_rom", "trunk_inclination", "symmetry", "cadence"]) {
      expect(CLINICAL_THRESHOLDS[key], key).toBeDefined();
    }
  });
});

describe("textos para a interface", () => {
  it("rótulos em PT-BR, sem emoji", () => {
    expect(deltaLabel("sem_mudanca_detectavel")).toBe("Sem mudança detectável");
    expect(deltaLabel("melhora")).toBe("Melhora");
    for (const l of ["melhora", "piora", "sem_mudanca_detectavel", "indeterminado"] as const) {
      expect(deltaLabel(l)).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });

  it("a explicação diz o número do MDC, para o fisio conferir", () => {
    const texto = deltaExplanation("fppa", 3);
    expect(texto).toContain("9.2");
    expect(texto).toContain("erro de medição");
  });

  it("o disclaimer do laudo diz que FPPA não é ângulo de joelho", () => {
    expect(LAUDO_DISCLAIMER).toContain("FPPA");
    expect(LAUDO_DISCLAIMER).toContain("não corresponde");
    expect(LAUDO_DISCLAIMER).toContain("Lopes");
  });
});
