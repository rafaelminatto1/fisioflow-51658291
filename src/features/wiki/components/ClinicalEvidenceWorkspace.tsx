import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FolderPlus,
  GitCompareArrows,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type EvidenceArticle,
  useClinicalEvidenceWorkspace,
} from "@/hooks/wiki/useClinicalEvidenceWorkspace";

const PAGE_SIZE = 12;

function statusBadge(status: string) {
  if (["completed", "indexed"].includes(status)) {
    return {
      label: "Indexado",
      Icon: CheckCircle2,
      className: "text-emerald-700",
    };
  }
  if (["error", "failed"].includes(status)) {
    return {
      label: "Falha no índice",
      Icon: AlertCircle,
      className: "text-red-700",
    };
  }
  return { label: "Processando", Icon: Clock3, className: "text-amber-700" };
}

function curationLabel(status: string) {
  if (["verified", "published"].includes(status)) return "Curadoria verificada";
  if (status === "archived") return "Arquivado";
  if (status === "draft") return "Rascunho";
  return "Curadoria pendente";
}

function ArticleRow({
  article,
  checked,
  onToggle,
}: {
  article: EvidenceArticle;
  checked: boolean;
  onToggle: () => void;
}) {
  const index = statusBadge(article.indexStatus);
  return (
    <li className="rounded-xl border bg-card p-3 [content-visibility:auto]">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          disabled={!article.workspaceManaged}
          aria-label={`${checked ? "Remover" : "Selecionar"} ${article.title} para comparação`}
          title={
            article.workspaceManaged
              ? undefined
              : "Documento legado: importe o DOI/PMID para comparar"
          }
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">
            {article.title}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[
              article.authors.join(", "),
              article.journal ?? article.source,
              article.year,
            ]
              .filter(Boolean)
              .join(" • ") || "Metadados bibliográficos indisponíveis"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] ${index.className}`}
            >
              <index.Icon className="mr-1 h-3 w-3" /> {index.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {curationLabel(article.curationStatus)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Evidência: {article.evidenceLevel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {article.hasPdf ? "PDF disponível" : "Sem PDF"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Licença: {article.license || "não informada"}
            </Badge>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ClinicalEvidenceWorkspace() {
  const workspace = useClinicalEvidenceWorkspace();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [identifierType, setIdentifierType] = useState<"doi" | "pmid">("doi");
  const [identifier, setIdentifier] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const visibleArticles = workspace.articles.slice(0, visibleCount);

  function toggleArticle(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        toast.info("Compare até 3 artigos por vez.");
        return current;
      }
      return [...current, id];
    });
  }

  async function submitImport() {
    if (!identifier.trim()) return;
    try {
      await workspace.importArticle({ identifierType, identifier });
      toast.success("Artigo enviado para importação.");
      setIdentifier("");
      setIsImportOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao importar o artigo.",
      );
    }
  }

  async function openComparison() {
    try {
      await workspace.compareArticles(selectedIds);
      setIsCompareOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Falha ao comparar evidências.",
      );
    }
  }

  async function submitCollection() {
    if (!collectionName.trim()) return;
    try {
      await workspace.createCollection(collectionName);
      toast.success("Coleção criada.");
      setCollectionName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar a coleção.",
      );
    }
  }

  return (
    <section
      className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      aria-labelledby="evidence-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-950/40">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 id="evidence-title" className="text-xl font-bold">
              Evidências clínicas
            </h2>
            <p className="text-sm text-muted-foreground">
              Biblioteca científica para consulta e comparação rápida
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={selectedIds.length < 2}
            onClick={openComparison}
          >
            <GitCompareArrows className="mr-2 h-4 w-4" /> Comparar (
            {selectedIds.length}/3)
          </Button>
          <Button
            onClick={() => setIsImportOpen(true)}
            disabled={!workspace.canImport}
          >
            <Plus className="mr-2 h-4 w-4" /> Importar DOI/PMID
          </Button>
        </div>
      </div>

      {workspace.source === "knowledge" ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Modo compatibilidade ativo. Importação por identificador e coleções
          aguardam a API do workspace.
        </p>
      ) : null}

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="patient-context">Contexto do paciente</Label>
            <Input
              id="patient-context"
              disabled
              placeholder="Disponível em uma próxima etapa"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              <LockKeyhole className="mr-1 inline h-3 w-3" /> Nenhum dado
              clínico é enviado sem suporte explícito da API.
            </p>
          </div>
          <div>
            <Label htmlFor="collection-name">Nova coleção</Label>
            <div className="flex gap-2">
              <Input
                id="collection-name"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                disabled={!workspace.canUseCollections}
                placeholder="Ex.: Dor lombar"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Criar coleção"
                onClick={submitCollection}
                disabled={
                  !workspace.canUseCollections ||
                  !collectionName.trim() ||
                  workspace.isCreatingCollection
                }
              >
                {workspace.isCreatingCollection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!workspace.canUseCollections ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Coleções indisponíveis nesta API.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {workspace.isLoading ? (
        <div
          className="flex min-h-40 items-center justify-center"
          role="status"
        >
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          <span className="sr-only">Carregando evidências</span>
        </div>
      ) : workspace.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center dark:bg-red-950/10">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-3 font-semibold">
            Não foi possível carregar as evidências
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.error instanceof Error
              ? workspace.error.message
              : "Tente novamente."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => workspace.refetch()}
            disabled={workspace.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${workspace.isFetching ? "animate-spin" : ""}`}
            />{" "}
            Tentar novamente
          </Button>
        </div>
      ) : workspace.articles.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">
            Nenhuma evidência na biblioteca
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe um DOI ou PMID quando o serviço estiver disponível.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {workspace.articles.length} artigos • selecione 2–3 para comparar
            </p>
            {workspace.collections.length ? (
              <Badge variant="secondary">
                {workspace.collections.length} coleções
              </Badge>
            ) : null}
          </div>
          <ul className="space-y-2" aria-label="Artigos científicos">
            {visibleArticles.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                checked={selectedIds.includes(article.id)}
                onToggle={() => toggleArticle(article.id)}
              />
            ))}
          </ul>
          {visibleCount < workspace.articles.length ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Carregar mais
            </Button>
          ) : null}
        </>
      )}

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar evidência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Identificador</legend>
              <div className="flex gap-2">
                <Select
                  value={identifierType}
                  onValueChange={(value) =>
                    setIdentifierType(value as "doi" | "pmid")
                  }
                >
                  <SelectTrigger
                    className="w-28"
                    aria-label="Tipo do identificador"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doi">DOI</SelectItem>
                    <SelectItem value="pmid">PMID</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  aria-label={`Número ${identifierType.toUpperCase()}`}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={
                    identifierType === "doi" ? "10.1000/..." : "12345678"
                  }
                  autoCapitalize="none"
                />
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              A importação usa metadados e resumo do PubMed. PDFs só serão
              aceitos quando a licença e o direito de uso puderem ser validados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitImport}
              disabled={!identifier.trim() || workspace.isImporting}
            >
              {workspace.isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}{" "}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comparação de evidências</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {workspace.isComparing ? (
              <div
                className="col-span-full flex justify-center p-8"
                role="status"
              >
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="sr-only">Comparando evidências</span>
              </div>
            ) : (
              workspace.comparison.map((article) => (
                <Card key={article.articleId}>
                  <CardContent className="space-y-3 p-4">
                    <h3 className="text-sm font-semibold leading-snug">
                      {article.title}
                    </h3>
                    <dl className="space-y-2 text-xs">
                      <div>
                        <dt className="font-medium">Evidência</dt>
                        <dd className="text-muted-foreground">
                          {article.evidenceLevel}
                        </dd>
                      </div>
                      {[
                        ["Desenho", article.studyDesign],
                        ["População", article.population],
                        ["Intervenção", article.intervention],
                        ["Comparador", article.comparator],
                        ["Desfechos", article.outcomes],
                        ["Amostra", article.sampleSize],
                        ["Limitações", article.limitations],
                        ["Conclusão", article.conclusion],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="font-medium">{label}</dt>
                          <dd className="text-muted-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
