/**
 * NotionEvolutionPanel - Improved V2 Evolution editor
 *
 * Notion/Evernote-style block editor for clinical evolutions with
 * enhanced UX/UI including:
 *   - Better visual hierarchy and spacing
 *   - Smooth animations and transitions
 *   - Professional color scheme
 *   - Improved responsive design
 *   - Enhanced accessibility
 *   - Micro-interactions
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText,
  MessageCircle,
  StickyNote,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MagicTextarea } from '@/components/ai/MagicTextarea';
import { cn } from '@/lib/utils';
import { EvolutionHeaderBlock } from './EvolutionHeaderBlock';
import { ProcedureChecklistBlock } from './ProcedureChecklistBlock';
import { ExerciseBlockV2 } from './ExerciseBlockV2';
import { PainLevelBlock } from './PainLevelBlock';
import { HomeCareBlock } from './HomeCareBlock';
import { AttachmentsBlock } from './AttachmentsBlock';
import { MeasurementsBlock } from './MeasurementsBlock';
import type { EvolutionV2Data } from './types';

interface NotionEvolutionPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
  className?: string;
}

// Enhanced Text block with improved styling
const TextBlock: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  iconGradient?: string;
  title: string;
  placeholder: string;
  hint: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
  accentColor?: string;
}> = ({
  icon,
  iconBg,
  iconGradient,
  title,
  placeholder,
  hint,
  value,
  onValueChange,
  disabled,
  rows = 4,
  className,
  accentColor = 'primary'
}) => {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSentValue = useRef(value);

    // Sync external value changes
    useEffect(() => {
      if (value !== localValue && value !== lastSentValue.current && !debounceTimer.current) {
        setLocalValue(value || '');
        lastSentValue.current = value || '';
      }
    }, [value, localValue]);

    useEffect(() => {
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, []);

    const handleChange = useCallback(
      (val: string) => {
        setLocalValue(val);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          lastSentValue.current = val;
          onValueChange(val);
        }, 800);
      },
      [onValueChange]
    );

    const hasContent = localValue.trim().length > 0;

    const accentColors: Record<string, { from: string; to: string; border: string }> = {
      primary: { from: 'from-primary/60', to: 'to-primary', border: 'border-primary' },
      sky: { from: 'from-sky-500/60', to: 'to-sky-500', border: 'border-sky-500' },
      violet: { from: 'from-violet-500/60', to: 'to-violet-500', border: 'border-violet-500' },
      amber: { from: 'from-amber-500/60', to: 'to-amber-500', border: 'border-amber-500' },
    };

    const colors = accentColors[accentColor] || accentColors.primary;

    return (
      <div className={cn(
        'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
        'shadow-sm hover:shadow-md hover:border-border/70',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isFocused && `ring-2 ring-${accentColor}/10 shadow-md`,
        className
      )}>
        {/* Top accent line */}
        <div className={cn(
          'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r transition-all duration-500',
          isFocused ? `opacity-100 ${colors.from} ${colors.to}` : 'opacity-0'
        )} />

        {/* Header */}
        <div className="flex items-center gap-2.5 p-3.5 border-b border-border/40 bg-gradient-to-r from-muted/30 to-muted/10 transition-colors duration-300">
          <div className={cn(
            'p-1.5 rounded-lg transition-all duration-300 ease-out',
            iconBg,
            isFocused ? 'scale-110 shadow-md' : 'hover:scale-105'
          )}>
            {icon}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            {hasContent && (
              <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1 animate-in slide-in-from-top-1 duration-300">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Preenchido
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className={cn(
            'rounded-lg border border-transparent transition-all duration-200',
            isFocused && 'border-border/50 bg-muted/30'
          )}>
            <MagicTextarea
              value={localValue}
              onValueChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              className="min-h-[100px] border-0 shadow-none resize-y focus-visible:ring-0 bg-transparent px-0"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {hint}
          </p>
        </div>
      </div>
    );
  };

