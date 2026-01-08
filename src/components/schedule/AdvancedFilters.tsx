import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface FilterOptions {
  status: string[];
  types: string[];
  therapists: string[];
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onClear: () => void;
  dateRange?: {
    from: string;
    to: string;
  };
  onDateRangeChange?: (range: { from: string; to: string }) => void;
}

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado', color: 'bg-blue-500' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-emerald-500' },
  { value: 'aguardando_confirmacao', label: 'Aguardando', color: 'bg-amber-500' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-cyan-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-purple-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];

const TYPE_OPTIONS = [
  'Fisioterapia',
  'Consulta Inicial',
  'Reavaliação',
  'Pilates Clínico',
  'RPG',
  'Terapia Manual',
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onChange,
  onClear,
  dateRange,
  onDateRangeChange,
}) => {
  const activeFiltersCount =
    filters.status.length + filters.types.length + filters.therapists.length;

  const toggleFilter = (category: keyof FilterOptions, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onChange({ ...filters, [category]: updated });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'relative gap-2 animate-slide-up-fade',
            activeFiltersCount > 0 && 'border-primary'
          )}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center justify-between">
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Date Range Filters */}
          {dateRange && onDateRangeChange && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Período</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Filters */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Status</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.status.includes(option.value) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:scale-105',
                    filters.status.includes(option.value) && option.color
                  )}
                  onClick={() => toggleFilter('status', option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Type Filters */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Tipo de Serviço</h3>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <Badge
                  key={type}
                  variant={filters.types.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all duration-200 hover:scale-105"
                  onClick={() => toggleFilter('types', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
