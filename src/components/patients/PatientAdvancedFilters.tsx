import { useState } from 'react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Slider } from '@/components/shared/ui/slider';
import { Switch } from '@/components/shared/ui/switch';
import { Label } from '@/components/shared/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/web/ui/collapsible';
import { Filter, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [isOpen, setIsOpen] = useState(false);
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Filtros Avançados</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isOpen && "transform rotate-180"
                )}
              />
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-3 sm:px-4 pb-4 space-y-4 border-t">
            {/* Classificação de Pacientes */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Classificação</Label>
              <div className="flex flex-wrap gap-2">
                {classificationOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.classification === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleClassification(option.value as PatientClassification)}
                    className="text-xs h-8"
                  >
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtros de Sessões */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Sessões Realizadas</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="min-sessions"
                    checked={!!filters.minSessionsCompleted}
                    onCheckedChange={(checked) =>
                      updateFilter('minSessionsCompleted', checked ? 1 : undefined)
                    }
                  />
                  <Label htmlFor="min-sessions" className="text-sm cursor-pointer">
                    Mínimo de {filters.minSessionsCompleted || 1}+ sessões
                  </Label>
                </div>
              </div>
            </div>

            {/* Filtros de Pagamento e Comparecimento */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Condições Especiais</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="has-unpaid"
                    checked={!!filters.hasUnpaid}
                    onCheckedChange={(checked) => updateFilter('hasUnpaid', checked || undefined)}
                  />
                  <Label htmlFor="has-unpaid" className="text-sm cursor-pointer">
                    Com sessões não pagas
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="has-noshow"
                    checked={!!filters.hasNoShow}
                    onCheckedChange={(checked) => updateFilter('hasNoShow', checked || undefined)}
                  />
                  <Label htmlFor="has-noshow" className="text-sm cursor-pointer">
                    Com faltas (no-show)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="has-upcoming"
                    checked={!!filters.hasUpcoming}
                    onCheckedChange={(checked) => updateFilter('hasUpcoming', checked || undefined)}
                  />
                  <Label htmlFor="has-upcoming" className="text-sm cursor-pointer">
                    Com agendamentos futuros
                  </Label>
                </div>
              </div>
            </div>

            {/* Filtro de Dias Inativo */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Dias sem Comparecimento: {filters.daysInactive || 0}+
              </Label>
              <Slider
                value={[filters.daysInactive || 0]}
                onValueChange={([value]) => updateFilter('daysInactive', value > 0 ? value : undefined)}
                min={0}
                max={90}
                step={7}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
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
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Limpar Todos os Filtros
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
