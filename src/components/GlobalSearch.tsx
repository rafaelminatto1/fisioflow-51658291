import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Calendar, Users, User } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  id: string;
  type: 'evento' | 'participante' | 'prestador';
  title: string;
  subtitle?: string;
  eventoId?: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];

      const searchResults: SearchResult[] = [];

      // Buscar eventos
      const { data: eventos } = await supabase
        .from('eventos')
        .select('id, nome, local, data_inicio')
        .or(`nome.ilike.%${debouncedSearch}%,local.ilike.%${debouncedSearch}%`)
        .limit(5);

      if (eventos) {
        eventos.forEach((e) => {
          searchResults.push({
            id: e.id,
            type: 'evento',
            title: e.nome,
            subtitle: `${e.local} - ${new Date(e.data_inicio).toLocaleDateString('pt-BR')}`,
          });
        });
      }

      // Buscar participantes
      const { data: participantes } = await supabase
        .from('participantes')
        .select('id, nome, contato, evento_id')
        .ilike('nome', `%${debouncedSearch}%`)
        .limit(5);

      if (participantes) {
        participantes.forEach((p) => {
          searchResults.push({
            id: p.id,
            type: 'participante',
            title: p.nome,
            subtitle: p.contato || 'Sem contato',
            eventoId: p.evento_id,
          });
        });
      }

      // Buscar prestadores
      const { data: prestadores } = await supabase
        .from('prestadores')
        .select('id, nome, contato, evento_id')
        .ilike('nome', `%${debouncedSearch}%`)
        .limit(5);

      if (prestadores) {
        prestadores.forEach((p) => {
          searchResults.push({
            id: p.id,
            type: 'prestador',
            title: p.nome,
            subtitle: p.contato || 'Sem contato',
            eventoId: p.evento_id,
          });
        });
      }

      return searchResults;
    },
    enabled: debouncedSearch.length >= 2,
  });

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'evento') {
      navigate(`/eventos/${result.id}`);
    } else if (result.eventoId) {
      navigate(`/eventos/${result.eventoId}`);
    }
    setOpen(false);
    setSearch('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'evento':
        return <Calendar className="h-4 w-4 mr-2" />;
      case 'participante':
        return <Users className="h-4 w-4 mr-2" />;
      case 'prestador':
        return <User className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'evento':
        return 'Evento';
      case 'participante':
        return 'Participante';
      case 'prestador':
        return 'Prestador';
      default:
        return '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar eventos, participantes ou prestadores..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </CommandEmpty>

          {results.length > 0 && (
            <CommandGroup heading="Resultados">
              {results.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result)}
                  className="cursor-pointer"
                >
                  {getIcon(result.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        ({getTypeLabel(result.type)})
                      </span>
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-muted-foreground">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
