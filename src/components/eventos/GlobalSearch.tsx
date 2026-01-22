import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/web/ui/command';
import { Search, Calendar, Users, Briefcase } from 'lucide-react';
import { useDebounce } from '@/hooks/performance/useDebounce';

interface SearchResult {
  id: string;
  type: 'evento' | 'participante' | 'prestador';
  title: string;
  subtitle?: string;
  icon: typeof Calendar | typeof Users | typeof Briefcase;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      setIsLoading(true);
      try {
        const searchResults: SearchResult[] = [];

        // Buscar eventos
        const { data: eventos } = await supabase
          .from('eventos')
          .select('id, nome, local, categoria')
          .or(`nome.ilike.%${debouncedQuery}%,local.ilike.%${debouncedQuery}%`)
          .limit(5);

        if (eventos) {
          eventos.forEach((evento) => {
            searchResults.push({
              id: evento.id,
              type: 'evento',
              title: evento.nome,
              subtitle: `${evento.local} • ${evento.categoria}`,
              icon: Calendar,
            });
          });
        }

        // Buscar participantes
        const { data: participantes } = await supabase
          .from('participantes')
          .select('id, nome, evento_id, eventos(nome)')
          .ilike('nome', `%${debouncedQuery}%`)
          .limit(5);

        if (participantes) {
          participantes.forEach((participante: Record<string, unknown>) => {
            searchResults.push({
              id: participante.id as string,
              type: 'participante',
              title: participante.nome as string,
              subtitle: ((participante.eventos as Record<string, unknown>)?.nome as string | undefined) || 'Evento',
              icon: Users,
            });
          });
        }

        // Buscar prestadores
        const { data: prestadores } = await supabase
          .from('prestadores')
          .select('id, nome, evento_id, eventos(nome)')
          .ilike('nome', `%${debouncedQuery}%`)
          .limit(5);

        if (prestadores) {
          prestadores.forEach((prestador: Record<string, unknown>) => {
            searchResults.push({
              id: prestador.id as string,
              type: 'prestador',
              title: prestador.nome as string,
              subtitle: ((prestador.eventos as Record<string, unknown>)?.nome as string | undefined) || 'Evento',
              icon: Briefcase,
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchAll();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    
    if (result.type === 'evento') {
      navigate(`/eventos/${result.id}`);
    } else if (result.type === 'participante' || result.type === 'prestador') {
      // Navegar para o evento relacionado
      navigate(`/eventos`);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Buscar...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar eventos, participantes, prestadores..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </CommandEmpty>
          
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
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
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
