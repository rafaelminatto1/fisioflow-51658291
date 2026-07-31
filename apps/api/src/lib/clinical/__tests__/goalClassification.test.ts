import { describe, it, expect } from "vitest";
import {
  classifyGoal,
  isIcfClass,
  ICF_CLASSES,
  ICF_CLASS_LABELS,
} from "../goalClassification";

describe("classifyGoal", () => {
  it("reconhece objetivo de atividade/participação", () => {
    // Trecho real do corpus: "Gostaria de voltar a jogar futebol, após melhora das dores."
    for (const t of [
      "Gostaria de voltar a jogar futebol após melhora das dores",
      "Conseguir carregar a filha no colo",
      "Retorno ao esporte",
      "Voltar a subir escada sem apoio",
    ]) {
      expect(classifyGoal(t).suggested).toBe("atividade_participacao");
    }
  });

  it("reconhece objetivo de função/estrutura", () => {
    for (const t of ["Ganhar 20° de flexão de ombro", "Aumentar força de glúteo médio"]) {
      expect(classifyGoal(t).suggested).toBe("funcao_estrutura");
    }
  });

  it("reconhece objetivo apenas de sintoma e alerta", () => {
    const c = classifyGoal("Reduzir a dor lombar do paciente");
    expect(c.suggested).toBe("sintoma");
    expect(c.symptomOnly).toBe(true);
    expect(c.advice).toContain("atividade/participação");
  });

  it("prioriza participação quando dor aparece como obstáculo, não como alvo", () => {
    // "reduzir dor para voltar a correr" é objetivo de participação: a dor é o
    // obstáculo. Classificar como sintoma perderia o melhor prognóstico.
    const c = classifyGoal("Reduzir dor no joelho para voltar a correr 5km");
    expect(c.suggested).toBe("atividade_participacao");
    expect(c.symptomOnly).toBe(false);
  });

  it("marca objetivo curto demais como não classificável e orienta", () => {
    const c = classifyGoal("melhorar");
    expect(c.suggested).toBe("nao_classificavel");
    expect(c.advice).toContain("pior evolução");
  });

  it("trata vazio e nulo sem quebrar", () => {
    for (const v of [null, undefined, "", "   "]) {
      expect(classifyGoal(v).suggested).toBe("nao_classificavel");
    }
  });

  it("não classifica texto sem termo clínico reconhecível", () => {
    expect(classifyGoal("Combinar com a recepção o horário").suggested).toBe("nao_classificavel");
  });
});

describe("contrato", () => {
  it("valida classes conhecidas", () => {
    expect(isIcfClass("atividade_participacao")).toBe(true);
    expect(isIcfClass("outra")).toBe(false);
  });

  it("tem rótulo PT-BR para toda classe", () => {
    for (const c of ICF_CLASSES) expect(ICF_CLASS_LABELS[c]).toBeTruthy();
  });
});
