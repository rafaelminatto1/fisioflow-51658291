import { knowledgeApi } from "@/api/v2";
import type { KnowledgeArtifact, KnowledgeNote } from "../types/knowledge";

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "string" || value instanceof Date) return new Date(value).getTime();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

function mapArtifact(raw: Record<string, unknown>): KnowledgeArtifact {
  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  return {
    id: String(raw.id),
    organizationId: String(raw.organizationId ?? raw.organization_id ?? ""),
    title: String(raw.title ?? ""),
    type: String(raw.type ?? "pdf") as KnowledgeArtifact["type"],
    url: String(raw.url ?? ""),
    group: String(raw.group ?? "Ortopedia") as KnowledgeArtifact["group"],
    subgroup: String(raw.subgroup ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    evidenceLevel: String(
      raw.evidenceLevel ?? raw.evidence ?? "Consensus",
    ) as KnowledgeArtifact["evidenceLevel"],
    status: String(raw.status ?? "pending") as KnowledgeArtifact["status"],
    summary: raw.summary ? String(raw.summary) : undefined,
    keyFindings: Array.isArray(raw.keyFindings) ? raw.keyFindings.map(String) : [],
    clinicalImplications: Array.isArray(raw.clinicalImplications)
      ? raw.clinicalImplications.map(String)
      : [],
    vectorStatus: String(raw.vectorStatus ?? "pending") as KnowledgeArtifact["vectorStatus"],
    metadata: {
      year: Number(metadata.year ?? raw.year ?? new Date().getFullYear()),
      authors: Array.isArray(metadata.authors)
        ? (metadata.authors as KnowledgeArtifact["metadata"]["authors"])
        : [],
      journal: metadata.journal
        ? String(metadata.journal)
        : raw.source
          ? String(raw.source)
          : undefined,
      doi: metadata.doi ? String(metadata.doi) : undefined,
      publisher: metadata.publisher ? String(metadata.publisher) : undefined,
    },
    viewCount: Number(raw.viewCount ?? raw.view_count ?? 0),
    citationCount: raw.citationCount == null ? undefined : Number(raw.citationCount),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    createdBy: String(raw.createdBy ?? raw.created_by ?? ""),
  };
}

function mapNote(raw: Record<string, unknown>): KnowledgeNote {
  return {
    id: String(raw.id),
    artifactId: String(raw.article_id ?? raw.artifactId ?? ""),
    userId: String(raw.user_id ?? raw.userId ?? ""),
    content: String(raw.content ?? ""),
    pageRef: raw.page_ref == null ? undefined : Number(raw.page_ref),
    highlightColor: raw.highlight_color ? String(raw.highlight_color) : undefined,
    createdAt: raw.created_at ?? new Date().toISOString(),
  };
}

export const knowledgeService = {
  // --- Artifacts (Papers/Docs) ---

  async listArtifacts(organizationId: string, group?: string): Promise<KnowledgeArtifact[]> {
    try {
      const artifacts = ((await knowledgeApi.listArticles()).data ?? []).map((row) =>
        mapArtifact(row as unknown as Record<string, unknown>),
      );
      const filtered =
        group && group !== "Todas"
          ? artifacts.filter((artifact) => artifact.group === group)
          : artifacts;
      return filtered.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
    } catch (error) {
      console.error("Error listing knowledge artifacts:", error);
      return [];
    }
  },

  async createArtifact(
    data: Omit<KnowledgeArtifact, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const result = await knowledgeApi.createArticle(data as unknown as Record<string, unknown>);
    return String(result.data.id);
  },

  async updateArtifact(id: string, data: Partial<KnowledgeArtifact>): Promise<void> {
    await knowledgeApi.updateArticle(id, data as unknown as Record<string, unknown>);
  },

  // --- Notes (NotebookLM feature) ---

  async listNotes(artifactId: string, userId: string): Promise<KnowledgeNote[]> {
    const notes = (await knowledgeApi.listNotes(artifactId)).data ?? [];
    return notes.map((note) => mapNote(note)).filter((note) => note.userId === userId);
  },

  async addNote(note: Omit<KnowledgeNote, "id" | "createdAt">): Promise<string> {
    const result = await knowledgeApi.addNote(
      note.artifactId,
      note as unknown as Record<string, unknown>,
    );
    return String(result.data.id);
  },
};
