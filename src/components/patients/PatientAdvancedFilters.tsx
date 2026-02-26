import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import {
  PATIENT_CLASSIFICATIONS,
  PatientClassification,
  type PatientClassificationFilter
} from '@/hooks/usePatientStats';
import type { PatientFilters } from './patientFiltersUtils';

export type { PatientFilters };

export interface PatientAdvancedFiltersProps {
  onFilterChange: (filters: PatientFilters) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const classificationOptions: PatientClassificationFilter[] = Object.values(PATIENT_CLASSIFICATIONS);

export function PatientAdvancedFilters({
  onFilterChange,
  activeFiltersCount,
  onClearFilters
}: PatientAdvancedFiltersProps) {
  const [filters, setFilters] = useState<PatientFilters>({});

  const updateFilter = <K extends keyof PatientFilters>(key: K, value: PatientFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleClassification = (classification: PatientClassification) => {
    const newValue = filters.classification === classification ? 'all' : classification;
    updateFilter('classification', newValue);
  };

  const clearFilters = () => {
    setFilters({});
    onClearFilters();
  };

  return (
    <div className="space-y-4 py-2">
      {/* Classificação de Pacientes */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classificação</Label>
        <div className="flex flex-wrap gap-1.5">
          {classificationOptions.map((option) => (
            <Button
              key={option.value}
              variant={filters.classification === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => toggleClassification(option.value as PatientClassification)}
              className="text-[10px] h-7 px-2"
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filtros de Sessões */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessões Realizadas</Label>
        <div className="flex items-center gap-2">
          <Switch
            id="min-sessions"
            checked={!!filters.minSessionsCompleted}
            onCheckedChange={(checked) =>
              updateFilter('minSessionsCompleted', checked ? 1 : undefined)
            }
          />
          <Label htmlFor="min-sessions" className="text-xs cursor-pointer">
            Mínimo de {filters.minSessionsCompleted || 1}+ sessões
          </Label>
        </div>
      </div>

      {/* Filtros de Pagamento e Comparecimento */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condições Especiais</Label>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id="has-unpaid"
              checked={!!filters.hasUnpaid}
              onCheckedChange={(checked) => updateFilter('hasUnpaid', checked || undefined)}
            />
            <Label htmlFor="has-unpaid" className="text-xs cursor-pointer">
              Sessões não pagas
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="has-noshow"
              checked={!!filters.hasNoShow}
              onCheckedChange={(checked) => updateFilter('hasNoShow', checked || undefined)}
            />
            <Label htmlFor="has-noshow" className="text-xs cursor-pointer">
              Faltas (no-show)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="has-upcoming"
              checked={!!filters.hasUpcoming}
              onCheckedChange={(checked) => updateFilter('hasUpcoming', checked || undefined)}
            />
            <Label htmlFor="has-upcoming" className="text-xs cursor-pointer">
              Agendamentos futuros
            </Label>
          </div>
        </div>
      </div>

      {/* Filtro de Dias Inativo */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Inatividade: {filters.daysInactive || 0}+ dias
        </Label>
        <Slider
          value={[filters.daysInactive || 0]}
          onValueChange={([value]) => updateFilter('daysInactive', value > 0 ? value : undefined)}
          min={0}
          max={90}
          step={7}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>7d</span>
          <span>30d</span>
          <span>60d</span>
          <span>90d+</span>
        </div>
      </div>

      {/* Botão Limpar Filtros */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full h-8 text-xs border-dashed"
        >
          <X className="w-3 h-3 mr-2" />
          Limpar Todos os Filtros
        </Button>
      )}
    </div>
  );
}
