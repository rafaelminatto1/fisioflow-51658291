import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Calendar, Users, Briefcase } from "lucide-react";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { eventosApi, participantesApi, contratadosApi } from "@/api/v2";

interface EventoRecord {
  id: string;
  nome: string;
  local: string;
  categoria: string;
}

interface ParticipanteRecord {
  id: string;
  nome: string;
}

interface PrestadorRecord {
  id: string;
  nome: string;
}

interface SearchResult {
  id: string;
  type: "evento" | "participante" | "prestador";
  title: string;
  subtitle?: string;
  icon: typeof Calendar | typeof Users | typeof Briefcase;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const searchAll = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults: SearchResult[] = [];
      const queryLower = debouncedQuery.toLowerCase();
      const isE2E = typeof window !== "undefined" && window.location.search.includes("e2e=true");
      const isLocalHost =
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const skipOptionalLookups = isE2E || isLocalHost;

      const [eventosRes, participantesRes, contratadosRes] = await Promise.all([
        eventosApi.list({ limit: 50 }).catch(() => ({ data: [] })),
        skipOptionalLookups
          ? Promise.resolve({ data: [] })
          : participantesApi.list({ limit: 50 }).catch(() => ({ data: [] })),
        skipOptionalLookups
          ? Promise.resolve({ data: [] })
          : contratadosApi.list().catch(() => ({ data: [] })),
      ]);

      const eventos = (eventosRes?.data ?? []) as EventoRecord[];
      for (const evento of eventos) {
        if (
          evento.nome?.toLowerCase().includes(queryLower) ||
          evento.local?.toLowerCase().includes(queryLower)
        ) {
          searchResults.push({
            id: evento.id,
            type: "evento",
            title: evento.nome,
            subtitle: `${evento.local || "-"} • ${evento.categoria || "-"}`,
            icon: Calendar,
          });
        }
      }

      const filteredEventResults = searchResults.slice(0, 5);

      const participantes = (participantesRes?.data ?? []) as ParticipanteRecord[];
      for (const participante of participantes) {
        if (participante.nome?.toLowerCase().includes(queryLower)) {
          filteredEventResults.push({
            id: participante.id,
            type: "participante",
            title: participante.nome,
            subtitle: "Participante",
            icon: Users,
          });
        }
      }

      const contratados = (contratadosRes?.data ?? []) as PrestadorRecord[];
      for (const contratado of contratados) {
        if (contratado.nome?.toLowerCase().includes(queryLower)) {
          filteredEventResults.push({
            id: contratado.id,
            type: "prestador",
            title: contratado.nome,
            subtitle: "Contratado",
            icon: Briefcase,
          });
        }
      }

      setResults(filteredEventResults.slice(0, 15));
    } catch (error) {
      logger.error("Erro na busca", error, "GlobalSearch");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    searchAll();
  }, [searchAll]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearchQuery("");

    if (result.type === "evento") {
      navigate(`/eventos/${result.id}`);
    } else if (result.type === "participante" || result.type === "prestador") {
      // Navegar para o evento relacionado
      navigate(`/eventos`);
    }
  };

  return (
    <>
      <button
        id="search"
        tabIndex={-1}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
        aria-label="Buscar (⌘K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline-block">Buscar</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar eventos, participantes, prestadores..."
          data-testid="global-search-input"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>{isLoading ? "Buscando..." : "Nenhum resultado encontrado."}</CommandEmpty>

          {results.length > 0 && (
            <CommandGroup heading="Resultados">
              {results.map((result) => {
                const Icon = result.icon;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
