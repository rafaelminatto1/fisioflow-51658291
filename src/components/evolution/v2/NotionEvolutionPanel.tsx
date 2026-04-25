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
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  FileText,
  MessageCircle,
  StickyNote,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  History,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MagicTextarea } from "@/components/ai/MagicTextarea";
import { cn } from "@/lib/utils";
import { ProcedureChecklistBlock } from "./ProcedureChecklistBlock";
import { ExerciseBlockV2 } from "./ExerciseBlockV2";
import { PainLevelBlock } from "./PainLevelBlock";
import { HomeCareBlock } from "./HomeCareBlock";
import { AttachmentsBlock } from "./AttachmentsBlock";
import { MeasurementsBlock } from "./MeasurementsBlock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvolutionV2Data } from "./types";

interface NotionEvolutionPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
  className?: string;
  previousEvolutions?: any[];
}

// Evolution History Item Component
const HistoryItem: React.FC<{
  evolution: any;
  index: number;
  total: number;
}> = ({ evolution, index, total }) => {
  const date = new Date(evolution.record_date || evolution.created_at || evolution.date);
  const sessionNum = total - index;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold bg-background">
            Sessão #{sessionNum}
          </Badge>
          <span className="text-[11px] font-medium text-muted-foreground">
            {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
        {evolution.pain_level !== undefined && (
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-bold bg-primary/10 text-primary border-primary/20"
          >
            EVA {evolution.pain_level}
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
        {evolution.evolution_text ||
          evolution.objective ||
          evolution.subjective ||
          "Sem texto de evolução."}
      </p>

      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider gap-1 hover:text-primary hover:bg-primary/5"
            >
              Detalhes <ExternalLink className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[400px] p-0 overflow-hidden shadow-2xl border-primary/20"
            align="end"
          >
            <div className="p-4 bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-primary">Sessão #{sessionNum}</h4>
                <Badge variant="outline" className="text-[10px]">
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
              </div>
              {evolution.pain_level !== undefined && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Nível de Dor (EVA):</span>
                  <span className="text-sm font-bold">{evolution.pain_level}/10</span>
                </div>
              )}
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-4 text-sm custom-scrollbar">
              {evolution.subjective && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                    Subjetivo
                  </p>
                  <p className="text-muted-foreground leading-relaxed">{evolution.subjective}</p>
                </div>
              )}
              {evolution.objective && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">
                    Objetivo / Evolução
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {evolution.evolution_text || evolution.objective}
                  </p>
                </div>
              )}
              {evolution.assessment && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">
                    Avaliação
                  </p>
                  <p className="text-muted-foreground leading-relaxed">{evolution.assessment}</p>
                </div>
              )}
              {evolution.plan && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">
                    Plano / Conduta
                  </p>
                  <p className="text-muted-foreground leading-relaxed">{evolution.plan}</p>
                </div>
              )}
              {!evolution.subjective &&
                !evolution.objective &&
                !evolution.assessment &&
                !evolution.plan && (
                  <p className="text-center py-4 text-muted-foreground italic">
                    Nenhum detalhe textual registrado.
                  </p>
                )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

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
  title,
  placeholder,
  hint,
  value,
  onValueChange,
  disabled,
  rows = 4,
  className,
  accentColor = "primary",
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentValue = useRef(value);

  // Sync external value changes
  useEffect(() => {
    if (value !== localValue && value !== lastSentValue.current && !debounceTimer.current) {
      setLocalValue(value || "");
      lastSentValue.current = value || "";
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
    [onValueChange],
  );

  const hasContent = localValue.trim().length > 0;

  const accentColors: Record<string, { from: string; to: string; border: string }> = {
    primary: {
      from: "from-primary/60",
      to: "to-primary",
      border: "border-primary",
    },
    sky: {
      from: "from-sky-500/60",
      to: "to-sky-500",
      border: "border-sky-500",
    },
    violet: {
      from: "from-violet-500/60",
      to: "to-violet-500",
      border: "border-violet-500",
    },
    amber: {
      from: "from-amber-500/60",
      to: "to-amber-500",
      border: "border-amber-500",
    },
  };

  const colors = accentColors[accentColor] || accentColors.primary;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 relative",
        "shadow-sm hover:shadow-md hover:border-border/70",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isFocused && `ring-2 ring-${accentColor}/10 shadow-md`,
        className,
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r transition-all duration-500 z-10",
          isFocused ? `opacity-100 ${colors.from} ${colors.to}` : "opacity-0",
        )}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 p-3.5 border-b border-border/40 bg-gradient-to-r from-muted/30 to-muted/10 transition-colors duration-300">
        <div
          className={cn(
            "p-1.5 rounded-lg transition-all duration-300 ease-out",
            iconBg,
            isFocused ? "scale-110 shadow-md" : "hover:scale-105",
          )}
        >
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
        <div
          className={cn(
            "rounded-lg border border-transparent transition-all duration-200",
            isFocused && "border-border/50 bg-muted/30",
          )}
        >
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
  previousEvolutions = [],
}) => {
  const [historyLimit, setHistoryLimit] = useState(3);

  // Calculate completion
  const filledBlocks = [
    data.patientReport?.trim(),
    data.evolutionText?.trim(),
    data.procedures?.length > 0,
    data.exercises?.length > 0,
    data.painLevel !== undefined,
    data.measurements && data.measurements.length > 0,
    data.observations?.trim() ||
      data.homeCareExercises ||
      (data.attachments && data.attachments.length > 0),
  ].filter(Boolean).length;
  const totalBlocks = 7;
  const completionPercent = Math.round((filledBlocks / totalBlocks) * 100);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  return (
    <Card
      className={cn(
        "h-full flex flex-col border-border/50 shadow-lg overflow-hidden",
        "animate-in fade-in-0 duration-300",
        className,
      )}
    >
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
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal h-5 px-1.5 rounded-full border-primary/30 text-primary bg-primary/10 animate-in fade-in-0 zoom-in-95 duration-300"
                >
                  V2 - Texto Livre
                </Badge>
              </div>
              {completionPercent < 100 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-3 w-3" />
                  {totalBlocks - filledBlocks} bloco
                  {totalBlocks - filledBlocks !== 1 ? "s" : ""} pendente
                  {totalBlocks - filledBlocks !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {autoSaveEnabled && lastSaved && (
              <Badge
                variant="outline"
                className="text-xs h-7 px-2.5 gap-1.5 rounded-lg border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 shadow-sm transition-all duration-300 hover:shadow"
              >
                <CheckCircle2 className="h-3 w-3" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] opacity-70">Salvo às</span>
                  <span className="text-[10px] font-medium">
                    {lastSaved.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </Badge>
            )}
            <Badge
              variant={completionPercent === 100 ? "default" : "secondary"}
              className={cn(
                "text-xs h-7 px-2.5 rounded-lg transition-all duration-300",
                completionPercent === 100 &&
                  "bg-gradient-to-r from-primary to-primary/80 shadow-md animate-pulse",
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
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Block 1: EVA + Main Evolution Text - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] gap-5 items-stretch animate-in fade-in-0 slide-in-from-top-3 duration-300 delay-100">
          {/* Pain Level (EVA) */}
          <PainLevelBlock
            painLevel={data.painLevel}
            painLocation={data.painLocation}
            onPainLevelChange={(level) => handleFieldChange("painLevel", level)}
            onPainLocationChange={(location) => handleFieldChange("painLocation", location)}
            disabled={disabled}
          />

          {/* Main Evolution Text - Moved here to fill space instead of therapist info */}
          <TextBlock
            icon={<FileText className="h-4 w-4 text-violet-600" />}
            iconBg="bg-violet-500/10 border border-violet-500/20"
            title="Texto de Evolução"
            placeholder={`Descreva a evolução da sessão livremente...\n\nExemplo: Paciente apresentou melhora da ADM em flexão...`}
            hint="Texto principal da evolução clínica atual"
            value={data.evolutionText}
            onValueChange={(val) => handleFieldChange("evolutionText", val)}
            disabled={disabled}
            rows={8}
            accentColor="violet"
            className="h-full"
          />
        </div>

        {/* Block 2: Evolution History */}
        <Card className="border-border/40 bg-muted/5 overflow-hidden animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-150">
          <CardHeader className="py-3.5 px-4 border-b border-border/40 flex flex-row items-center justify-between bg-gradient-to-r from-muted/50 to-transparent">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/80">
              <History className="h-4 w-4 text-primary" />
              Histórico Recente de Evoluções
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-background">
              {previousEvolutions.length} sessões anteriores
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            {previousEvolutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <FileText className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-xs italic">
                  Nenhuma evolução anterior encontrada para este paciente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {previousEvolutions.slice(0, historyLimit).map((ev, idx) => (
                    <HistoryItem
                      key={ev.id || idx}
                      evolution={ev}
                      index={idx}
                      total={previousEvolutions.length}
                    />
                  ))}
                </div>

                {historyLimit < previousEvolutions.length && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHistoryLimit((prev) => Math.min(prev + 3, previousEvolutions.length))
                      }
                      className="h-8 px-4 text-[11px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
                    >
                      Carregar mais evoluções
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 3: Patient Report */}
        <div className="animate-in fade-in-0 slide-in-from-top-4 duration-300 delay-200">
          <TextBlock
            icon={<MessageCircle className="h-4 w-4 text-sky-600" />}
            iconBg="bg-sky-500/10 border border-sky-500/20"
            title="Relato do Paciente"
            placeholder="O que o paciente relatou? Como se sente desde a última sessão? Mudanças na dor, medicação, sono..."
            hint="Relato verbal do paciente sobre sua condição atual"
            value={data.patientReport}
            onValueChange={(val) => handleFieldChange("patientReport", val)}
            disabled={disabled}
            rows={4}
            accentColor="sky"
          />
        </div>

        <Separator className="my-1 opacity-50" />

        {/* Block 5, 6 & 6.5: Procedures | Exercises | Measurements - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in-0 slide-in-from-top-5 duration-300 delay-200">
          <ProcedureChecklistBlock
            procedures={data.procedures}
            onChange={(procs) => handleFieldChange("procedures", procs)}
            disabled={disabled}
          />

          <ExerciseBlockV2
            exercises={data.exercises}
            onChange={(exs) => handleFieldChange("exercises", exs)}
            disabled={disabled}
          />

          <MeasurementsBlock
            measurements={data.measurements || []}
            onChange={(meas) => handleFieldChange("measurements", meas)}
            disabled={disabled}
          />
        </div>

        <Separator className="my-1 opacity-50" />

        {/* Block 7: Observations, Home Care, Attachments - 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in-0 slide-in-from-top-8 duration-300 animate-delay-7 pb-4">
          {/* Observations */}
          <TextBlock
            icon={<StickyNote className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-500/10 border border-amber-500/20"
            title="Observações"
            placeholder="Orientações gerais, encaminhamentos, cuidados..."
            hint="Informações adicionais e orientações"
            value={data.observations}
            onValueChange={(val) => handleFieldChange("observations", val)}
            disabled={disabled}
            rows={4}
            className="h-full"
            accentColor="amber"
          />

          {/* Home Care Exercises */}
          <HomeCareBlock
            value={data.homeCareExercises || ""}
            onChange={(val) => handleFieldChange("homeCareExercises", val)}
            disabled={disabled}
            className="h-full"
          />

          {/* Attachments */}
          <AttachmentsBlock
            patientId={data.therapistName}
            value={data.attachments || []}
            onChange={(val) => handleFieldChange("attachments", val)}
            disabled={disabled}
            className="h-full"
          />
        </div>

        {/* Save button (when not using auto-save) */}
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
