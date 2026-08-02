import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import type { KnowledgeArticleRow } from "@/types/workers";

export type EvidenceCapability = "import" | "collections" | "patientContext";

export interface EvidenceArticle {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  journal?: string;
  year?: number;
  doi?: string;
  pmid?: string;
  source?: string;
  evidenceLevel: string;
  curationStatus: string;
  indexStatus: string;
  license?: string;
  hasPdf: boolean;
  collectionIds: string[];
  workspaceManaged: boolean;
}

export interface EvidenceCollection {
  id: string;
  name: string;
  articleCount?: number;
}

export interface EvidenceComparison {
  articleId: string;
  title: string;
  studyDesign: string;
  population: string;
  intervention: string;
  comparator: string;
  outcomes: string;
  sampleSize: string;
  limitations: string;
  evidenceLevel: string;
  conclusion: string;
}

interface WorkspaceData {
  articles: EvidenceArticle[];
  collections: EvidenceCollection[];
  capabilities: EvidenceCapability[];
  source: "workspace" | "knowledge";
}

type ApiError = Error & { status?: number };

const WORKSPACE_QUERY_KEY = ["clinical-evidence-workspace"] as const;

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeArticle(value: unknown): EvidenceArticle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = String(row.id ?? row.article_id ?? "");
  const title = String(row.title ?? "");
  if (!id || !title) return null;
  const pdfUrl = row.pdfUrl ?? row.pdf_url ?? row.fileUrl ?? row.file_url;

  return {
    id,
    title,
    authors: stringArray(row.authors),
    abstract: typeof row.abstract === "string" ? row.abstract : undefined,
    journal: typeof row.journal === "string" ? row.journal : undefined,
    year:
      typeof row.year === "number"
        ? row.year
        : typeof row.pub_date === "string"
          ? Number.parseInt(row.pub_date.slice(0, 4), 10) || undefined
          : undefined,
    doi: typeof row.doi === "string" ? row.doi : undefined,
    pmid: typeof row.pmid === "string" ? row.pmid : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    evidenceLevel: String(
      row.evidenceLevel ??
        row.evidence_level ??
        row.evidence ??
        "Não classificada",
    ),
    curationStatus: String(
      row.curationStatus ??
        row.curation_status ??
        row.review_status ??
        row.status ??
        "pending",
    ),
    indexStatus: String(
      row.indexStatus ??
        row.index_status ??
        row.vectorStatus ??
        row.vector_status ??
        "pending",
    ),
    license:
      typeof (row.license ?? row.license_status) === "string"
        ? String(row.license ?? row.license_status)
        : undefined,
    hasPdf: Boolean(row.hasPdf ?? row.has_pdf ?? pdfUrl),
    collectionIds: stringArray(row.collectionIds ?? row.collection_ids),
    workspaceManaged: Boolean(row.article_id ?? row.workspaceManaged),
  };
}

function normalizeArticles(value: unknown): EvidenceArticle[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const article = normalizeArticle(item);
        return article ? [article] : [];
      })
    : [];
}

function normalizeCollections(value: unknown): EvidenceCollection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (!row.id || !row.name) return [];
    return [
      {
        id: String(row.id),
        name: String(row.name),
        articleCount:
          typeof row.articleCount === "number"
            ? row.articleCount
            : typeof row.article_count === "number"
              ? row.article_count
              : undefined,
      },
    ];
  });
}

function parseCapabilities(value: unknown): EvidenceCapability[] {
  const result: EvidenceCapability[] = [];
  if (!value || typeof value !== "object") return result;
  const flags = value as Record<string, unknown>;
  if (flags.import === true || flags.importArticles === true)
    result.push("import");
  if (flags.collections === true) result.push("collections");
  if (flags.patientContext === true || flags.patient_context === true) {
    result.push("patientContext");
  }
  return result;
}

async function fetchWorkspace(): Promise<WorkspaceData> {
  try {
    const articles: EvidenceArticle[] = [];
    let collections: EvidenceCollection[] = [];
    let capabilities: EvidenceCapability[] = [];
    let cursor: { updatedAt: string; id: string } | null = null;
    do {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) {
        params.set("cursorUpdatedAt", cursor.updatedAt);
        params.set("cursorId", cursor.id);
      }
      const response = await request<Record<string, unknown>>(
        `/api/evidence-workspace/workspace?${params}`,
      );
      const payload =
        response.data && typeof response.data === "object"
          ? (response.data as Record<string, unknown>)
          : response;
      articles.push(...normalizeArticles(payload.articles ?? payload.items));
      collections = normalizeCollections(payload.collections);
      capabilities = parseCapabilities(
        payload.capabilities ?? response.capabilities,
      );
      const meta =
        response.meta && typeof response.meta === "object"
          ? (response.meta as Record<string, unknown>)
          : {};
      const next = meta.nextCursor;
      cursor =
        meta.hasMore === true && next && typeof next === "object"
          ? {
              updatedAt: String((next as Record<string, unknown>).updatedAt),
              id: String((next as Record<string, unknown>).id),
            }
          : null;
    } while (cursor);
    const legacy = await request<{ data: KnowledgeArticleRow[] }>(
      "/api/knowledge/articles?limit=100",
    ).catch(() => ({ data: [] }));
    const legacyArticles = normalizeArticles(legacy.data);
    const knownIds = new Set(articles.map((article) => article.id));
    return {
      articles: [
        ...articles,
        ...legacyArticles.filter((article) => !knownIds.has(article.id)),
      ],
      collections,
      capabilities,
      source: "workspace",
    };
  } catch (error) {
    if (![404, 501, 503].includes((error as ApiError).status ?? 0)) throw error;
    const fallback = await request<{ data: KnowledgeArticleRow[] }>(
      "/api/knowledge/articles?limit=100",
    );
    return {
      articles: normalizeArticles(fallback.data),
      collections: [],
      capabilities: [],
      source: "knowledge",
    };
  }
}

export interface ImportEvidenceInput {
  identifierType: "doi" | "pmid";
  identifier: string;
}

export function useClinicalEvidenceWorkspace() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: fetchWorkspace,
    staleTime: 5 * 60 * 1000,
  });

  const importMutation = useMutation({
    mutationFn: async ({ identifierType, identifier }: ImportEvidenceInput) =>
      request("/api/evidence-workspace/import", {
        method: "POST",
        body: JSON.stringify({
          type: identifierType,
          identifier: identifier.trim(),
        }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY }),
  });

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) =>
      request("/api/evidence-workspace/collections", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEY }),
  });

  const compareMutation = useMutation({
    mutationFn: (articleIds: string[]) =>
      request<{ data: EvidenceComparison[] }>(
        "/api/evidence-workspace/compare",
        {
          method: "POST",
          body: JSON.stringify({ articleIds }),
        },
      ).then((response) => response.data),
  });

  const capabilities = Array.isArray(query.data?.capabilities)
    ? query.data.capabilities
    : [];

  return {
    ...query,
    articles: query.data?.articles ?? [],
    collections: query.data?.collections ?? [],
    source: query.data?.source,
    canImport: capabilities.includes("import"),
    canUseCollections: capabilities.includes("collections"),
    canUsePatientContext: capabilities.includes("patientContext"),
    importArticle: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    importError: importMutation.error,
    createCollection: createCollectionMutation.mutateAsync,
    isCreatingCollection: createCollectionMutation.isPending,
    compareArticles: compareMutation.mutateAsync,
    comparison: compareMutation.data ?? [],
    isComparing: compareMutation.isPending,
    compareError: compareMutation.error,
  };
}
