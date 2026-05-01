import type { AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";

export type ClinicalTrend = "positive" | "neutral" | "negative";

export function safeText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export function inferRiskLevel(text: string): ClinicalTrend {
  const lower = text.toLowerCase();
  if (/piora|regredi|falha|dor intensa|recidiva/.test(lower)) return "negative";
  if (/melhora|evolução|progress|adher|boa resposta/.test(lower)) return "positive";
  return "neutral";
}

export function buildClinicalReport(
  metrics: Record<string, unknown>,
  history?: Record<string, unknown>,
) {
  return {
    summary: "Análise clínica baseada nos dados fornecidos.",
    metrics,
    history: history ?? null,
    trend: inferRiskLevel(JSON.stringify(metrics)),
    generatedAt: new Date().toISOString(),
  };
}

export function buildFormSuggestions(context: string): string[] {
  const base = ["Escala de dor (EVA)", "Amplitude de movimento", "Força muscular"];
  if (/coluna|lombar|cervical/.test(context.toLowerCase()))
    base.push("Teste de Lasègue", "Schober");
  if (/joelho|quadril/.test(context.toLowerCase())) base.push("Teste de McMurray", "Lachman");
  return base;
}

export function buildExecutiveSummary(body: Record<string, unknown>) {
  const patientCount = (body.patientCount as number) ?? 0;
  const sessionCount = (body.sessionCount as number) ?? 0;
  return {
    highlights: [`${patientCount} pacientes ativos`, `${sessionCount} sessões realizadas`],
    insights: "Desempenho clínico dentro dos parâmetros esperados.",
    recommendations: ["Manter frequência de reavaliações", "Monitorar adesão ao plano domiciliar"],
    generatedAt: new Date().toISOString(),
  };
}

export function buildSoapFromText(text: string) {
  // This will now be handled by a real LLM prompt in the route if needed,
  // but keeping the fallback logic here.
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    subjective:
      lines.slice(0, 2).join(" ") || "Paciente relata evolução clínica em acompanhamento.",
    objective: lines.slice(2, 4).join(" ") || "Avaliação objetiva pendente de complementação.",
    assessment:
      lines.slice(4, 6).join(" ") ||
      "Quadro compatível com seguimento fisioterapêutico sem red flags evidentes.",
    plan:
      lines.slice(6, 8).join(" ") ||
      "Manter plano terapêutico, reforçar adesão e reavaliar na próxima sessão.",
  };
}

export function splitIntoChunks(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Re-export types for sub-routes that need them
export type { Env, AuthVariables };
