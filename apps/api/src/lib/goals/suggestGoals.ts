export const SUGGEST_GOALS_SYSTEM =
  "Você é um fisioterapeuta. A partir de um texto de avaliação/evolução, proponha de 2 a 5 metas " +
  "terapêuticas SMART (específicas, mensuráveis), em português (PT-BR). " +
  "Prioridades válidas: baixa, media, alta, critica. " +
  "Retorne APENAS um array JSON; cada item: " +
  '{"title": string, "category"?: string, "priority": prioridade, "targetValue"?: string, "rationale"?: string}. ' +
  "title = a meta em si; targetValue = alvo mensurável (ex.: \"EVA ≤ 2/10\", \"flexão 120°\"); " +
  "rationale = justificativa clínica curta. Não invente dados que não estejam no texto.";

const PRIORITIES = ["baixa", "media", "alta", "critica"] as const;
export type GoalPriority = (typeof PRIORITIES)[number];

export type SuggestedGoal = {
  title: string;
  category?: string;
  priority: GoalPriority;
  targetValue?: string;
  rationale?: string;
};

function normalizePriority(value: unknown): GoalPriority {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["baixa", "low"].includes(v)) return "baixa";
  if (["alta", "high"].includes(v)) return "alta";
  if (["critica", "crítica", "critical"].includes(v)) return "critica";
  if (["media", "média", "medium", "normal"].includes(v)) return "media";
  return "media";
}

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/** Valida a saída do LLM em metas sugeridas. Descarta itens sem título. Aceita array ou {goals:[...]}. */
export function coerceGoals(raw: unknown): SuggestedGoal[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { goals?: unknown })?.goals)
      ? (raw as { goals: unknown[] }).goals
      : [];
  const out: SuggestedGoal[] = [];
  for (const item of arr) {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const title = str(o.title) ?? str(o.description) ?? str(o.goal_title);
    if (!title) continue;
    out.push({
      title,
      ...(str(o.category) ? { category: str(o.category) } : {}),
      priority: normalizePriority(o.priority),
      ...(str(o.targetValue) ?? str(o.target_value) ? { targetValue: str(o.targetValue) ?? str(o.target_value) } : {}),
      ...(str(o.rationale) ? { rationale: str(o.rationale) } : {}),
    });
  }
  return out;
}
