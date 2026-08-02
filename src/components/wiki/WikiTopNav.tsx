/**
 * WikiTopNav - Navegação horizontal superior para a Wiki
 * Substitui a sidebar vertical para melhor aproveitamento de tela.
 */

import { useMemo } from "react";
import {
  ChevronDown,
  Folder,
  File,
  Star,
  Clock,
  Library,
  Pin,
  LayoutDashboard,
  FileText,
  Languages,
  Activity,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WikiPage, WikiCategory } from "@/types/wiki";
import { getEvidenceTree } from "@/features/wiki/utils/evidenceTrails";

const EVIDENCE_ROOT_SLUG = "trilhas-evidencia-fisioterapia";

const EVIDENCE_TRAIL_ORDER = [
  "trilha-lca-retorno-esporte",
  "trilha-artroplastia-joelho-quadril",
  "trilha-ombro-ortopedico-pos-operatorio",
  "trilha-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PROTOCOL_ORDER = [
  "protocolo-lca-retorno-esporte",
  "protocolo-artroplastia-joelho-quadril",
  "protocolo-ombro-ortopedico-pos-operatorio",
  "protocolo-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PAGE_ORDER = [
  EVIDENCE_ROOT_SLUG,
  ...EVIDENCE_TRAIL_ORDER,
  ...EVIDENCE_PROTOCOL_ORDER,
];

function isEvidencePage(page: Pick<WikiPage, "slug">): boolean {
  return EVIDENCE_PAGE_ORDER.includes(
    page.slug as (typeof EVIDENCE_PAGE_ORDER)[number],
  );
}

const Sparkles = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

interface WikiTopNavProps {
  activeView:
    | "dashboard"
    | "knowledge-hub"
    | "ai-hub"
    | "papers"
    | "dictionary"
    | "curation"
    | "page";
  pages: WikiPage[];
  categories: WikiCategory[];
  selectedPageId?: string;
  onPageSelect: (page: WikiPage) => void;
  onCreatePage: () => void;
  onKnowledgeHubSelect?: () => void;
  onDashboardSelect?: () => void;
  onDictionarySelect?: () => void;
  onAIHubSelect?: () => void;
  onPapersSelect?: () => void;
  onCurationSelect?: () => void;
  showCuration?: boolean;
  onTagSelect?: (tag: string) => void;
}

