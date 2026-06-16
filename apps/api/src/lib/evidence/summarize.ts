import type { Env } from "../../types/env";
import { WORKERS_AI_MODELS } from "../workersAi";

type ArticleLite = { pmid: string; title: string; abstract: string | null };

export function buildSummaryPrompt(articles: ArticleLite[]): string {
  const list = articles
    .map((a, i) => `${i + 1}. [PMID ${a.pmid}] ${a.title}\n${a.abstract ?? "(sem abstract)"}`)
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

export async function summarizeArticles(env: Env, articles: ArticleLite[]): Promise<string> {
  const prompt = buildSummaryPrompt(articles);
  const model = WORKERS_AI_MODELS.llama_3_3_70b;
  const res: any = await env.AI.run(model, { messages: [{ role: "user", content: prompt }] });
  return res?.response ?? res?.result?.response ?? "";
}
