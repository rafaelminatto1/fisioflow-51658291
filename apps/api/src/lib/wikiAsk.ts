import type { AiSearchSource } from "./cloudflareAiSearch";

export const ASK_MATCH_THRESHOLD = 0.3;

const INTERNAL_ROLES = new Set([
  "admin",
  "owner",
  "fisioterapeuta",
  "professional",
  "estagiario",
  "intern",
]);

export function isInternalRole(role?: string | null): boolean {
  return INTERNAL_ROLES.has(String(role ?? "").toLowerCase());
}

export type AskOutcome = {
  answered: boolean;
  topScore: number;
};

// Sem fonte confiável não há resposta — melhor "não encontrei" do que inventar.
export function resolveAskOutcome(
  answer: string,
  sources: AiSearchSource[],
  threshold: number,
): AskOutcome {
  const topScore = sources.reduce((max, s) => Math.max(max, s.score ?? 0), 0);
  const answered = topScore >= threshold && answer.trim().length > 0;
  return { answered, topScore };
}

export type AskSource = {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  score: number;
};

export function mapAskSources(sources: AiSearchSource[], threshold: number): AskSource[] {
  return sources
    .filter((s) => (s.score ?? 0) >= threshold)
    .map((s) => ({
      id: s.id,
      title: String(s.metadata?.title ?? s.filename),
      slug: String(s.metadata?.slug ?? ""),
      category: String(s.metadata?.category ?? "geral"),
      type: String(s.metadata?.source ?? s.metadata?.type ?? "wiki"),
      score: s.score ?? 0,
    }));
}

export function normalizeAskQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 256);
}

export function customMetadataFilterForType(type: unknown): Record<string, unknown> | undefined {
  if (typeof type !== "string") return undefined;
  // Now using the custom_metadata field 'source' that is configured in the v2 instances
  return { source: { $eq: type } };
}
