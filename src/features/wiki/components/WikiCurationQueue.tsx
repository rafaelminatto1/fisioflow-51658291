import { useDeferredValue, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CURATION_TABS,
  editorialStatusLabel,
  filtersFromSearchParams,
  technicalStatusLabel,
  writeCurationFilters,
} from "@/features/wiki/curation/curationUtils";
import type {
  CurationQueueFilters,
  CurationQueueItem,
} from "@/features/wiki/types/curation";
import { useWikiCuration } from "@/hooks/wiki/useWikiCuration";
import { WikiCurationDetail } from "./WikiCurationDetail";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-BR");
}

function QueueRow({
  item,
  onOpen,
}: {
  item: CurationQueueItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full gap-2 border-b p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.kind} •{" "}
          {item.provenance?.sourceTitle ||
            item.provenance?.sourceType ||
            "Origem não informada"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">
          {editorialStatusLabel(item.editorialStatus)}
        </Badge>
        <Badge
          variant={
            item.technicalStatus === "failed" ? "destructive" : "outline"
          }
        >
          {technicalStatusLabel(item.technicalStatus)}
        </Badge>
      </div>
      <div className="text-xs">
        <span className="md:hidden text-muted-foreground">Responsável: </span>
        {item.assignee?.name || "Sem responsável"}
      </div>
      <div className="text-xs">
        <span className="md:hidden text-muted-foreground">Prazo: </span>
        {formatDate(item.dueAt)}
        {item.priority ? ` • ${item.priority}` : ""}
      </div>
      <ChevronRight className="hidden h-4 w-4 text-muted-foreground md:block" />
    </button>
  );
}

export function WikiCurationQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilters = filtersFromSearchParams(searchParams);
  const [queryInput, setQueryInput] = useState(urlFilters.q || "");
  const deferredQuery = useDeferredValue(queryInput);
  const filters = { ...urlFilters, q: deferredQuery || undefined };
  const [selectedItem, setSelectedItem] = useState<CurationQueueItem>();
  const curation = useWikiCuration(filters, selectedItem?.id);

  function updateFilters(patch: Partial<CurationQueueFilters>) {
    const nextFilters = { ...urlFilters, ...patch };
    setSearchParams(writeCurationFilters(searchParams, nextFilters), {
      replace: true,
    });
  }

  if (curation.capabilitiesLoading) {
    return (
      <div className="flex min-h-56 items-center justify-center" role="status">
        <Loader2 className="h-7 w-7 animate-spin" />
        <span className="sr-only">Carregando permissões</span>
      </div>
    );
  }
  if (curation.capabilitiesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível verificar suas capacidades editoriais. Tente
          novamente em alguns instantes.
        </AlertDescription>
      </Alert>
    );
  }
  if (!curation.canManageLibrary) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você não possui capacidade editorial para acessar a Gestão da
          Biblioteca.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section
      className="min-w-0 space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      aria-labelledby="curation-title"
    >
      <div>
        <h2 id="curation-title" className="text-xl font-bold">
          Gestão da Biblioteca
        </h2>
        <p className="text-sm text-muted-foreground">
          Fila operacional com confiança clínica e processamento técnico
          separados.
        </p>
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]"
        role="tablist"
        aria-label="Etapas da curadoria"
      >
        {CURATION_TABS.map((tab) => (
          <Button
            key={tab.value}
            role="tab"
            aria-selected={filters.status === tab.value}
            variant={filters.status === tab.value ? "default" : "ghost"}
            size="sm"
            className="shrink-0"
            onClick={() => updateFilters({ status: tab.value })}
          >
            {tab.label}
            <Badge variant="secondary" className="ml-2 tabular-nums">
              {curation.counts[tab.value] ?? 0}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Label htmlFor="curation-search" className="sr-only">
            Buscar na fila
          </Label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="curation-search"
            value={queryInput}
            onChange={(event) => {
              setQueryInput(event.target.value);
              updateFilters({ q: event.target.value || undefined });
            }}
            placeholder="Buscar título ou fonte"
            className="pl-9"
          />
        </div>
        <Select
          value={filters.priority || "all"}
          onValueChange={(value) =>
            updateFilters({ priority: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger aria-label="Filtrar por prioridade">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda prioridade</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.validity || "all"}
          onValueChange={(value) =>
            updateFilters({ validity: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger aria-label="Filtrar por validade">
            <SelectValue placeholder="Validade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda validade</SelectItem>
            <SelectItem value="valid">Vigente</SelectItem>
            <SelectItem value="expiring">Vencendo</SelectItem>
            <SelectItem value="expired">Vencida</SelectItem>
            <SelectItem value="unknown">Não informada</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.kind || "all"}
          onValueChange={(value) =>
            updateFilters({ kind: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger aria-label="Filtrar por tipo">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo tipo</SelectItem>
            <SelectItem value="article">Artigo</SelectItem>
            <SelectItem value="guideline">Diretriz</SelectItem>
            <SelectItem value="protocol">Protocolo</SelectItem>
            <SelectItem value="clinical_content">Conteúdo clínico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {curation.queueQuery.isLoading ? (
        <div
          className="flex min-h-56 items-center justify-center"
          role="status"
        >
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="sr-only">Carregando fila</span>
        </div>
      ) : curation.queueQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="mt-3 font-semibold">
            Não foi possível carregar a fila
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {curation.queueQuery.error instanceof Error
              ? curation.queueQuery.error.message
              : "Tente novamente."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => curation.queueQuery.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : curation.items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">Nenhum item nesta etapa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A fila está em dia ou os filtros não encontraram resultados.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(120px,1fr)_auto] gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground md:grid">
            <span>Item</span>
            <span>Estados</span>
            <span>Responsável</span>
            <span>Prazo</span>
            <span className="sr-only">Abrir</span>
          </div>
          {curation.items.map((item) => (
            <QueueRow
              key={`${item.id}-${item.versionId}`}
              item={item}
              onOpen={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {curation.queueQuery.hasNextPage ? (
        <Button
          variant="outline"
          className="w-full"
          disabled={curation.queueQuery.isFetchingNextPage}
          onClick={() => curation.queueQuery.fetchNextPage()}
        >
          {curation.queueQuery.isFetchingNextPage ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Carregar mais
        </Button>
      ) : null}

      <WikiCurationDetail
        open={Boolean(selectedItem)}
        item={selectedItem}
        detail={curation.detail}
        isLoading={curation.detailQuery.isLoading}
        error={curation.detailQuery.error}
        transitionPending={curation.transitionPending}
        onOpenChange={(open) => !open && setSelectedItem(undefined)}
        onRetry={() => curation.detailQuery.refetch()}
        onTransition={curation.transition}
      />
    </section>
  );
}
