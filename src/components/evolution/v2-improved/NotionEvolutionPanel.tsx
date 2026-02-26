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
import React, { useCallback } from 'react';
import {
  FileText,
  MessageCircle,
  StickyNote,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RichTextBlock } from './RichTextBlock';
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
      'h-full flex flex-col border-none shadow-none bg-background overflow-hidden',
      className
    )}>
      {/* Enhanced Panel header */}
      <div className="relative">

        <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-foreground">Evolução</span>
                <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 rounded-full border-primary/30 text-primary bg-primary/5">
                  V2 - Texto Livre
                </Badge>
              </div>
              {completionPercent < 100 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {totalBlocks - filledBlocks} bloco{totalBlocks - filledBlocks !== 1 ? 's' : ''} pendente{totalBlocks - filledBlocks !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {autoSaveEnabled && lastSaved && (
              <Badge variant="outline" className="text-xs h-7 px-2.5 gap-1.5 rounded-lg border-green-200 bg-green-50 text-green-700">
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
                'text-xs h-7 px-2.5 rounded-lg',
                completionPercent === 100 && 'bg-gradient-to-r from-primary to-primary/80'
              )}
            >
              {filledBlocks}/{totalBlocks} blocos
            </Badge>
          </div>
        </div>
      </div>

      {/* Enhanced Progress bar */}
      <div className="w-full h-1.5 bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20" />
        <div
          className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary transition-all duration-500 ease-out relative"
          style={{ width: `${completionPercent}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Blocks */}
      <CardContent className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-3">
        {/* Block 1: Header (auto-filled) */}
        <EvolutionHeaderBlock
          therapistName={data.therapistName}
          therapistCrefito={data.therapistCrefito}
          sessionDate={data.sessionDate}
          sessionNumber={data.sessionNumber}
          totalSessions={data.totalSessions}
        />

        {/* Block 2 & 3: Pain Level (EVA) + Patient Report - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] gap-4">
          {/* Pain Level (EVA) */}
          <PainLevelBlock
            painLevel={data.painLevel}
            painLocation={data.painLocation}
            onPainLevelChange={(level) => handleFieldChange('painLevel', level)}
            onPainLocationChange={(location) => handleFieldChange('painLocation', location)}
            disabled={disabled}
          />

          {/* Patient Report */}
          <RichTextBlock
            icon={<MessageCircle className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-500/10 border border-sky-500/20"
            title="Relato do Paciente"
            placeholder="O que o paciente relatou? Como se sente desde a última sessão? Mudanças na dor, medicação, sono..."
            hint="Relato verbal do paciente sobre sua condição atual"
            value={data.patientReport}
            onValueChange={(val) => handleFieldChange('patientReport', val)}
            disabled={disabled}
            className="h-full"
            accentColor="sky"
          />
        </div>

        {/* Block 4: Main Evolution Text */}
        <RichTextBlock
          icon={<FileText className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-500/10 border border-violet-500/20"
          title="Texto de Evolução"
          placeholder="Descreva a evolução da sessão livremente... Ex: OBJETIVO, achados, conduta..."
          hint="Texto livre para descrever a evolução - use como preferir (pode incluir objetivo, achados, conduta)"
          value={data.evolutionText}
          onValueChange={(val) => handleFieldChange('evolutionText', val)}
          disabled={disabled}
          accentColor="violet"
        />

        {/* Removed Separator */}

        {/* Block 5: Procedures Checklist */}
        <ProcedureChecklistBlock
          procedures={data.procedures}
          onChange={(procs) => handleFieldChange('procedures', procs)}
          disabled={disabled}
        />

        {/* Block 6: Exercises */}
        <ExerciseBlockV2
          exercises={data.exercises}
          onChange={(exs) => handleFieldChange('exercises', exs)}
          disabled={disabled}
        />

        {/* Block 6.5: Measurements */}
        <MeasurementsBlock
          measurements={data.measurements || []}
          onChange={(meas) => handleFieldChange('measurements', meas)}
          disabled={disabled}
        />

        {/* Removed Separator */}

        {/* Block 7: Observations, Home Care, Attachments - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Observations */}
          <RichTextBlock
            icon={<StickyNote className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-500/10 border border-amber-500/20"
            title="Observações"
            placeholder="Orientações gerais, encaminhamentos, cuidados..."
            hint="Informações adicionais e orientações"
            value={data.observations}
            onValueChange={(val) => handleFieldChange('observations', val)}
            disabled={disabled}
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
          <div className="flex justify-end pt-3">
            <Button
              onClick={onSave}
              disabled={disabled || isSaving}
              className="gap-2 rounded-xl shadow-sm hover:shadow-md transition-all"
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
