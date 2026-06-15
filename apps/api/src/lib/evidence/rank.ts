import type { EvidenceArticle } from "./types";

const STUDY_WEIGHT: Record<string, number> = {
  "meta-analysis": 50,
  "systematic review": 45,
  "randomized controlled trial": 40,
  "clinical trial": 25,
  "cohort": 15,
  "case-control": 10,
  "case reports": 2,
};

function studyScore(t: string | null): number {
  if (!t) return 5;
  const key = t.toLowerCase();
  for (const [k, w] of Object.entries(STUDY_WEIGHT)) if (key.includes(k)) return w;
  return 5;
}

function yearScore(pubDate: string | null): number {
  if (!pubDate) return 0;
  const m = pubDate.match(/\d{4}/);
  if (!m) return 0;
  const age = new Date().getFullYear() - Number(m[0]);
  return Math.max(0, 30 - age);
}

function matchScore(title: string, query: string): number {
  if (!query) return 0;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const lc = title.toLowerCase();
  return terms.reduce((s, t) => (lc.includes(t) ? s + 10 : s), 0);
}

export function rankArticles(arts: EvidenceArticle[], query: string): EvidenceArticle[] {
  return [...arts].sort(
    (a, b) =>
      studyScore(b.studyType) + yearScore(b.pubDate) + matchScore(b.title, query) -
      (studyScore(a.studyType) + yearScore(a.pubDate) + matchScore(a.title, query)),
  );
}