export const NotionEvolutionPanel: React.FC<NotionEvolutionPanelProps> = ({
  data,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  autoSaveEnabled = false,
  lastSaved,
  className,
}) => {
  // Calculate completion
  const filledBlocks = [
    data.patientReport?.trim(),
    data.evolutionText?.trim(),
    data.procedures?.length > 0,
    data.exercises?.length > 0,
    data.painLevel !== undefined,
    data.measurements && data.measurements.length > 0,
    data.observations?.trim() || data.homeCareExercises || (data.attachments && data.attachments.length > 0),
  ].filter(Boolean).length;
  const totalBlocks = 7;
  const completionPercent = Math.round((filledBlocks / totalBlocks) * 100);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <Card className={cn(
      'h-full flex flex-col border-border/50 shadow-lg overflow-hidden',
      'animate-in fade-in-0 duration-300',
      className
    )}>
      {/* Enhanced Panel header */}
      <div className="relative">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-primary/8 pointer-events-none" />

        <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 shadow-sm transition-all duration-300 hover:shadow-md">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-foreground">Evolução</span>
                <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 rounded-full border-primary/30 text-primary bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-300">
                  V2 - Texto Livre
                </Badge>
              </div>
              {completionPercent < 100 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-3 w-3" />
                  {totalBlocks - filledBlocks} bloco{totalBlocks - filledBlocks !== 1 ? 's' : ''} pendente{totalBlocks - filledBlocks !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {autoSaveEnabled && lastSaved && (
              <Badge variant="outline" className="text-xs h-7 px-2.5 gap-1.5 rounded-lg border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 shadow-sm transition-all duration-300 hover:shadow">
                <CheckCircle2 className="h-3 w-3" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] opacity-70">Salvo às</span>
                  <span className="text-[10px] font-medium">
                    {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </Badge>
            )}
            <Badge
              variant={completionPercent === 100 ? 'default' : 'secondary'}
              className={cn(
                'text-xs h-7 px-2.5 rounded-lg transition-all duration-300',
                completionPercent === 100 && 'bg-gradient-to-r from-primary to-primary/80 shadow-md animate-pulse'
              )}
            >
              {filledBlocks}/{totalBlocks} blocos
            </Badge>
          </div>
        </div>
      </div>

      {/* Enhanced Progress bar */}
      <div className="w-full h-1.5 bg-muted/80 relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10" />
        <div
          className="h-full bg-gradient-to-r from-primary via-primary/95 to-primary/90 transition-all duration-700 ease-out relative"
          style={{ width: `${completionPercent}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          {/* Glow effect at the end */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-full bg-white/50 blur-[2px]" />
        </div>
      </div>

      {/* Blocks */}
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Block 1: Header (auto-filled) */}
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <EvolutionHeaderBlock
            therapistName={data.therapistName}
            therapistCrefito={data.therapistCrefito}
            sessionDate={data.sessionDate}
            sessionNumber={data.sessionNumber}
            totalSessions={data.totalSessions}
          />
        </div>

        {/* Block 2 & 3: Pain Level (EVA) + Patient Report - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] gap-4 animate-in fade-in-0 slide-in-from-top-3 duration-300 delay-100">
          {/* Pain Level (EVA) */}
          <PainLevelBlock
            painLevel={data.painLevel}
            painLocation={data.painLocation}
            onPainLevelChange={(level) => handleFieldChange('painLevel', level)}
            onPainLocationChange={(location) => handleFieldChange('painLocation', location)}
            disabled={disabled}
          />

          {/* Patient Report */}
          <TextBlock
            icon={<MessageCircle className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-500/10 border border-sky-500/20"
            title="Relato do Paciente"
            placeholder="O que o paciente relatou? Como se sente desde a última sessão? Mudanças na dor, medicação, sono..."
            hint="Relato verbal do paciente sobre sua condição atual"
            value={data.patientReport}
            onValueChange={(val) => handleFieldChange('patientReport', val)}
            disabled={disabled}
            rows={4}
            className="h-full"
            accentColor="sky"
          />
        </div>

        {/* Block 4: Main Evolution Text */}
        <div className="animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-150">
          <TextBlock
            icon={<FileText className="h-4 w-4 text-violet-600" />}
            iconBg="bg-violet-500/10 border border-violet-500/20"
            title="Texto de Evolução"
            placeholder={`Descreva a evolução da sessão livremente...\n\nExemplo:\nOBJETIVO:\nReeducação da coordenação muscular entre musculatura escapular e GU\nEstabilização dinâmica da GU durante abdução e flexão de ombro.\n\nPaciente apresentou melhora da ADM em flexão...`}
            hint="Texto livre para descrever a evolução - use como preferir (pode incluir objetivo, achados, conduta)"
            value={data.evolutionText}
            onValueChange={(val) => handleFieldChange('evolutionText', val)}
            disabled={disabled}
            rows={12}
            accentColor="violet"
          />
        </div>

        <Separator className="my-3" />

        {/* Block 5: Procedures Checklist */}
        <div className="animate-in fade-in-0 slide-in-from-top-5 duration-300 delay-200">
          <ProcedureChecklistBlock
            procedures={data.procedures}
            onChange={(procs) => handleFieldChange('procedures', procs)}
            disabled={disabled}
          />
        </div>

        {/* Block 6: Exercises */}
        <div className="animate-in fade-in-0 slide-in-from-top-6 duration-300 delay-250">
          <ExerciseBlockV2
            exercises={data.exercises}
            onChange={(exs) => handleFieldChange('exercises', exs)}
            disabled={disabled}
          />
        </div>

        {/* Block 6.5: Measurements */}
        <div className="animate-in fade-in-0 slide-in-from-top-7 duration-300 delay-300">
          <MeasurementsBlock
            measurements={data.measurements || []}
            onChange={(meas) => handleFieldChange('measurements', meas)}
            disabled={disabled}
          />
        </div>

        <Separator className="my-3" />

        {/* Block 7: Observations, Home Care, Attachments - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-top-8 duration-300 animate-delay-7">
          {/* Observations */}
          <TextBlock
            icon={<StickyNote className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-500/10 border border-amber-500/20"
            title="Observações"
            placeholder="Orientações gerais, encaminhamentos, cuidados..."
            hint="Informações adicionais e orientações"
            value={data.observations}
            onValueChange={(val) => handleFieldChange('observations', val)}
            disabled={disabled}
            rows={4}
            className="h-full"
            accentColor="amber"
          />

          {/* Home Care Exercises */}
          <HomeCareBlock
            value={data.homeCareExercises || ''}
            onChange={(val) => handleFieldChange('homeCareExercises', val)}
            disabled={disabled}
            className="h-full"
          />

          {/* Attachments */}
          <AttachmentsBlock
            patientId={data.therapistName}
            value={data.attachments || []}
            onChange={(val) => handleFieldChange('attachments', val)}
            disabled={disabled}
            className="h-full"
          />
        </div>

        {/* Save button (when not using auto-save) - Enhanced */}
        {onSave && (
          <div className="flex justify-end pt-3 animate-in fade-in-0 duration-500">
            <Button
              onClick={onSave}
              disabled={disabled || isSaving}
              className="gap-2 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Evolução
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
