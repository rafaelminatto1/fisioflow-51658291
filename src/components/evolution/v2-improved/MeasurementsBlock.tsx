/**
 * MeasurementsBlock - Improved V2
 *
 * Enhanced measurements registration block with better UX,
 * professional visual design, and proper Y-Balance test layout.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Ruler,
  Plus,
  Trash2,
  Sparkles,
  GripVertical,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Activity,
  Zap,
  Target,
  Heart,
  Stethoscope,
  Droplets,
  Wind,
  Thermometer,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { YBalanceBlock } from './YBalanceBlock';
import {
  type MeasurementItem,
  type MeasurementType,
  MEASUREMENT_TYPES,
  MEASUREMENT_TYPE_LABELS,
} from './types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ClinicalTestCombobox, type ClinicalTest as ClinicalTestComboboxTest } from '@/components/ui/clinical-test-combobox';
import type { ClinicalTest } from '@/components/clinical/TestLibraryModal';

// Vital signs configuration
const VITAL_SIGNS_FIELDS = [
  {
    id: 'bp',
    label: 'Pressão Arterial',
    shortLabel: 'PA',
    unit: 'mmHg',
    type: 'text',
    placeholder: '120/80',
    icon: Stethoscope,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'hr',
    label: 'Frequência Cardíaca',
    shortLabel: 'FC',
    unit: 'bpm',
    type: 'number',
    placeholder: '70',
    icon: Heart,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  {
    id: 'spo2',
    label: 'Saturação O2',
    shortLabel: 'SpO2',
    unit: '%',
    type: 'number',
    placeholder: '98',
    icon: Droplets,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  {
    id: 'rr',
    label: 'Freq. Respiratória',
    shortLabel: 'FR',
    unit: 'rpm',
    type: 'number',
    placeholder: '16',
    icon: Wind,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  {
    id: 'temp',
    label: 'Temperatura',
    shortLabel: 'Temp',
    unit: '°C',
    type: 'number',
    placeholder: '36.5',
    icon: Thermometer,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
] as const;

interface MeasurementsBlockProps {
  measurements: MeasurementItem[];
  onChange: (measurements: MeasurementItem[]) => void;
  disabled?: boolean;
  className?: string;
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'meas_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const MeasurementsBlock: React.FC<MeasurementsBlockProps> = ({
  measurements,
  onChange,
  disabled = false,
  className,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleAddMeasurement = useCallback(
    (template?: Partial<MeasurementItem>) => {
      const newMeasurement: MeasurementItem = {
        id: generateId(),
        measurement_type: template?.measurement_type || '',
        measurement_name: template?.measurement_name || '',
        value: template?.value || '',
        unit: template?.unit || '',
        notes: template?.notes || '',
        custom_data: template?.custom_data || {},
        selectedTestId: template?.selectedTestId,
        selectedTest: template?.selectedTest,
        completed: false,
      };
      onChange([...measurements, newMeasurement]);
      setExpandedId(newMeasurement.id);
    },
    [measurements, onChange]
  );

  const handleRemoveMeasurement = useCallback(
    (id: string) => {
      onChange(measurements.filter((m) => m.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
      }
    },
    [measurements, onChange, expandedId]
  );

  const handleUpdateMeasurement = useCallback(
    (id: string, field: keyof MeasurementItem, value: unknown) => {
      onChange(
        measurements.map((m) =>
          m.id === id ? { ...m, [field]: value } : m
        )
      );
    },
    [measurements, onChange]
  );

  const handleUpdateCustomData = useCallback(
    (id: string, key: string, value: string) => {
      onChange(
        measurements.map((m) => {
          if (m.id === id) {
            return {
              ...m,
              custom_data: {
                ...m.custom_data,
                [key]: value,
              },
            };
          }
          return m;
        })
      );
    },
    [measurements, onChange]
  );

  const completedCount = measurements.filter((m) => m.completed).length;

  // Quick templates
  const quickTemplates = [
    { name: 'Y-Balance Test', type: 'Teste Funcional', measurement_name: 'Y-Balance Test', unit: 'cm' },
    { name: 'Sinais Vitais', type: 'Sinais Vitais', measurement_name: 'Checkup Geral', unit: '' },
    { name: 'Goniometria', type: 'Goniometria', measurement_name: 'ADM', unit: 'graus' },
    { name: 'Dor (EVA)', type: 'Dor (EVA)', measurement_name: 'EVA', unit: '0-10' },
    { name: 'Força Muscular', type: 'Força Muscular', measurement_name: 'Força', unit: '0-5' },
  ];

  const isYBalanceTest = (m: MeasurementItem) =>
    m.measurement_name?.toLowerCase().includes('y-balance') ||
    m.measurement_name?.toLowerCase().includes('y test') ||
    m.selectedTest?.layout_type === 'y_balance';

  return (
    <>
      <div className={cn(
        'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
        'shadow-sm hover:shadow-md',
        className
      )}>
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500 to-violet-500/60" />
          <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
                <Ruler className="h-4 w-4 text-violet-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground">Medições</h3>
                {measurements.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {completedCount} de {measurements.length} registradas
                  </span>
                )}
              </div>
            </div>

            <Popover open={showTemplates} onOpenChange={setShowTemplates}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">Adicionar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar medição..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      <div className="py-4 px-3 text-center text-xs text-muted-foreground">
                        Use os modelos abaixo
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Modelos Rápidos">
                      {quickTemplates.map((template) => (
                        <CommandItem
                          key={template.name}
                          onSelect={() => {
                            handleAddMeasurement(template);
                            setShowTemplates(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4 mr-2 text-violet-500" />
                          <span>{template.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="Tipo Personalizado">
                      {MEASUREMENT_TYPES.map((type) => (
                        <CommandItem
                          key={type}
                          onSelect={() => {
                            handleAddMeasurement({
                              measurement_type: type,
                              measurement_name: '',
                            });
                            setShowTemplates(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{MEASUREMENT_TYPE_LABELS[type]}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Measurements list */}
        <div className="p-3 space-y-3">
          {measurements.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
                <Ruler className="h-7 w-7 opacity-30" />
              </div>
              <p className="text-sm font-medium">Nenhuma medição adicionada</p>
              <p className="text-xs mt-1.5 opacity-70">Use o botão "Adicionar" para registrar</p>
            </div>
          ) : (
            measurements.map((measurement, index) => (
              <MeasurementCard
                key={measurement.id}
                measurement={measurement}
                index={index}
                isExpanded={expandedId === measurement.id}
                onToggleExpand={() => setExpandedId(expandedId === measurement.id ? null : measurement.id)}
                onUpdate={(field, value) => handleUpdateMeasurement(measurement.id, field, value)}
                onUpdateCustomData={(key, value) => handleUpdateCustomData(measurement.id, key, value)}
                onRemove={() => handleRemoveMeasurement(measurement.id)}
                disabled={disabled}
              />
            ))
          )}
        </div>

        {/* Progress bar */}
        {measurements.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{Math.round((completedCount / measurements.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${measurements.length > 0 ? (completedCount / measurements.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Individual Measurement Card
const MeasurementCard: React.FC<{
  measurement: MeasurementItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: keyof MeasurementItem, value: unknown) => void;
  onUpdateCustomData: (key: string, value: string) => void;
  onRemove: () => void;
  disabled: boolean;
}> = React.memo(({
  measurement,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onUpdateCustomData,
  onRemove,
  disabled,
}) => {
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(), 200);
  };

  const isVitalSigns = measurement.measurement_type === 'Sinais Vitais';
  const isYBalance = measurement.measurement_name?.toLowerCase().includes('y-balance') ||
    measurement.measurement_name?.toLowerCase().includes('y test') ||
    measurement.selectedTest?.layout_type === 'y_balance';
  const hasValues = measurement.value ||
    Object.values(measurement.custom_data || {}).some(v => v !== '');

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200 overflow-hidden',
        'bg-card hover:bg-muted/30',
        measurement.completed
          ? 'border-violet-200 bg-violet-50/30'
          : 'border-border hover:border-violet-200',
        isRemoving && 'opacity-0 scale-95'
      )}
    >
      {/* Header - always visible */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 cursor-pointer',
          'transition-colors duration-200'
        )}
        onClick={() => !disabled && onToggleExpand()}
      >
        {/* Drag handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />

        {/* Status indicator */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdate('completed', !measurement.completed);
          }}
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-lg border-2 transition-all duration-200',
            measurement.completed
              ? 'bg-violet-500 border-violet-500 flex items-center justify-center'
              : 'border-muted-foreground/30 hover:border-violet-400'
          )}
        >
          {measurement.completed && (
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          )}
        </button>

        {/* Measurement info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {measurement.measurement_name ? (
              <>
                <span className={cn(
                  'text-sm font-medium truncate',
                  measurement.completed && 'line-through text-muted-foreground'
                )}>
                  {measurement.measurement_name}
                </span>
                {measurement.measurement_type && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                    {measurement.measurement_type}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Nova medição</span>
            )}
          </div>
          {hasValues && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {measurement.value && `${measurement.value} ${measurement.unit || ''}`}
              {!measurement.value && Object.entries(measurement.custom_data || {})
                .filter(([_, v]) => v !== '')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
              }
            </p>
          )}
        </div>

        {/* Expand/collapse */}
        <button
          className={cn(
            'p-1 rounded-lg hover:bg-muted transition-all',
            'text-muted-foreground/60 hover:text-muted-foreground'
          )}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="p-1 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/40 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Type selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Tipo
              </Label>
              <Select
                value={measurement.measurement_type}
                onValueChange={(value) => onUpdate('measurement_type', value)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-sm">
                      {MEASUREMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Nome da Medição
              </Label>
              <Input
                value={measurement.measurement_name}
                onChange={(e) => onUpdate('measurement_name', e.target.value)}
                placeholder="Ex: Flexão de joelho"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Y-Balance Test */}
          {isYBalance ? (
            <YBalanceBlock
              values={{
                anterior: measurement.custom_data.anterior || '',
                posteromedial: measurement.custom_data.posteromedial || '',
                posterolateral: measurement.custom_data.posterolateral || '',
              }}
              unit={measurement.unit || 'cm'}
              onChange={(key, value) => onUpdateCustomData(key, value)}
              notes={measurement.notes || ''}
              onNotesChange={(value) => onUpdate('notes', value)}
            />
          ) : isVitalSigns ? (
            /* Vital Signs */
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Sinais Vitais
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {VITAL_SIGNS_FIELDS.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'p-2.5 rounded-lg border transition-all duration-200',
                        'bg-background hover:border-violet-300',
                        'focus-within:ring-2 focus-within:ring-violet-100 focus-within:border-violet-400',
                        field.border
                      )}
                    >
                      <Label
                        htmlFor={`vital-${field.id}-${measurement.id}`}
                        className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between mb-1.5"
                      >
                        <span className="flex items-center gap-1">
                          <Icon className={cn('h-3 w-3', field.color)} />
                          {field.shortLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 lowercase">
                          {field.unit}
                        </span>
                      </Label>
                      <Input
                        id={`vital-${field.id}-${measurement.id}`}
                        type={field.type}
                        value={measurement.custom_data[field.id] || ''}
                        onChange={(e) => onUpdateCustomData(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Standard measurement */
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-blue-500" />
                  Valor
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurement.value}
                  onChange={(e) => onUpdate('value', e.target.value)}
                  placeholder="0.0"
                  className="h-9 text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-violet-500" />
                  Unidade
                </Label>
                <Input
                  value={measurement.unit}
                  onChange={(e) => onUpdate('unit', e.target.value)}
                  placeholder="cm, graus..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Anotações
              <span className="text-muted-foreground/60 font-normal lowercase">(opcional)</span>
            </Label>
            <textarea
              value={measurement.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder="Observações sobre esta medição..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring placeholder:text-muted-foreground/50 min-h-[60px] resize-y"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
});

MeasurementCard.displayName = 'MeasurementCard';
