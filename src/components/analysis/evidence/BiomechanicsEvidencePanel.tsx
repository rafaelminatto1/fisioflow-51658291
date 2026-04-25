import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Library, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import {
  biomechanicsProtocols,
  normalizeEvidenceText,
  type BiomechanicsEvidenceArticle,
  type BiomechanicsEvidenceMode,
} from "@/data/biomechanicsEvidence";
import { knowledgeBaseService } from "@/lib/services/knowledgeBaseService";
import { wikiService } from "@/lib/services/wikiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function buildWikiArticleMarkdown(
  mode: BiomechanicsEvidenceMode,
  article: BiomechanicsEvidenceArticle,
) {
  const protocol = biomechanicsProtocols[mode];

  return [
    `# ${article.title}`,
    "",
    `**Protocolo relacionado:** ${protocol.title}`,
    `**Autores:** ${article.authors}`,
    `**Ano:** ${article.year}`,
    `**Periódico:** ${article.journal}`,
    article.doi ? `**DOI:** ${article.doi}` : null,
    `**Fonte original:** ${article.url}`,
    "",
    "## Resumo clínico",
    article.summary,
    "",
    "## Aplicação prática na clínica",
    article.clinicalTakeaway,
    "",
    "## Pontos de uso no sistema",
    ...protocol.keyPoints.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

export function matchesEvidenceArticle(
  title: string,
  tags: string[],
  article: BiomechanicsEvidenceArticle,
) {
  const normalizedTitle = normalizeEvidenceText(title);
  const articleTitle = normalizeEvidenceText(article.title);
  const tagSet = new Set(tags.map(normalizeEvidenceText));
  return (
    normalizedTitle === articleTitle ||
    tagSet.has(normalizeEvidenceText(`paper ${article.id}`)) ||
    tagSet.has(normalizeEvidenceText(`analysis ${article.id}`)) ||
    tagSet.has(normalizeEvidenceText(`doi ${article.doi ?? ""}`))
  );
}

export function BiomechanicsEvidencePanel({ mode }: { mode: BiomechanicsEvidenceMode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, organizationId } = useAuth();
  const currentOrganizationId = organizationId ?? profile?.organization_id ?? undefined;
  const currentUserId = user?.uid ?? profile?.user_id ?? profile?.id ?? undefined;
  const protocol = biomechanicsProtocols[mode];

  const { data: knowledgeArticles = [] } = useQuery({
    queryKey: ["biomechanics-evidence-articles", currentOrganizationId],
    queryFn: () =>
      currentOrganizationId
        ? knowledgeBaseService.listArticles(currentOrganizationId)
        : Promise.resolve([]),
    enabled: Boolean(currentOrganizationId),
  });

  const { data: wikiPages = [] } = useQuery({
    queryKey: ["biomechanics-evidence-wiki", currentOrganizationId],
    queryFn: () =>
      currentOrganizationId ? wikiService.listPages(currentOrganizationId) : Promise.resolve([]),
    enabled: Boolean(currentOrganizationId),
  });

  const resolvedArticles = useMemo(
    () =>
      protocol.articles.map((article) => {
        const wikiPage =
          wikiPages.find((page) => matchesEvidenceArticle(page.title, page.tags ?? [], article)) ??
          null;
        const knowledgeArticle =
          knowledgeArticles.find(
            (item) =>
              normalizeEvidenceText(item.title) === normalizeEvidenceText(article.title) ||
              item.url === article.url ||
              normalizeEvidenceText(item.metadata?.doi ?? "") ===
                normalizeEvidenceText(article.doi ?? ""),
          ) ?? null;
        return { article, wikiPage, knowledgeArticle };
      }),
    [knowledgeArticles, protocol.articles, wikiPages],
  );

  const createWikiEntry = useMutation({
    mutationFn: async (article: BiomechanicsEvidenceArticle) => {
      if (!currentOrganizationId || !currentUserId) {
        throw new Error("Sessão inválida para criar artigo na wiki.");
      }

      const existing = resolvedArticles.find((item) => item.article.id === article.id) ?? null;

      if (!existing?.knowledgeArticle) {
        await knowledgeBaseService.createArticle({
          id: `biomechanics-${mode}-${article.id}`,
          title: article.title,
          group: article.group,
          subgroup: article.subgroup,
          focus: [protocol.title, ...article.tags],
          evidence: article.evidence,
          year: article.year,
          source: article.journal,
          url: article.url,
          status: "verified",
          tags: [...article.tags, "biomechanics", mode],
          highlights: [article.summary, article.clinicalTakeaway],
          observations: protocol.keyPoints,
          keyQuestions: [`Como aplicar ${protocol.title.toLowerCase()} na clínica?`],
          summary: article.summary,
          metadata: {
            journal: article.journal,
            authors: article.authors.split(",").map((item) => item.trim()),
            doi: article.doi,
            mode,
          },
        });
      }

      if (!existing?.wikiPage) {
        await wikiService.savePage(currentOrganizationId, currentUserId, {
          title: article.title,
          slug: `evidence-${mode}-${article.id}`,
          content: buildWikiArticleMarkdown(mode, article),
          organization_id: currentOrganizationId,
          created_by: currentUserId,
          updated_by: currentUserId,
          tags: [
            "evidence",
            "biomechanics",
            mode,
            `paper:${article.id}`,
            ...(article.doi ? [`doi:${article.doi}`] : []),
          ],
          category: "Evidência científica",
          is_published: true,
          view_count: 0,
          attachments: [],
        });
      }
    },
    onSuccess: async (_, article) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["biomechanics-evidence-articles", currentOrganizationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["biomechanics-evidence-wiki", currentOrganizationId],
        }),
      ]);
      toast.success(`"${article.title}" foi adicionado à wiki clínica.`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível adicionar o artigo à wiki.",
      );
    },
  });

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Evidência científica
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Artigos e documentação clínica associados a {protocol.title.toLowerCase()}.
            </p>
          </div>
          <Badge variant="outline">{protocol.subtitle}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {protocol.keyPoints.map((point) => (
            <Badge key={point} variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
              {point}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {resolvedArticles.map(({ article, wikiPage }) => (
          <div key={article.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{article.year}</Badge>
                  <Badge variant="secondary">{article.journal}</Badge>
                </div>
                <h3 className="text-sm font-semibold leading-snug text-slate-900">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground">{article.authors}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">{article.summary}</p>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <strong>Aplicação clínica:</strong> {article.clinicalTakeaway}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={article.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ler artigo
                </a>
              </Button>

              {wikiPage ? (
                <Button size="sm" onClick={() => navigate(`/wiki/${wikiPage.slug}`)}>
                  <Library className="mr-2 h-4 w-4" />
                  Ler na wiki
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => createWikiEntry.mutate(article)}
                  disabled={createWikiEntry.isPending}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar à wiki
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
