import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AppointmentFilters as IAppointmentFilters, AppointmentStatus, AppointmentType } from '@/types/appointment';

interface AppointmentFiltersProps {
  filters: IAppointmentFilters;
  onFiltersChange: (filters: IAppointmentFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

const statusLabels: Record<AppointmentStatus, string> = {
  'Scheduled': 'Agendado',
  'Confirmed': 'Confirmado',
  'In Progress': 'Em Andamento',
  'Completed': 'Concluído',
  'Cancelled': 'Cancelado',
  'No Show': 'Faltou',
  'Rescheduled': 'Reagendado',
  'Pending': 'Pendente'
};

const typeLabels: Record<AppointmentType, string> = {
  'Consulta Inicial': 'Consulta Inicial',
  'Fisioterapia': 'Fisioterapia',
  'Reavaliação': 'Reavaliação',
  'Consulta de Retorno': 'Consulta de Retorno',
  'Avaliação Funcional': 'Avaliação Funcional',
  'Terapia Manual': 'Terapia Manual',
  'Pilates Clínico': 'Pilates Clínico',
  'RPG': 'RPG',
  'Dry Needling': 'Dry Needling',
  'Liberação Miofascial': 'Liberação Miofascial'
};

export const AppointmentFilters: React.FC<AppointmentFiltersProps> = ({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  className
}) => {
  const updateFilters = (key: keyof IAppointmentFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    onSearchChange('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery.length > 0;

  return (
    <Card className={cn('border-border', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search and Clear */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por paciente, tipo ou observações..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateRange?.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.start ? (
                      format(filters.dateRange.start, 'dd/MM', { locale: ptBR })
                    ) : (
                      "Início"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.start}
                    onSelect={(date) => updateFilters('dateRange', {
                      ...filters.dateRange,
                      start: date || new Date()
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !filters.dateRange?.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.end ? (
                      format(filters.dateRange.end, 'dd/MM', { locale: ptBR })
                    ) : (
                      "Fim"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.end}
                    onSelect={(date) => updateFilters('dateRange', {
                      ...filters.dateRange,
                      end: date || new Date()
                    })}
                    disabled={(date) =>
                      filters.dateRange?.start ? date < filters.dateRange.start : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filters.status?.[0] || ''}
              onValueChange={(value) => updateFilters('status', value ? [value as AppointmentStatus] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={filters.type?.[0] || ''}
              onValueChange={(value) => updateFilters('type', value ? [value as AppointmentType] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Filtros Rápidos</label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters('dateRange', {
                  start: new Date(),
                  end: new Date()
                })}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today);
                  weekStart.setDate(today.getDate() - today.getDay() + 1);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 6);
                  updateFilters('dateRange', {
                    start: weekStart,
                    end: weekEnd
                  });
                }}
                className="text-xs"
              >
                Esta Semana
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
            
            {searchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Busca: "{searchQuery}"
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => onSearchChange('')}
                />
              </Badge>
            )}
            
            {filters.dateRange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Período: {format(filters.dateRange.start, 'dd/MM', { locale: ptBR })} - {format(filters.dateRange.end, 'dd/MM', { locale: ptBR })}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => updateFilters('dateRange', undefined)}
                />
              </Badge>
            )}
            
            {filters.status?.[0] && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {statusLabels[filters.status[0]]}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => updateFilters('status', undefined)}
                />
              </Badge>
            )}
            
            {filters.type?.[0] && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tipo: {typeLabels[filters.type[0]]}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => updateFilters('type', undefined)}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};