import React, { useState, useEffect, memo } from 'react';
import { Filter, X, Search, Calendar, User, DollarSign, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTherapists } from '@/hooks/useUsers';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { AgendaFilters } from '@/types/agenda';

interface AgendaFiltersProps {
  filters: AgendaFilters;
  onFiltersChange: (filters: AgendaFilters) => void;
  onClearFilters: () => void;
  className?: string;
  compact?: boolean;
}

export const AgendaFilters = memo(function AgendaFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  className,
  compact = false
}: AgendaFiltersProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [localFilters, setLocalFilters] = useState<AgendaFilters>(filters);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  
  const { data: therapists = [] } = useTherapists();

  // Debounced search handler
  const debouncedSearchHandler = useDebouncedCallback((term: string) => {
    handleFilterChange('search', term || undefined);
  }, 300);

  // Handle search term changes
  useEffect(() => {
    debouncedSearchHandler(searchTerm);
  }, [searchTerm, debouncedSearchHandler]);

  // Update local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
    setSearchTerm(filters.search || '');
  }, [filters]);

  const handleFilterChange = (key: keyof AgendaFilters, value: any) => {
    const newFilters = {
      ...localFilters,
      [key]: value
    };
    
    // Remove undefined values
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k as keyof AgendaFilters] === undefined || newFilters[k as keyof AgendaFilters] === '') {
        delete newFilters[k as keyof AgendaFilters];
      }
    });
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setSearchTerm('');
    onClearFilters();
  };

  const activeFiltersCount = Object.keys(filters).length;
  const hasActiveFilters = activeFiltersCount > 0;

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn("space-y-4", className)}>
          {/* Compact Header */}
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.therapist_id && (
                <FilterBadge
                  label="Fisioterapeuta"
                  value={therapists.find(t => t.id === filters.therapist_id)?.name || 'Selecionado'}
                  onRemove={() => handleFilterChange('therapist_id', undefined)}
                />
              )}
              {filters.status && (
                <FilterBadge
                  label="Status"
                  value={getStatusLabel(filters.status)}
                  onRemove={() => handleFilterChange('status', undefined)}
                />
              )}
              {filters.payment_status && (
                <FilterBadge
                  label="Pagamento"
                  value={getPaymentStatusLabel(filters.payment_status)}
                  onRemove={() => handleFilterChange('payment_status', undefined)}
                />
              )}
              {filters.session_type && (
                <FilterBadge
                  label="Tipo"
                  value={getSessionTypeLabel(filters.session_type)}
                  onRemove={() => handleFilterChange('session_type', undefined)}
                />
              )}
              {filters.search && (
                <FilterBadge
                  label="Busca"
                  value={filters.search}
                  onRemove={() => {
                    setSearchTerm('');
                    handleFilterChange('search', undefined);
                  }}
                />
              )}
            </div>
          )}

          <CollapsibleContent>
            <FilterContent
              filters={localFilters}
              searchTerm={searchTerm}
              therapists={therapists}
              onFilterChange={handleFilterChange}
              onSearchChange={setSearchTerm}
            />
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros da Agenda
            {hasActiveFilters && (
              <Badge variant="secondary">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <FilterContent
          filters={localFilters}
          searchTerm={searchTerm}
          therapists={therapists}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearchTerm}
        />
      </CardContent>
    </Card>
  );
});

// Filter content component
interface FilterContentProps {
  filters: AgendaFilters;
  searchTerm: string;
  therapists: any[];
  onFilterChange: (key: keyof AgendaFilters, value: any) => void;
  onSearchChange: (value: string) => void;
}

const FilterContent = memo(function FilterContent({
  filters,
  searchTerm,
  therapists,
  onFilterChange,
  onSearchChange
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Buscar Paciente
        </Label>
        <Input
          id="search"
          type="text"
          placeholder="Digite o nome do paciente..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Separator />

      {/* Primary Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Therapist Filter */}
        <div className="space-y-2">
          <Label htmlFor="therapist" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Fisioterapeuta
          </Label>
          <Select
            value={filters.therapist_id || ''}
            onValueChange={(value) => onFilterChange('therapist_id', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os fisioterapeutas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os fisioterapeutas</SelectItem>
              {therapists.map((therapist) => (
                <SelectItem key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Status do Agendamento
          </Label>
          <Select
            value={filters.status || ''}
            onValueChange={(value) => onFilterChange('status', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="no_show">Faltou</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="payment_status" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Status do Pagamento
          </Label>
          <Select
            value={filters.payment_status || ''}
            onValueChange={(value) => onFilterChange('payment_status', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os pagamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os pagamentos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="session_type" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tipo de Sessão
          </Label>
          <Select
            value={filters.session_type || ''}
            onValueChange={(value) => onFilterChange('session_type', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="group">Grupo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});

// Filter badge component
interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove: () => void;
}

const FilterBadge = memo(function FilterBadge({ label, value, onRemove }: FilterBadgeProps) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1 pr-1">
      <span className="text-xs">
        <span className="font-medium">{label}:</span> {value}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
});

// Utility functions
function getStatusLabel(status: string): string {
  const labels = {
    scheduled: 'Agendado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Faltou'
  };
  return labels[status as keyof typeof labels] || status;
}

function getPaymentStatusLabel(status: string): string {
  const labels = {
    paid: 'Pago',
    pending: 'Pendente'
  };
  return labels[status as keyof typeof labels] || status;
}

function getSessionTypeLabel(type: string): string {
  const labels = {
    individual: 'Individual',
    group: 'Grupo'
  };
  return labels[type as keyof typeof labels] || type;
}

// Hook for managing filter state with persistence
export function useAgendaFilters(initialFilters: AgendaFilters = {}) {
  const [filters, setFilters] = useState<AgendaFilters>(() => {
    // Try to load from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('agendaFilters');
      if (saved) {
        try {
          return { ...initialFilters, ...JSON.parse(saved) };
        } catch {
          return initialFilters;
        }
      }
    }
    return initialFilters;
  });

  const updateFilters = (newFilters: AgendaFilters) => {
    setFilters(newFilters);
    
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      if (Object.keys(newFilters).length > 0) {
        sessionStorage.setItem('agendaFilters', JSON.stringify(newFilters));
      } else {
        sessionStorage.removeItem('agendaFilters');
      }
    }
  };

  const clearFilters = () => {
    setFilters({});
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('agendaFilters');
    }
  };

  return {
    filters,
    setFilters: updateFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).length > 0
  };
}