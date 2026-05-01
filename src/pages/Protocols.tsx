import { Brain, Download, Filter, Grid3X3, List, Loader2, PlusCircle, Search, Send, SortAsc, Target } from "lucide-react";
import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { NewProtocolModal } from "@/components/modals/NewProtocolModal";
import { ProtocolCardEnhanced } from "@/components/protocols/ProtocolCardEnhanced";
import { ProtocolDetailView } from "@/components/protocols/ProtocolDetailView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getQuickTemplateCounts,
  MUSCULATURE_FILTERS,
  PROTOCOL_CATEGORIES,
  SEED_PROTOCOLS_DATA,
} from "@/data/protocols";
import { useToast } from "@/hooks/use-toast";
import { type ExerciseProtocol, useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { useProtocolFilters } from "@/hooks/useProtocolFilters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getWorkersApiUrl } from "@/lib/api/config";

export default function Protocols() {
  const {
    protocols,
    loading,
    error,
    refetch,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    isCreating,
    isUpdating,
    isDeleting,
  } = useExerciseProtocols();

  const quickTemplateCounts = getQuickTemplateCounts(protocols);
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const {
    activeTemplate,
    setActiveTemplate,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    muscleFilter,
    setMuscleFilter,
    viewMode,
    setViewMode,
    filteredProtocols,
  } = useProtocolFilters(protocols);

  const [selectedProtocol, setSelectedProtocol] = useState<ExerciseProtocol | null>(null);
  const [showNewProtocolModal, setShowNewProtocolModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // FisioBrain related evidence state
  const [fbQuery, setFbQuery] = useState("");
  const [fbLoading, setFbLoading] = useState(false);
  const [fbResult, setFbResult] = useState<{
    answer: string;
    sources: Array<{ id: string; title: string; source: string; excerpt: string }>;
  } | null>(null);

  const FB_BADGES: Record<string, { label: string; cls: string }> = {
    paper: { label: "Artigo", cls: "bg-violet-100 text-violet-700" },
    wiki: { label: "Wiki", cls: "bg-blue-100 text-blue-700" },
    protocol: { label: "Protocolo", cls: "bg-emerald-100 text-emerald-700" },
    exercise: { label: "Exercício", cls: "bg-amber-100 text-amber-700" },
  };

  async function searchFB() {
    if (!fbQuery.trim() || fbQuery.trim().length < 3) return;
    setFbLoading(true);
    try {
      const params = new URLSearchParams({ q: fbQuery.trim() });
      const res = await fetch(`${getWorkersApiUrl()}/api/fisiobrain/search?${params}`);
      const json = await res.json();
      setFbResult(json);
    } catch {
      // silent
    } finally {
      setFbLoading(false);
    }
  }

  // Auto-search when a protocol is selected
  useEffect(() => {
    if (selectedProtocol) {
      const q = selectedProtocol.name || "";
      setFbQuery(q);
      setFbResult(null);
    }
  }, [selectedProtocol?.id]);

  const handleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]));
    toast({
      title: favorites.includes(id) ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: "Sua lista de protocolos foi atualizada.",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProtocol(deleteId);
      setDeleteId(null);
      if (selectedProtocol?.id === deleteId) {
        setSelectedProtocol(null);
      }
    }
  };

  const handleSubmitProtocol = (
    data: Omit<ExerciseProtocol, "id" | "created_at" | "updated_at">,
  ) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
    setShowNewProtocolModal(false);
    setEditingProtocol(null);
  };

  const handleDuplicate = (protocol: ExerciseProtocol) => {
    const { id: _id, created_at: _created_at, updated_at: _updated_at, ...data } = protocol;
    createProtocol({
      ...data,
      name: `${data.name} (Cópia)`,
    });
    toast({
      title: "Protocolo duplicado",
      description: "Uma cópia do protocolo foi criada com sucesso.",
    });
  };

  const handleLoadSeedProtocols = () => {
    setIsSeeding(true);
    SEED_PROTOCOLS_DATA.forEach((seed) => {
      createProtocol(seed as Omit<ExerciseProtocol, "id" | "created_at" | "updated_at">);
    });
    toast({
      title: "Protocolos de exemplo carregados",
      description: `${SEED_PROTOCOLS_DATA.length} protocolos foram criados. Atualize a página se não aparecerem.`,
    });
    setIsSeeding(false);
  };

  if (selectedProtocol) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 max-w-7xl pb-24 md:pb-12">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-8">
              <ProtocolDetailView
                protocol={selectedProtocol}
                onBack={() => setSelectedProtocol(null)}
                onEdit={() => {
                  setEditingProtocol(selectedProtocol);
                  setShowNewProtocolModal(true);
                }}
                onDelete={() => setDeleteId(selectedProtocol.id)}
              />
            </div>

            {/* FisioBrain Related Evidence Sidebar */}
            <aside className="rounded-2xl border border-violet-200 bg-white shadow-sm p-4 flex flex-col gap-3 sticky top-4">
              <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                <Brain className="h-4 w-4" />
                Protocolos Relacionados por IA
              </div>
              <div className="flex flex-col gap-2">
                <Textarea
                  className="resize-none text-xs"
                  rows={2}
                  value={fbQuery}
                  onChange={(e) => setFbQuery(e.target.value)}
                  placeholder="Termo de busca..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      searchFB();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                  onClick={searchFB}
                  disabled={fbLoading || fbQuery.trim().length < 3}
                >
                  {fbLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  {fbLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>

              {fbResult && (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]">
                  {fbResult.answer && (
                    <p className="text-xs text-violet-900 bg-violet-50 rounded-lg p-2 leading-relaxed border border-violet-100">
                      {fbResult.answer}
                    </p>
                  )}
                  {fbResult.sources.map((src) => {
                    const badge = FB_BADGES[src.source] ?? { label: src.source, cls: "bg-gray-100 text-gray-700" };
                    const hasArticle = src.source === "paper";
                    return (
                      <div key={src.id} className="rounded-lg border p-2 bg-white flex flex-col gap-1 text-xs">
                        <div className="flex items-start gap-1 flex-wrap">
                          <Badge className={cn("text-[10px] px-1 py-0", badge.cls)}>{badge.label}</Badge>
                          {hasArticle && (
                            <Badge className="text-[10px] px-1 py-0 bg-violet-600 text-white">Baseado em evidência</Badge>
                          )}
                        </div>
                        <p className="font-medium leading-snug">{src.title}</p>
                        {src.excerpt && <p className="text-muted-foreground line-clamp-2">{src.excerpt}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          </div>
        </div>

        <NewProtocolModal
          open={showNewProtocolModal}
          onOpenChange={setShowNewProtocolModal}
          onSubmit={handleSubmitProtocol}
          protocol={editingProtocol}
          isLoading={isCreating || isUpdating}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Protocolo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-24 md:pb-12 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Protocolos Clínicos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e aplique protocolos de reabilitação baseados em evidência
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              onClick={() => {
                setEditingProtocol(null);
                setShowNewProtocolModal(true);
              }}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Protocolo
            </Button>
          </div>
        </div>

        {/* Search and Filters Area */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-protocols-main"
                name="search-protocols-main"
                placeholder="Buscar por nome, patologia ou região..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg mr-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SortAsc className="h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Mais Recentes</DropdownMenuItem>
                  <DropdownMenuItem>Nome (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem>Mais Utilizados</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Moved Quick Templates Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickTemplateCounts.map((template) => {
              const isActive = activeTemplate === template.name;
              return (
                <Card
                  key={template.name}
                  className={cn(
                    "p-4 hover:shadow-md transition-all cursor-pointer group border-l-4 overflow-hidden relative",
                    isActive ? "ring-2 ring-primary ring-offset-2" : "",
                  )}
                  style={{ borderLeftColor: "transparent" }}
                  onClick={() => setActiveTemplate(isActive ? null : template.name)}
                >
                  <div
                    className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${template.color}`}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={cn(
                          "font-semibold text-sm group-hover:text-primary transition-colors",
                          isActive && "text-primary",
                        )}
                      >
                        {template.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.count} protocolos
                      </p>
                    </div>
                    <template.icon
                      className={cn(
                        "h-5 w-5 text-muted-foreground/50 group-hover:scale-110 transition-transform",
                        isActive && "text-primary scale-110",
                      )}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Categories & Muscle Filters Container */}
          <div className="space-y-4">
            {/* Main Categories (Joints/Regions) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Região / Articulação
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {PROTOCOL_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categoryFilter === cat.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full whitespace-nowrap gap-2",
                      categoryFilter === cat.id
                        ? ""
                        : "hover:border-primary/50 text-muted-foreground",
                    )}
                    onClick={() => setCategoryFilter(cat.id === categoryFilter ? "all" : cat.id)}
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Musculature Filters */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Musculatura Alvo</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={muscleFilter === "all" ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full whitespace-nowrap text-xs h-8"
                  onClick={() => setMuscleFilter("all")}
                >
                  Todas
                </Button>
                {MUSCULATURE_FILTERS.map((muscle) => (
                  <Button
                    key={muscle.id}
                    variant={muscleFilter === muscle.id ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full whitespace-nowrap text-xs h-8",
                      muscleFilter === muscle.id
                        ? ""
                        : "hover:border-primary/50 text-muted-foreground",
                    )}
                    onClick={() => setMuscleFilter(muscle.id === muscleFilter ? "all" : muscle.id)}
                  >
                    {muscle.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="mt-0">
            {error ? (
              <div className="text-center py-16 bg-destructive/10 rounded-xl border border-destructive/30 animate-fade-in">
                <h3 className="text-xl font-semibold mb-2 text-destructive">
                  Erro ao carregar protocolos
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {error instanceof Error
                    ? error.message
                    : "Falha na conexão com o servidor. Verifique se está logado como profissional e tente novamente."}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : loading ? (
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1",
                )}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="p-4 h-[200px] flex flex-col justify-between">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredProtocols.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed animate-fade-in">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhum protocolo encontrado</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {protocols.length === 0
                    ? "Ainda não há protocolos cadastrados. Crie um novo ou carregue os protocolos de exemplo."
                    : "Não encontramos protocolos com os filtros atuais. Tente buscar por outro termo ou limpe os filtros."}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setMuscleFilter("all");
                      setActiveTemplate(null);
                    }}
                  >
                    Limpar Filtros
                  </Button>
                  {protocols.length === 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleLoadSeedProtocols}
                      disabled={isSeeding || isCreating}
                    >
                      {isSeeding || isCreating ? "Carregando..." : "Carregar protocolos de exemplo"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1",
                )}
              >
                {filteredProtocols.map((protocol) => (
                  <ProtocolCardEnhanced
                    key={protocol.id}
                    protocol={protocol}
                    onClick={() => setSelectedProtocol(protocol)}
                    onEdit={(p) => {
                      setEditingProtocol(p);
                      setShowNewProtocolModal(true);
                    }}
                    onDelete={(id) => setDeleteId(id)}
                    onDuplicate={handleDuplicate}
                    onFavorite={handleFavorite}
                    isFavorite={favorites.includes(protocol.id)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <NewProtocolModal
          open={showNewProtocolModal}
          onOpenChange={setShowNewProtocolModal}
          onSubmit={handleSubmitProtocol}
          protocol={editingProtocol || undefined}
          isLoading={isCreating || isUpdating}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
