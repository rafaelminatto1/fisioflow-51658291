import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/integrations/firebase/app';
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Calendar, Users, Briefcase } from 'lucide-react';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { logger } from '@/lib/errors/logger';

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
        const queryLower = debouncedQuery.toLowerCase();

        // Buscar eventos - Firebase doesn't have ilike, so we fetch all and filter client-side
        // In production, you'd want to use a proper search solution like Algolia or Elasticsearch
        const eventosQuery = query(
          collection(db, 'eventos'),
          orderBy('nome'),
          limit(50)
        );
        const eventosSnapshot = await getDocs(eventosQuery);

        eventosSnapshot.forEach((doc) => {
          const evento = { id: doc.id, ...doc.data() } as EventoRecord;
          if (
            evento.nome?.toLowerCase().includes(queryLower) ||
            evento.local?.toLowerCase().includes(queryLower)
          ) {
            searchResults.push({
              id: evento.id,
              type: 'evento',
              title: evento.nome,
              subtitle: `${evento.local} • ${evento.categoria}`,
              icon: Calendar,
            });
          }
        });

        // Limit to 5 results
        const filteredEventResults = searchResults.slice(0, 5);

        // Buscar participantes
        const participantesQuery = query(
          collection(db, 'participantes'),
          orderBy('nome'),
          limit(50)
        );
        const participantesSnapshot = await getDocs(participantesQuery);

        participantesSnapshot.forEach((doc) => {
          const participante = { id: doc.id, ...doc.data() } as ParticipanteRecord;
          if (participante.nome?.toLowerCase().includes(queryLower)) {
            filteredEventResults.push({
              id: participante.id,
              type: 'participante',
              title: participante.nome,
              subtitle: 'Evento',
              icon: Users,
            });
          }
        });

        // Buscar prestadores
        const prestadoresQuery = query(
          collection(db, 'prestadores'),
          orderBy('nome'),
          limit(50)
        );
        const prestadoresSnapshot = await getDocs(prestadoresQuery);

        prestadoresSnapshot.forEach((doc) => {
          const prestador = { id: doc.id, ...doc.data() } as PrestadorRecord;
          if (prestador.nome?.toLowerCase().includes(queryLower)) {
            filteredEventResults.push({
              id: prestador.id,
              type: 'prestador',
              title: prestador.nome,
              subtitle: 'Evento',
              icon: Briefcase,
            });
          }
        });

        setResults(filteredEventResults.slice(0, 15)); // Limit total results
      } catch (error) {
        logger.error('Erro na busca', error, 'GlobalSearch');
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
