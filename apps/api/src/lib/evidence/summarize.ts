import type { Env } from "../../types/env";
import { WORKERS_AI_MODELS } from "../workersAi";
import { runAi, readAiText } from "../ai-native";

type ArticleLite = { pmid: string; title: string; abstract: string | null; fullText?: string | null };

export type SummaryModelKey = "llama-3.3-70b" | "glm-5.2";

const SUMMARY_MODELS: Record<SummaryModelKey, string> = {
  "llama-3.3-70b": WORKERS_AI_MODELS.llama_3_3_70b,
  "glm-5.2": WORKERS_AI_MODELS.glm_5_2,
};

/** Orçamento de caracteres de contexto por modelo (aprox. 3-4 chars/token). */
const CHAR_BUDGETS: Record<SummaryModelKey, number> = {
  "llama-3.3-70b": 20_000,
  "glm-5.2": 400_000,
};

export function resolveSummaryModel(key: SummaryModelKey | undefined): string {
  return SUMMARY_MODELS[key ?? "llama-3.3-70b"];
}

export function buildSummaryPrompt(
  articles: ArticleLite[],
  opts: { charBudget?: number } = {},
): string {
  const budget = opts.charBudget ?? CHAR_BUDGETS["llama-3.3-70b"];
  const perArticle = Math.floor(budget / Math.max(articles.length, 1));
  const list = articles
    .map((a, i) => {
      const parts = [`${i + 1}. [PMID ${a.pmid}] ${a.title}`, a.abstract ?? "(sem abstract)"];
      if (a.fullText) parts.push(`TEXTO COMPLETO:\n${a.fullText.slice(0, perArticle)}`);
      return parts.join("\n");
    })
    .join("\n\n");
  return [
    "Você é um assistente de evidência clínica para fisioterapeutas.",
    "Resuma os artigos abaixo em português (PT-BR), de forma objetiva.",
    "Para cada artigo dê: achado principal, aplicação clínica e o nível de evidência (ex.: meta-análise, RCT, coorte).",
    "Não invente dados que não estejam no texto.",
    "",
    list,
  ].join("\n");
}

export async function summarizeArticles(
  env: Env,
  articles: ArticleLite[],
  opts: { model?: SummaryModelKey } = {},
): Promise<{ summary: string; model: string }> {
  const modelKey = opts.model ?? "llama-3.3-70b";
  const model = resolveSummaryModel(modelKey);
  const prompt = buildSummaryPrompt(articles, { charBudget: CHAR_BUDGETS[modelKey] });
  // Conteúdo público (PubMed) — cache do gateway habilitado; telemetria vem de graça
  const res = await runAi(env, model, { messages: [{ role: "user", content: prompt }] }, { cacheTtl: 3600 });
  return { summary: readAiText(res), model };
}
