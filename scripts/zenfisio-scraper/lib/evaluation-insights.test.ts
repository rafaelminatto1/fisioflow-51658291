import { describe, expect, it } from "vitest";
import {
  buildEvaluationInsights,
  classifyBusinessOpportunity,
  normalizeClinicalText,
} from "./evaluation-insights.mjs";

const evaluations = [
  {
    name: "Paciente Corredor",
    slug: "paciente-corredor",
    evaluation_id: "1",
    fields: [
      { label: "Avaliação", name: "avaliacao-190", value: "Diagnóstico médico: Condromalácia patelar\nHMA: dor no joelho ao correr\nEsporte: corrida 21km\nPlano terapêutico: fortalecimento de quadríceps e glúteo" },
      { label: "Convênio:*", name: "agreement", value: "Particular" },
    ],
  },
  {
    name: "Paciente Idosa",
    slug: "paciente-idosa",
    evaluation_id: "2",
    fields: [
      { label: "HMA/HMP", name: "hma-hmp-1", value: "95 anos, queda de função, dificuldade para caminhar e dor nos joelhos" },
      { label: "Diagnóstico Médico", name: "diagnostico-medico-1", value: "Gonartrose bilateral" },
      { label: "Plano terapêutico", name: "plano-terapeutico-1", value: "Fortalecimento global, treino proprioceptivo e funcional" },
    ],
  },
  {
    name: "Paciente Metadados",
    slug: "paciente-metadados",
    evaluation_id: "3",
    fields: [
      { label: "appointment_id", name: "appointment_id", value: "123" },
      { label: "Convênio:*", name: "agreement", value: "Particular" },
    ],
  },
];

describe("normalizeClinicalText", () => {
  it("remove excesso de espaços mantendo linhas clínicas legíveis", () => {
    expect(normalizeClinicalText(" Dor   no joelho\n\n  Fortalecimento  global ")).toBe("Dor no joelho\nFortalecimento global");
  });
});

describe("classifyBusinessOpportunity", () => {
  it("classifica corredor com dor no joelho como programa de corrida/joelho", () => {
    const opportunities = classifyBusinessOpportunity("dor no joelho ao correr maratona e corrida 21km");
    expect(opportunities).toContain("Programa Corrida sem Dor / Joelho do Corredor");
  });

  it("classifica pessoa idosa com queda funcional como programa longevidade", () => {
    const opportunities = classifyBusinessOpportunity("95 anos queda de função dificuldade para caminhar fortalecimento global");
    expect(opportunities).toContain("Programa Longevidade e Prevenção de Quedas");
  });
});

describe("buildEvaluationInsights", () => {
  it("gera indicadores de cobertura, qualidade e oportunidades sem contar campos técnicos", () => {
    const insights = buildEvaluationInsights(evaluations as any);

    expect(insights.summary.totalEvaluations).toBe(3);
    expect(insights.summary.withClinicalFields).toBe(2);
    expect(insights.summary.withoutClinicalFields).toBe(1);
    expect(insights.summary.averageClinicalFieldsPerEvaluation).toBeGreaterThan(0);
    expect(insights.topKeywords.some(item => item.term === "joelho")).toBe(true);
    expect(insights.opportunities.some(item => item.name === "Programa Corrida sem Dor / Joelho do Corredor" && item.patients === 1)).toBe(true);
    expect(insights.opportunities.some(item => item.name === "Programa Longevidade e Prevenção de Quedas" && item.patients === 1)).toBe(true);
    expect(insights.quality.noClinicalContent).toEqual([
      { name: "Paciente Metadados", slug: "paciente-metadados", evaluation_id: "3" },
    ]);
  });
});
