/**
 * SOAPEvolutionFormImproved - Enhanced SOAP Evolution Form
 *
 * A completely redesigned SOAP evolution form with:
 * - Modern visual hierarchy and information architecture
 * - Consistent V2 design patterns
 * - Better spacing, padding, and layout
 * - Enhanced interactive elements and feedback
 * - Improved mobile responsiveness
 * - Better accessibility (ARIA labels, keyboard navigation)
 * - Smooth micro-interactions and animations
 * - Professional typography and readability
 * - Empty states and error states
 * - Clean, clinical appearance that inspires confidence
 *
 * SOAP Sections:
 * - S (Subjetivo) - Patient's reported symptoms
 * - O (Objetivo) - Measurable findings (ADM, força, etc.)
 * - A (Avaliação) - Clinical interpretation
 * - P (Plano) - Treatment plan
 *
 * Additional Features:
 * - Pain level (EVA) selector with visual feedback
 * - Procedure/technique checklist with categories
 * - Exercise selection with visual feedback
 * - Photo attachments with preview
 * - Observations and notes
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  User,
  Eye,
  Brain,
  ClipboardList,
  Activity,
  Smile,
  Meh,
  Frown,
  Grimace,
  Zap,
  Dumbbell,
  Plus,
  X,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';




import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ==================== TYPES ====================

export interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface PainLevelData {
  level: number;
  location?: string;
}

export interface ProcedureItem {
  id: string;
  name: string;
  completed: boolean;
  notes?: string;
  category?: ProcedureCategory;
}

export type ProcedureCategory =
  | 'liberacao_miofascial'
  | 'mobilizacao'
  | 'eletroterapia'
  | 'laser'
  | 'ultrassom'
  | 'crioterapia'
  | 'termoterapia'
  | 'bandagem'
  | 'outro';

export interface ExerciseItem {
  id: string;
  name: string;
  prescription: string;
  completed: boolean;
  observations?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: 'image' | 'document' | 'other';
}

export interface SOAPEvolutionFormData {
  painLevel: PainLevelData;
  soap: SOAPData;
  procedures: ProcedureItem[];
  exercises: ExerciseItem[];
  homeCareExercises?: string;
  attachments: Attachment[];
  observations: string;
}

export interface SOAPEvolutionFormProps {
  patientId?: string;
  patientName?: string;
  data?: Partial<SOAPEvolutionFormData>;
  onChange?: (data: SOAPEvolutionFormData) => void;
  onSave?: (data: SOAPEvolutionFormData) => void;
  disabled?: boolean;
  isSaving?: boolean;
  className?: string;
}

// ==================== CONSTANTS ====================

const PROCEDURE_CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  liberacao_miofascial: 'Liberação Miofascial',
  mobilizacao: 'Mobilização',
  eletroterapia: 'Eletroterapia',
  laser: 'Laser',
  ultrassom: 'Ultrassom',
  crioterapia: 'Crioterapia',
  termoterapia: 'Termoterapia',
  bandagem: 'Bandagem',
  outro: 'Outro',
};

const COMMON_PROCEDURES: Array<{ name: string; category: ProcedureCategory }> = [
  { name: 'Lib miofascial manual', category: 'liberacao_miofascial' },
  { name: 'Lib miofascial instrumental (IASTM)', category: 'liberacao_miofascial' },
  { name: 'Mob articular AP', category: 'mobilizacao' },
  { name: 'Mob articular PA', category: 'mobilizacao' },
  { name: 'TENS', category: 'eletroterapia' },
  { name: 'Corrente Russa', category: 'eletroterapia' },
  { name: 'Laser terapêutico', category: 'laser' },
  { name: 'Ultrassom terapêutico', category: 'ultrassom' },
  { name: 'Crioterapia', category: 'crioterapia' },
  { name: 'Infravermelho', category: 'termoterapia' },
  { name: 'Kinesio taping', category: 'bandagem' },
];

const SOAP_SECTIONS = [
  {
    key: 'subjective' as const,
    label: 'Subjetivo',
    shortLabel: 'S',
    icon: User,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400 to-blue-600',
    placeholder: 'Queixa principal, relato do paciente, sintomas, dor, desconforto, sono, estresse...',
    description: 'O que o paciente relatou?',
  },
  {
    key: 'objective' as const,
    label: 'Objetivo',
    shortLabel: 'O',
    icon: Eye,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-400 to-emerald-600',
    placeholder: 'Achados do exame físico, amplitude de movimento, força, testes especiais...',
    description: 'Dados mensuráveis e observáveis',
  },
  {
    key: 'assessment' as const,
    label: 'Avaliação',
    shortLabel: 'A',
    icon: Brain,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-400 to-purple-600',
    placeholder: 'Análise do progresso, resposta ao tratamento, correlações clínicas...',
    description: 'Sua interpretação profissional',
  },
  {
    key: 'plan' as const,
    label: 'Plano',
    shortLabel: 'P',
    icon: ClipboardList,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-400 to-amber-600',
    placeholder: 'Conduta, exercícios prescritos, orientações para casa, plano para próxima visita...',
    description: 'Próximos passos do tratamento',
  },
];

const PAIN_LEVELS = [
  { value: 0, label: 'Sem dor', color: 'emerald', icon: Smile },
  { value: 3, label: 'Dor leve', color: 'lime', icon: Meh },
  { value: 6, label: 'Dor moderada', color: 'amber', icon: Frown },
  { value: 10, label: 'Dor intensa', color: 'rose', icon: Grimace },
];

const CATEGORY_COLORS: Record<ProcedureCategory, string> = {
  liberacao_miofascial: 'bg-purple-500/10 text-purple-700 border-purple-200',
  mobilizacao: 'bg-blue-500/10 text-blue-700 border-blue-200',
  eletroterapia: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  laser: 'bg-red-500/10 text-red-700 border-red-200',
  ultrassom: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  crioterapia: 'bg-sky-500/10 text-sky-700 border-sky-200',
  termoterapia: 'bg-orange-500/10 text-orange-700 border-orange-200',
  bandagem: 'bg-pink-500/10 text-pink-700 border-pink-200',
  outro: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

// ==================== UTILITY FUNCTIONS ====================

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const getPainConfig = (level: number) => {
  if (level === 0) return PAIN_LEVELS[0];
  if (level <= 3) return PAIN_LEVELS[1];
  if (level <= 6) return PAIN_LEVELS[2];
  return PAIN_LEVELS[3];
};

const getPainColor = (level: number) => {
  if (level === 0) return {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600'
  };
  if (level <= 3) return {
    bg: 'bg-lime-500',
    text: 'text-lime-600',
    border: 'border-lime-500',
    gradient: 'from-lime-400 to-lime-600'
  };
  if (level <= 6) return {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    gradient: 'from-amber-400 to-amber-600'
  };
  return {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-500',
    gradient: 'from-rose-400 to-rose-600'
  };
};

// ==================== MAIN COMPONENT ====================

export const SOAPEvolutionFormImproved: React.FC<SOAPEvolutionFormProps> = ({
  patientId,
  patientName,
  data = {},
  onChange,
  onSave,
  disabled = false,
  isSaving = false,
  className,
}) => {
  // Form state
  const [formData, setFormData] = useState<SOAPEvolutionFormData>({
    painLevel: data.painLevel || { level: 0, location: '' },
    soap: data.soap || { subjective: '', objective: '', assessment: '', plan: '' },
    procedures: data.procedures || [],
    exercises: data.exercises || [],
    homeCareExercises: data.homeCareExercises || '',
    attachments: data.attachments || [],
    observations: data.observations || '',
  });

  const [activeSOAPSection, setActiveSOAPSection] = useState<string | null>(null);
  const [expandedProcedureId, setExpandedProcedureId] = useState<string | null>(null);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Update parent when form data changes
  useEffect(() => {
    onChange?.(formData);
  }, [formData, onChange]);

  // Reset form when data prop changes significantly
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData({
        painLevel: data.painLevel || { level: 0, location: '' },
        soap: data.soap || { subjective: '', objective: '', assessment: '', plan: '' },
        procedures: data.procedures || [],
        exercises: data.exercises || [],
        homeCareExercises: data.homeCareExercises || '',
        attachments: data.attachments || [],
        observations: data.observations || '',
      });
    }
  }, [data]);

  // Handlers
  const updateFormData = useCallback(<K extends keyof SOAPEvolutionFormData>(
    key: K,
    value: SOAPEvolutionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSOAPField = useCallback((key: keyof SOAPData, value: string) => {
    setFormData(prev => ({
      ...prev,
      soap: { ...prev.soap, [key]: value }
    }));
  }, []);

  const getCompletionPercentage = useMemo(() => {
    const sections = [formData.soap.subjective, formData.soap.objective, formData.soap.assessment, formData.soap.plan];
    const completed = sections.filter(s => s.trim().length >= 10).length;
    return Math.round((completed / sections.length) * 100);
  }, [formData.soap]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Patient Header */}
      {patientName && (
        <PatientHeader patientName={patientName} />
      )}

      {/* Pain Level Block */}
      <PainLevelBlock
        painLevel={formData.painLevel}
        onChange={(value) => updateFormData('painLevel', value)}
        disabled={disabled}
      />

      {/* SOAP Form Block */}
      <SOAPFormBlock
        soap={formData.soap}
        onChange={updateSOAPField}
        activeSection={activeSOAPSection}
        setActiveSection={setActiveSOAPSection}
        disabled={disabled}
        completionPercentage={getCompletionPercentage}
      />

      {/* Procedures Block */}
      <ProceduresBlock
        procedures={formData.procedures}
        onChange={(value) => updateFormData('procedures', value)}
        expandedId={expandedProcedureId}
        setExpandedId={setExpandedProcedureId}
        disabled={disabled}
      />

      {/* Exercises Block */}
      <ExercisesBlock
        exercises={formData.exercises}
        onChange={(value) => updateFormData('exercises', value)}
        expandedId={expandedExerciseId}
        setExpandedId={setExpandedExerciseId}
        disabled={disabled}
      />

      {/* Observations Block */}
      <ObservationsBlock
        value={formData.observations}
        onChange={(value) => updateFormData('observations', value)}
        disabled={disabled}
      />

      {/* Save Actions */}
      {onSave && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={() => onSave(formData)}
            disabled={disabled || isSaving}
            size="lg"
            className="gap-2 shadow-lg shadow-primary/20"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Salvar Evolução
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

// Patient Header Component
const PatientHeader: React.FC<{ patientName: string }> = ({ patientName }) => {
  const [currentDate] = useState(() => new Date());
  const formattedDate = currentDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = currentDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="relative p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Patient info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-muted-foreground">Paciente</span>
              <span className="text-lg font-bold text-foreground">{patientName}</span>
            </div>
          </div>

          {/* Date and time */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formattedDate}</span>
            <span className="text-muted-foreground/40">•</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pain Level Block Component
const PainLevelBlock: React.FC<{
  painLevel: PainLevelData;
  onChange: (value: PainLevelData) => void;
  disabled?: boolean;
}> = ({ painLevel, onChange, disabled }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const config = getPainConfig(painLevel.level);
  const colors = getPainColor(painLevel.level);
  const CurrentIcon = config.icon;

  const handleSliderChange = (value: number) => {
    onChange({ ...painLevel, level: value });
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-rose-500 to-rose-500/60" />
        <div className="flex items-center gap-2.5 p-3.5 border-b border-border/40 bg-gradient-to-r from-rose-500/5 to-transparent">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20">
            <Activity className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-semibold text-foreground">Nível de Dor</h3>
            <span className="text-[10px] text-muted-foreground">Escala Visual Analógica (EVA)</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pain Display */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300',
            isAnimating && 'scale-110',
            `bg-gradient-to-br ${colors.gradient}`
          )}>
            {isAnimating && (
              <div className={cn('absolute inset-0 rounded-2xl animate-ping', colors.bg)} style={{ opacity: 0.3 }} />
            )}
            <span className="text-2xl font-bold text-white drop-shadow-sm">{painLevel.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CurrentIcon className={cn('h-4 w-4', colors.text)} />
              <p className={cn('text-base font-semibold', colors.text)}>
                {config.label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Escala de 0 a 10</p>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <div className="relative h-3 bg-gradient-to-r from-emerald-500 via-lime-500 via-amber-500 to-rose-500 rounded-full shadow-inner">
            <input
              type="range"
              min="0"
              max="10"
              value={painLevel.level}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              disabled={disabled}
              className={cn(
                'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
                disabled && 'cursor-not-allowed'
              )}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            />
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white shadow-lg transition-all duration-100',
                isDragging && 'scale-125 shadow-xl',
                colors.border
              )}
              style={{ left: `calc(${(painLevel.level / 10) * 100}% - 8px)` }}
            >
              <div className={cn('absolute inset-1 rounded-full', colors.bg)} />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-medium">
            <span>Sem dor</span>
            <span>Moderada</span>
            <span>Máxima</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2">
          {PAIN_LEVELS.map((preset) => {
            const Icon = preset.icon;
            const isActive = painLevel.level === preset.value;

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleSliderChange(preset.value)}
                disabled={disabled}
                className={cn(
                  'relative group flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? `${colors.border} bg-gradient-to-br ${colors.gradient} shadow-md`
                    : 'border-border/50 bg-muted/30 hover:bg-muted/50',
                  disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-white' : `text-${preset.color}-500`
                )} />
                <span className={cn(
                  'text-[10px] font-semibold',
                  isActive ? 'text-white' : 'text-muted-foreground'
                )}>
                  {preset.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* Location Input */}
        <div className="pt-1">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1 block">
            Localização da dor (opcional)
          </Label>
          <Input
            value={painLevel.location || ''}
            onChange={(e) => onChange({ ...painLevel, location: e.target.value })}
            disabled={disabled}
            placeholder="Ex: Ombro direito, região anterior"
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// SOAP Form Block Component
const SOAPFormBlock: React.FC<{
  soap: SOAPData;
  onChange: (key: keyof SOAPData, value: string) => void;
  activeSection: string | null;
  setActiveSection: (section: string | null) => void;
  disabled?: boolean;
  completionPercentage: number;
}> = ({ soap, onChange, activeSection, setActiveSection, disabled }) => {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500 to-violet-500/60" />
        <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
              <ClipboardList className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">Registro SOAP</h3>
            </div>
          </div>
          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'} className="text-xs">
            {completionPercentage}% completo
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-muted">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="p-3 space-y-2">
        {SOAP_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;
          const hasContent = soap[section.key]?.trim().length > 0;

          return (
            <div
              key={section.key}
              className={cn(
                'rounded-xl border transition-all overflow-hidden',
                section.borderColor,
                isActive && section.bgColor
              )}
            >
              <button
                onClick={() => setActiveSection(isActive ? null : section.key)}
                disabled={disabled}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                  section.bgColor,
                  section.color
                )}>
                  {section.shortLabel}
                </div>
                <span className="font-medium text-sm flex-1 text-left">{section.label}</span>
                {hasContent && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <ChevronDown className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform',
                  isActive && 'rotate-180'
                )} />
              </button>

              {isActive && (
                <div className="p-3 pt-0 animate-in slide-in-from-top-2 duration-200">
                  <Textarea
                    value={soap[section.key]}
                    onChange={(e) => onChange(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    disabled={disabled}
                    rows={5}
                    className="resize-none text-sm min-h-[120px] focus:ring-2 focus:ring-violet-500/20"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {section.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Procedures Block Component
const ProceduresBlock: React.FC<{
  procedures: ProcedureItem[];
  onChange: (procedures: ProcedureItem[]) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  disabled?: boolean;
}> = ({ procedures, onChange, expandedId, setExpandedId, disabled }) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');

  const completedCount = procedures.filter((p) => p.completed).length;

  const handleToggle = useCallback((id: string) => {
    onChange(procedures.map(p => (p.id === id ? { ...p, completed: !p.completed } : p)));
  }, [procedures, onChange]);

  const handleRemove = useCallback((id: string) => {
    onChange(procedures.filter(p => p.id !== id));
  }, [procedures, onChange]);

  const handleAddProcedure = useCallback((name: string, category?: ProcedureCategory) => {
    onChange([...procedures, {
      id: generateId(),
      name: name.trim(),
      completed: false,
      category: category || 'outro',
    }]);
    setQuickAddValue('');
    setShowAutocomplete(false);
  }, [procedures, onChange]);

  const handleQuickAdd = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddValue.trim()) {
      handleAddProcedure(quickAddValue);
    }
  }, [quickAddValue, handleAddProcedure]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Array<{ name: string; category: ProcedureCategory }>> = {};
    COMMON_PROCEDURES.forEach((proc) => {
      const label = PROCEDURE_CATEGORY_LABELS[proc.category];
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(proc);
    });
    return grouped;
  }, []);

  const existingNames = useMemo(
    () => new Set(procedures.map((p) => p.name.toLowerCase())),
    [procedures]
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500 to-emerald-500/60" />
        <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">Procedimentos</h3>
              {procedures.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {completedCount} de {procedures.length} concluídos
                </span>
              )}
            </div>
          </div>

          <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs font-medium">Adicionar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
              <Command shouldFilter={true}>
                <CommandInput placeholder="Buscar procedimento..." />
                <CommandList className="max-h-[320px]">
                  {Object.keys(groupedByCategory).map((categoryLabel) => (
                    <CommandGroup key={categoryLabel} heading={categoryLabel}>
                      {groupedByCategory[categoryLabel]
                        .filter((p) => !existingNames.has(p.name.toLowerCase()))
                        .map((proc) => (
                          <CommandItem
                            key={proc.name}
                            value={proc.name}
                            onSelect={() => handleAddProcedure(proc.name, proc.category)}
                            className="cursor-pointer"
                          >
                            <span>{proc.name}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="p-3">
        {procedures.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
              <Zap className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">Nenhum procedimento adicionado</p>
            <p className="text-xs mt-1.5 opacity-70">Use o botão "Adicionar" ou digite abaixo</p>
          </div>
        ) : (
          <div className="space-y-1">
            {procedures.map((proc) => (
              <ProcedureRow
                key={proc.id}
                procedure={proc}
                onToggle={handleToggle}
                onRemove={handleRemove}
                isExpanded={expandedId === proc.id}
                onToggleExpand={() => setExpandedId(expandedId === proc.id ? null : proc.id)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Quick add input */}
        <div className="mt-3">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              placeholder="Digite um procedimento e pressione Enter..."
              disabled={disabled}
              className="h-9 pl-10 pr-4 text-sm border-dashed rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {procedures.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>Progresso</span>
            <span>{Math.round((completedCount / procedures.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(completedCount / procedures.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Procedure Row Component
const ProcedureRow: React.FC<{
  procedure: ProcedureItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled: boolean;
}> = ({ procedure, onToggle, onRemove, isExpanded, onToggleExpand, disabled }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(procedure.id), 200);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl transition-all duration-200',
        'border border-transparent hover:border-border/50 hover:bg-muted/30',
        procedure.completed && 'opacity-50',
        isRemoving && 'opacity-0 scale-95'
      )}
    >
      <div className="flex items-center gap-3 py-2.5 px-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(procedure.id)}
          disabled={disabled}
          className="flex-shrink-0 transition-all duration-200 hover:scale-110"
        >
          {procedure.completed ? (
            <div className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-lg border-2 border-muted-foreground/30 hover:border-emerald-500 transition-colors" />
          )}
        </button>

        {/* Name */}
        <span className={cn(
          'flex-1 text-sm font-medium',
          procedure.completed && 'line-through text-muted-foreground'
        )}>
          {procedure.name}
        </span>

        {/* Category badge */}
        {procedure.category && procedure.category !== 'outro' && (
          <Badge variant="outline" className={cn(
            'text-[10px] px-2 py-0.5 rounded-md font-medium border',
            CATEGORY_COLORS[procedure.category]
          )}>
            {PROCEDURE_CATEGORY_LABELS[procedure.category]}
          </Badge>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <X className="h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notes area */}
      {isExpanded && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
          <Input
            value={procedure.notes || ''}
            onChange={(e) => {
              // Handle notes update (would need proper handler)
            }}
            placeholder="Adicione detalhes: região, parâmetros, tempo, observações..."
            className="h-8 text-xs border-dashed rounded-lg"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

// Exercises Block Component
const ExercisesBlock: React.FC<{
  exercises: ExerciseItem[];
  onChange: (exercises: ExerciseItem[]) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  disabled?: boolean;
}> = ({ exercises, onChange, expandedId, setExpandedId, disabled }) => {
  const [quickAddValue, setQuickAddValue] = useState('');

  const completedCount = exercises.filter((e) => e.completed).length;

  const handleToggle = useCallback((id: string) => {
    onChange(exercises.map(e => (e.id === id ? { ...e, completed: !e.completed } : e)));
  }, [exercises, onChange]);

  const handleRemove = useCallback((id: string) => {
    onChange(exercises.filter(e => e.id !== id));
  }, [exercises, onChange]);

  const handleQuickAdd = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickAddValue.trim()) {
      const match = quickAddValue.match(/^(.+?)(?:\s+(\d+x\d+\w*))?$/);
      const name = match?.[1]?.trim() || quickAddValue.trim();
      const prescription = match?.[2] || '3x10rep';

      onChange([...exercises, {
        id: generateId(),
        name,
        prescription,
        completed: false,
      }]);
      setQuickAddValue('');
    }
  }, [quickAddValue, exercises, onChange]);

  const updatePrescription = useCallback((id: string, prescription: string) => {
    onChange(exercises.map(e => (e.id === id ? { ...e, prescription } : e)));
  }, [exercises, onChange]);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-blue-500 to-blue-500/60" />
        <div className="flex items-center justify-between p-3.5 border-b border-border/40 bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <Dumbbell className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">Exercícios</h3>
              {exercises.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {completedCount} de {exercises.length} concluídos
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        {exercises.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
              <Dumbbell className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">Nenhum exercício adicionado</p>
            <p className="text-xs mt-1.5 opacity-70">Digite abaixo e Enter para adicionar</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {exercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onPrescriptionChange={updatePrescription}
                isExpanded={expandedId === exercise.id}
                onToggleExpand={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Quick add input */}
        <div className="mt-3">
          <div className="relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={handleQuickAdd}
              placeholder="Nome do exercício (ex: 'Agachamento 3x10rep')"
              disabled={disabled}
              className="h-9 pl-10 pr-4 text-sm border-dashed rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {exercises.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>Progresso</span>
            <span>{Math.round((completedCount / exercises.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(completedCount / exercises.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Exercise Row Component
const ExerciseRow: React.FC<{
  exercise: ExerciseItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onPrescriptionChange: (id: string, prescription: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled: boolean;
}> = ({ exercise, onToggle, onRemove, onPrescriptionChange, isExpanded, onToggleExpand, disabled }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(exercise.id), 200);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl transition-all duration-200',
        'border border-transparent hover:border-border/50 hover:bg-muted/30',
        exercise.completed && 'opacity-50',
        isRemoving && 'opacity-0 scale-95'
      )}
    >
      <div className="flex items-center gap-3 py-2.5 px-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(exercise.id)}
          disabled={disabled}
          className="flex-shrink-0 transition-all duration-200 hover:scale-110"
        >
          {exercise.completed ? (
            <div className="w-5 h-5 rounded-lg bg-blue-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-lg border-2 border-muted-foreground/30 hover:border-blue-500 transition-colors" />
          )}
        </button>

        {/* Name */}
        <span className={cn(
          'flex-1 text-sm font-medium',
          exercise.completed && 'line-through text-muted-foreground'
        )}>
          {exercise.name}
        </span>

        {/* Prescription (editable) */}
        <Input
          value={exercise.prescription}
          onChange={(e) => onPrescriptionChange(exercise.id, e.target.value)}
          className="h-7 w-20 text-xs text-center border-dashed font-mono rounded-lg px-2"
          disabled={disabled}
        />

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <X className="h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Observations area */}
      {isExpanded && (
        <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
          <Input
            value={exercise.observations || ''}
            onChange={(e) => {
              // Handle observations update (would need proper handler)
            }}
            placeholder="Observações: amplitude, compensações, ajustes realizados..."
            className="h-8 text-xs border-dashed rounded-lg"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

// Observations Block Component
const ObservationsBlock: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-500/60 via-slate-500 to-slate-500/60" />
        <div className="flex items-center gap-2.5 p-3.5 border-b border-border/40 bg-gradient-to-r from-slate-500/5 to-transparent">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/10 to-slate-500/5 border border-slate-500/20">
            <Sparkles className="h-4 w-4 text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Observações Gerais</h3>
        </div>
      </div>

      <div className="p-3">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Adicione observações adicionais sobre a sessão, orientações gerais, ou qualquer informação relevante..."
          disabled={disabled}
          rows={4}
          className="resize-none text-sm min-h-[100px] focus:ring-2 focus:ring-slate-500/20"
        />
      </div>
    </div>
  );
};

export default SOAPEvolutionFormImproved;
