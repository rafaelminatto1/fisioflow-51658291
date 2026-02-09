/**
 * NotionEvolutionPanel - V2 Evolution editor
 *
 * Notion/Evernote-style block editor for clinical evolutions.
 * Replaces the SOAP 4-field format with:
 *   - Auto-filled header (date, therapist, session)
 *   - Patient report block
 *   - Free-text evolution block (main writing area)
 *   - Procedure/technique checklist
 *   - Exercise block with autocomplete + feedback
 *   - Observations block
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
  GripVertical,
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
import type { EvolutionV2Data, ProcedureItem, ExerciseV2Item } from './types';

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

// Text block wrapper with Notion-like styling
const TextBlock: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  placeholder: string;
  hint: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
}> = ({ icon, iconBg, title, placeholder, hint, value, onValueChange, disabled, rows = 4, className }) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentValue = useRef(value);

  // Sync external value changes
  useEffect(() => {
    if (value !== localValue && value !== lastSentValue.current && !debounceTimer.current) {
      setLocalValue(value || '');
      lastSentValue.current = value || '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card', className)}>
      <div className="flex items-center gap-2 p-3 border-b border-border/40">
        <div className={cn('p-1.5 rounded-md', iconBg)}>{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hasContent && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
      </div>
      <div className="p-3">
        <MagicTextarea
          value={localValue}
          onValueChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="min-h-[80px] border-0 shadow-none resize-y focus-visible:ring-0 bg-transparent px-0"
        />
        <p className="text-[11px] text-muted-foreground/60 mt-1">{hint}</p>
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
  ].filter(Boolean).length;
  const totalBlocks = 4;
  const completionPercent = Math.round((filledBlocks / totalBlocks) * 100);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-base">Evolução</span>
          <Badge variant="outline" className="text-[10px] font-normal ml-1">
            V2 - Texto Livre
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {autoSaveEnabled && lastSaved && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
              Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
          <Badge
            variant={completionPercent === 100 ? 'default' : 'secondary'}
            className="text-xs"
          >
            {filledBlocks}/{totalBlocks} blocos
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Blocks */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Block 1: Header (auto-filled) */}
        <EvolutionHeaderBlock
          therapistName={data.therapistName}
          therapistCrefito={data.therapistCrefito}
          sessionDate={data.sessionDate}
          sessionNumber={data.sessionNumber}
          totalSessions={data.totalSessions}
        />

        {/* Block 2: Patient Report */}
        <TextBlock
          icon={<MessageCircle className="h-4 w-4 text-sky-600" />}
          iconBg="bg-sky-500/10"
          title="Relato do Paciente"
          placeholder="O que o paciente relatou? Como se sente desde a última sessão? Mudanças na dor, medicação, sono..."
          hint="Relato verbal do paciente sobre sua condição atual"
          value={data.patientReport}
          onValueChange={(val) => handleFieldChange('patientReport', val)}
          disabled={disabled}
          rows={3}
        />

        {/* Block 3: Main Evolution Text */}
        <TextBlock
          icon={<FileText className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-500/10"
          title="Texto de Evolução"
          placeholder={`Descreva a evolução da sessão livremente...\n\nExemplo:\nOBJETIVO:\nReeducação da coordenação muscular entre musculatura escapular e GU\nEstabilização dinâmica da GU durante abdução e flexão de ombro.\n\nPaciente apresentou melhora da ADM em flexão...`}
          hint="Texto livre para descrever a evolução - use como preferir (pode incluir objetivo, achados, conduta)"
          value={data.evolutionText}
          onValueChange={(val) => handleFieldChange('evolutionText', val)}
          disabled={disabled}
          rows={8}
        />

        <Separator className="my-2" />

        {/* Block 4: Procedures Checklist */}
        <ProcedureChecklistBlock
          procedures={data.procedures}
          onChange={(procs) => handleFieldChange('procedures', procs)}
          disabled={disabled}
        />

        {/* Block 5: Exercises */}
        <ExerciseBlockV2
          exercises={data.exercises}
          onChange={(exs) => handleFieldChange('exercises', exs)}
          disabled={disabled}
        />

        <Separator className="my-2" />

        {/* Block 6: Observations */}
        <TextBlock
          icon={<StickyNote className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-500/10"
          title="Observações & Orientações"
          placeholder="Orientações ao paciente, exercícios para casa, encaminhamentos, cuidados..."
          hint="Informações adicionais, home care e orientações gerais"
          value={data.observations}
          onValueChange={(val) => handleFieldChange('observations', val)}
          disabled={disabled}
          rows={3}
        />

        {/* Save button (when not using auto-save) */}
        {onSave && (
          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={disabled || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
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
