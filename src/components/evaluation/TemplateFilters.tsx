import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Star, Grid3x3, List, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateFilters as TemplateFiltersType } from '@/types/clinical-forms';

const CATEGORIES = [
  { value: '', label: 'Todas Categorias' },
  { value: 'anamnese', label: 'Anamnese' },
  { value: 'avaliacao_postural', label: 'Avaliação Postural' },
  { value: 'avaliacao_funcional', label: 'Avaliação Funcional' },
  { value: 'esportiva', label: 'Fisioterapia Esportiva' },
  { value: 'ortopedica', label: 'Fisioterapia Ortopédica' },
  { value: 'neurologica', label: 'Fisioterapia Neurológica' },
  { value: 'respiratoria', label: 'Fisioterapia Respiratória' },
  { value: 'padrao', label: 'Padrão' },
  { value: 'custom', label: 'Personalizada' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'recent', label: 'Recentemente Usados' },
  { value: 'usage', label: 'Mais Usados' },
];

interface TemplateFiltersProps {
  filters: TemplateFiltersType;
  onFiltersChange: (filters: TemplateFiltersType) => void;
  totalCount?: number;
  favoritesCount?: number;
}

export function TemplateFilters({
  filters,
  onFiltersChange,
  totalCount = 0,
  favoritesCount = 0,
}: TemplateFiltersProps) {
  const updateFilter = <K extends keyof TemplateFiltersType>(
    key: K,
    value: TemplateFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = [
    filters.search,
    filters.category,
    filters.favorites,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Favorites toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={filters.favorites ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter('favorites', !filters.favorites)}
                className="gap-2 whitespace-nowrap"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    filters.favorites ? "fill-yellow-400 text-yellow-400" : ""
                  )}
                />
                {filters.favorites ? "Só Favoritos" : "Favoritos"}
                {favoritesCount > 0 && !filters.favorites && (
                  <Badge variant="secondary" className="ml-1">
                    {favoritesCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {filters.favorites
                ? "Mostrar todos os templates"
                : "Mostrar apenas favoritos"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Category filter */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) =>
            updateFilter('category', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value || 'all'} value={cat.value || 'all'}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort by */}
        <Select
          value={filters.sortBy || 'name'}
          onValueChange={(value) =>
            updateFilter('sortBy', value as TemplateFiltersType['sortBy'])
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SlidersHorizontal className="h-4 w-4 mr-2 opacity-50" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" />
              "{filters.search}"
              <button
                onClick={() => updateFilter('search', undefined)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="gap-1">
              {
                CATEGORIES.find((c) => c.value === filters.category)
                  ?.label
              }
              <button
                onClick={() => updateFilter('category', undefined)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {filters.favorites && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Favoritos
              <button
                onClick={() => updateFilter('favorites', false)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onFiltersChange({
                search: undefined,
                category: undefined,
                favorites: undefined,
                sortBy: 'name',
              })
            }
            className="h-6 text-xs"
          >
            Limpar todos
          </Button>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filters.favorites ? (
          <span>
            {favoritesCount} favorito{favoritesCount !== 1 ? 's' : ''} de {totalCount} template
            {totalCount !== 1 ? 's' : ''}
          </span>
        ) : (
          <span>
            {totalCount} template{totalCount !== 1 ? 's' : ''}
            {activeFiltersCount > 0 && ' encontrados'}
          </span>
        )}
      </div>
    </div>
  );
}

export default TemplateFilters;