export function WikiTopNav({
  activeView,
  pages,
  categories,
  onPageSelect,
  onKnowledgeHubSelect,
  onDashboardSelect,
  onDictionarySelect,
  onAIHubSelect,
  onPapersSelect,
  onCurationSelect,
  showCuration = false,
  onTagSelect,
}: WikiTopNavProps) {
  const evidenceTree = useMemo(() => getEvidenceTree(pages), [pages]);
  const generalPages = useMemo(
    () => pages.filter((page) => !isEvidencePage(page)),
    [pages],
  );

  // Pinned Pages
  const pinned = useMemo(
    () => generalPages.filter((p) => p.is_pinned).slice(0, 5),
    [generalPages],
  );

  // Favorites
  const favorites = useMemo(
    () =>
      generalPages.filter((p) => p.view_count > 10 && !p.is_pinned).slice(0, 5),
    [generalPages],
  );

  // Recents
  const recents = useMemo(
    () =>
      [...generalPages]
        .sort((a, b) => {
          const dateA =
            (a.updated_at as any)?.toDate?.() || new Date(a.updated_at as any);
          const dateB =
            (b.updated_at as any)?.toDate?.() || new Date(b.updated_at as any);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5),
    [generalPages],
  );

  // Tags
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    generalPages.forEach((p) =>
      p.tags?.forEach((t) => (counts[t] = (counts[t] || 0) + 1)),
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [generalPages]);

  // Build tree structure
  const pageTree = useMemo(() => {
    const byCategory: Record<string, WikiPage[]> = {};
    generalPages.forEach((page) => {
      const cat = page.category || "uncategorized";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(page);
    });
    return byCategory;
  }, [generalPages]);

  return (
    <nav
      aria-label="Navegação da Biblioteca Clínica"
      className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div className="flex min-h-14 items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Main Nav Items */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 font-bold font-display rounded-xl transition-all duration-300",
              activeView === "dashboard"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={onDashboardSelect}
            aria-label="Dashboard"
            aria-current={activeView === "dashboard" ? "page" : undefined}
          >
            <LayoutDashboard
              className={cn(
                "h-4 w-4",
                activeView === "dashboard" && "text-primary",
              )}
            />
            <span
              className={cn(
                activeView === "dashboard" ? "inline" : "hidden sm:inline",
              )}
            >
              Dashboard
            </span>
          </Button>
          {showCuration ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2 rounded-xl font-display font-bold transition-colors",
                activeView === "curation"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={onCurationSelect}
              aria-label="Gestão da Biblioteca"
              aria-current={activeView === "curation" ? "page" : undefined}
            >
              <ShieldCheck className="h-4 w-4" />
              <span
                className={cn(
                  activeView === "curation" ? "inline" : "hidden sm:inline",
                )}
              >
                Gestão da Biblioteca
              </span>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 rounded-xl font-display font-bold transition-colors",
              activeView === "knowledge-hub"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={onKnowledgeHubSelect}
            aria-label="Base Clínica"
            aria-current={activeView === "knowledge-hub" ? "page" : undefined}
          >
            <Sparkles className="h-4 w-4" />
            <span
              className={cn(
                activeView === "knowledge-hub" ? "inline" : "hidden sm:inline",
              )}
            >
              Base Clínica
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 rounded-xl font-display font-bold transition-colors",
              activeView === "ai-hub"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={onAIHubSelect}
            aria-label="FisioBrain"
            aria-current={activeView === "ai-hub" ? "page" : undefined}
          >
            <Activity className="h-4 w-4" />
            <span
              className={cn(
                activeView === "ai-hub" ? "inline" : "hidden sm:inline",
              )}
            >
              FisioBrain
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 rounded-xl font-display font-bold transition-colors",
              activeView === "papers"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={onPapersSelect}
            aria-label="Artigos"
            aria-current={activeView === "papers" ? "page" : undefined}
          >
            <BookOpen className="h-4 w-4" />
            <span
              className={cn(
                activeView === "papers" ? "inline" : "hidden sm:inline",
              )}
            >
              Artigos
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 rounded-xl font-display font-bold transition-colors",
              activeView === "dictionary"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={onDictionarySelect}
            aria-label="Dicionário"
            aria-current={activeView === "dictionary" ? "page" : undefined}
          >
            <Languages className="h-4 w-4" />
            <span
              className={cn(
                activeView === "dictionary" ? "inline" : "hidden sm:inline",
              )}
            >
              Dicionário
            </span>
          </Button>
        </div>

        <div className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

        {/* Trilhas Dropdown */}
        {evidenceTree.root && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-2 rounded-xl font-bold"
              >
                <Library className="h-4 w-4 text-blue-600" />
                <span>Trilhas</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Trilhas de Evidência</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onPageSelect(evidenceTree.root!)}
              >
                <Library className="mr-2 h-4 w-4 text-blue-600" />
                {evidenceTree.root.title}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {evidenceTree.trails.map(({ trail, protocols }) => (
                <DropdownMenuSub key={trail.id}>
                  <DropdownMenuSubTrigger>
                    <File className="mr-2 h-4 w-4" />
                    <span className="truncate">{trail.title}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64">
                    <DropdownMenuItem onClick={() => onPageSelect(trail)}>
                      Ver Trilha Completa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {protocols.map((protocol) => (
                      <DropdownMenuItem
                        key={protocol.id}
                        onClick={() => onPageSelect(protocol)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span className="truncate">{protocol.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Explorar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-2 rounded-xl font-bold"
            >
              <Folder className="h-4 w-4 text-blue-500/70" />
              <span>Explorar</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Categorias</DropdownMenuLabel>
            {categories.map((category) => {
              const categoryPages = pageTree[category.id] || [];
              if (categoryPages.length === 0) return null;
              return (
                <DropdownMenuSub key={category.id}>
                  <DropdownMenuSubTrigger>
                    <Folder className="mr-2 h-4 w-4 text-blue-500/70" />
                    {category.name}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64">
                    {categoryPages.map((page) => (
                      <DropdownMenuItem
                        key={page.id}
                        onClick={() => onPageSelect(page)}
                      >
                        <File className="mr-2 h-4 w-4 opacity-70" />
                        <span className="truncate">{page.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}

            {pageTree.uncategorized && pageTree.uncategorized.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sem Categoria</DropdownMenuLabel>
                {pageTree.uncategorized.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    onClick={() => onPageSelect(page)}
                  >
                    <File className="mr-2 h-4 w-4 opacity-70" />
                    <span className="truncate">{page.title}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tags Populares</DropdownMenuLabel>
            <div className="p-2 flex flex-wrap gap-1">
              {allTags.map(([tag]) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted"
                  onClick={() => onTagSelect?.(tag)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* History/Quick Access */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-2 rounded-xl font-bold"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden md:inline">Acesso Rápido</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {pinned.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Pin className="h-3 w-3 text-orange-500" /> Fixados
                </DropdownMenuLabel>
                {pinned.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    onClick={() => onPageSelect(page)}
                  >
                    <span className="truncate">{page.title}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {favorites.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-yellow-500" /> Populares
                </DropdownMenuLabel>
                {favorites.map((page) => (
                  <DropdownMenuItem
                    key={page.id}
                    onClick={() => onPageSelect(page)}
                  >
                    <span className="truncate">{page.title}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="flex items-center gap-2">
              <Clock className="h-3 w-3" /> Recentes
            </DropdownMenuLabel>
            {recents.map((page) => (
              <DropdownMenuItem
                key={page.id}
                onClick={() => onPageSelect(page)}
              >
                <span className="truncate">{page.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
