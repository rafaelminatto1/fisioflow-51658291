import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  Filter, 
  X, 
  Download,
  RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export interface FilterConfig {
  dateRange: DateRange | undefined;
  therapist: string;
  appointmentType: string;
  status: string;
  patientStatus: string;
}

interface FilterBarProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  therapists?: Array<{ id: string; name: string }>;
}

const QUICK_RANGES = [
  {
    label: 'Hoje',
    getValue: () => ({
      from: new Date(),
      to: new Date()
    })
  },
  {
    label: 'Últimos 7 dias',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date()
    })
  },
  {
    label: 'Últimos 30 dias', 
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date()
    })
  },
  {
    label: 'Últimos 3 meses',
    getValue: () => ({
      from: subDays(new Date(), 89),
      to: new Date()
    })
  }
];

const APPOINTMENT_TYPES = [
  'Consulta',
  'Retorno',
  'Avaliação',
  'Sessão de Fisioterapia'
];

const APPOINTMENT_STATUS = [
  'Confirmado',
  'Cancelado',
  'Pendente',
  'Concluído'
];

const PATIENT_STATUS = [
  'Inicial',
  'Em Tratamento',
  'Alta',
  'Inativo'
];

export function FilterBar({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  loading = false,
  therapists = []
}: FilterBarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const updateFilter = (key: keyof FilterConfig, value: string | DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateRange: {
        from: subDays(new Date(), 29),
        to: new Date()
      },
      therapist: '',
      appointmentType: '',
      status: '',
      patientStatus: ''
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.therapist) count++;
    if (filters.appointmentType) count++;
    if (filters.status) count++;
    if (filters.patientStatus) count++;
    return count;
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return 'Selecionar período';
    if (!range.to) return format(range.from, 'dd/MM/yyyy', { locale: ptBR });
    return `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  };

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Filtros</h3>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          )}
          
          {onExport && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Limpar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Date Range Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Período</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange(filters.dateRange)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_RANGES.map((range) => (
                    <Button
                      key={range.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateFilter('dateRange', range.getValue());
                        setIsDatePickerOpen(false);
                      }}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange?.from}
                selected={filters.dateRange}
                onSelect={(range) => updateFilter('dateRange', range)}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Therapist Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Profissional</Label>
          <Select
            value={filters.therapist}
            onValueChange={(value) => updateFilter('therapist', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os profissionais</SelectItem>
              {therapists.map((therapist) => (
                <SelectItem key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Appointment Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Consulta</Label>
          <Select
            value={filters.appointmentType}
            onValueChange={(value) => updateFilter('appointmentType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              {APPOINTMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {APPOINTMENT_STATUS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Patient Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status do Paciente</Label>
          <Select
            value={filters.patientStatus}
            onValueChange={(value) => updateFilter('patientStatus', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              {PATIENT_STATUS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}