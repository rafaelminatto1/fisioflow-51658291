/**
 * Quick Filters - Botões de filtros rápidos para a agenda
 *
 * Filtros pré-definidos para acesso rápido a visualizações comuns
 * - "Hoje" - Agendamentos de hoje
 * - "Amanhã" - Agendamentos de amanhã
 * - "Esta semana" - Agendamentos da semana atual
 * - "Faltas" - Apenas agendamentos com status de falta
 * - "Pagamentos pendentes" - Agendamentos com pagamento pendente
 */

import React, { memo, useCallback } from 'react';
import { Calendar, Clock, CheckCircle2, DollarSign, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, addDays, endOfWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type QuickFilterType = 'today' | 'tomorrow' | 'thisWeek' | 'noShows' | 'pendingPayment' | 'all';

interface QuickFiltersProps {
  selectedFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  totalCount?: number;
  className?: string;
}

const QuickFilters = memo(({
  selectedFilter,
  onFilterChange,
  totalCount = 0,
  className
}: QuickFiltersProps) => {
  const handleFilterClick = useCallback((filter: QuickFilterType) => {
    // Se o mesmo filtro já está selecionado, limpar
    const newFilter = selectedFilter === filter ? 'all' : filter;
    onFilterChange(newFilter);

    // Haptic feedback (se suportado)
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [selectedFilter, onFilterChange]);

  const filters = [
    {
      id: 'today' as QuickFilterType,
      label: 'Hoje',
      icon: Calendar,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      count: null
    },
    {
      id: 'tomorrow' as QuickFilterType,
      label: 'Amanhã',
      icon: Clock,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      count: null
    },
    {
      id: 'thisWeek' as QuickFilterType,
      label: 'Esta Semana',
      icon: Calendar,
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      count: null
    },
    {
      id: 'noShows' as QuickFilterType,
      label: 'Faltas',
      icon: SearchX,
      color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      count: null
    },
    {
      id: 'pendingPayment' as QuickFilterType,
      label: 'Pendentes',
      icon: DollarSign,
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      count: null
    }
  ];

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {filters.map((filter) => {
        const isSelected = selectedFilter === filter.id;
        const showActiveIndicator = isSelected;

        return (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={cn(
              'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200',
              'border border-slate-200 dark:border-slate-700',
              'hover:scale-105 active:scale-95',
              isSelected
                ? `${filter.color} border-transparent shadow-md ring-2 ring-offset-1`
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800',
              'hover:border-slate-300 dark:hover:border-slate-600'
            )}
            title={filter.label}
            aria-pressed={isSelected}
            data-testid={`quick-filter-${filter.id}`}
          >
            <filter.icon className={cn(
              'w-4 h-4 transition-colors duration-200',
              isSelected
                ? 'text-current'
                : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            )} />

            <span className="text-xs font-semibold whitespace-nowrap">
              {filter.label}
            </span>

            {/* Active indicator */}
            {showActiveIndicator && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-offset-1 ring-white dark:ring-slate-900" />
            )}
          </button>
        );
      })}

      {/* Clear filter button */}
      {selectedFilter !== 'all' && (
        <button
          onClick={() => handleFilterClick('all')}
          className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
          title="Limpar filtro"
          data-testid="clear-quick-filter"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      )}

      {/* Total count */}
      {totalCount > 0 && (
        <div className="ml-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
          {totalCount}
        </div>
      )}
    </div>
  );
});

QuickFilters.displayName = 'QuickFilters';

export { QuickFilters };
