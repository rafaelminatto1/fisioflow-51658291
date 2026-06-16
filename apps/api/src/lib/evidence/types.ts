import { z } from "zod";

export interface EvidenceArticle {
  pmid: string;
  doi: string | null;
  source: "pubmed" | "europepmc" | "openalex";
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  pubDate: string | null;
  mesh: string[];
  pmcId: string | null;
  oaStatus: "open" | "closed" | "unknown";
  studyType: string | null;
  url: string;
  raw?: unknown;
}

export const SearchParamsSchema = z
  .object({
    q: z.string().trim().default(""),
    p: z.string().trim().optional(),
    i: z.string().trim().optional(),
    c: z.string().trim().optional(),
    o: z.string().trim().optional(),
    from: z.string().regex(/^\d{4}(\/\d{2}(\/\d{2})?)?$/).optional(),
    to: z.string().regex(/^\d{4}(\/\d{2}(\/\d{2})?)?$/).optional(),
    type: z.string().trim().optional(),
    sort: z.enum(["relevance", "date"]).default("relevance"),
    limit: z.coerce.number().int().min(1).default(10).transform((v) => Math.min(v, 50)),
  })
  .refine(
    (v) => v.q.length >= 3 || [v.p, v.i, v.c, v.o].some((x) => (x?.length ?? 0) >= 3),
    { message: "Forneça uma query (>=3 chars) ou termos PICO" },
  );

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const SummarizeBodySchema = z.object({
  pmids: z.array(z.string().regex(/^\d+$/)).min(1).max(20),
});

export const SaveBodySchema = z.object({
  pmid: z.string().regex(/^\d+$/),
  targetType: z.enum(["exercise", "protocol", "wiki", "patient", "assessment"]),
  targetId: z.string().min(1),
  evidenceLevel: z.string().max(40).optional(),
  note: z.string().max(2000).optional(),
});
