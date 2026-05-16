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
import React, { useCallback, useState } from "react";
import {
  FileText,
  StickyNote,
  Loader2,
  CheckCircle2,
  History,
  Activity,
  Dumbbell,
  Ruler,
  Home,
  Paperclip,
  Library,
  Stethoscope,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RichTextBlock } from "./RichTextBlock";
import { EvolutionBlockV3 } from "../v3-unified/EvolutionBlockV3";
import { EvolutionItemV3 } from "../v3-unified/types";
import { PainLevelBlock } from "./PainLevelBlock";
import { HomeCareBlock } from "./HomeCareBlock";
import { AttachmentsBlock } from "./AttachmentsBlock";
import { MeasurementsBlock } from "./MeasurementsBlock";
import { EvolutionSectionCard } from "./EvolutionSectionCard";
import { SessionTimelineStrip } from "./SessionTimelineStrip";
import { ExerciseLibraryModal } from "@/components/exercises/ExerciseLibraryModal";
import { COMMON_PROCEDURES, PROCEDURE_CATEGORY_LABELS } from "./types";
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
  patientId?: string;
  evolutionId?: string;
  onNavigateToHistorico?: () => void;
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
  patientId,
  evolutionId,
  onNavigateToHistorico,
}) => {
  const [procedureLibraryOpen, setProcedureLibraryOpen] = useState(false);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);

  // Migration logic (run once if unifiedItems is empty but legacy items exist)
  React.useEffect(() => {
    if (!data.unifiedItems && (data.procedures?.length > 0 || data.exercises?.length > 0)) {
      const migratedItems: EvolutionItemV3[] = [];

      // Add procedures
      if (data.procedures?.length > 0) {
        data.procedures.forEach((p) => {
          migratedItems.push({
            id: p.id,
            name: p.name,
            completed: p.completed,
            type: "procedure",
            notes: p.notes,
            intensity: p.intensity,
            category: p.category,
          });
        });
      }

      // Add exercises
      if (data.exercises?.length > 0) {
        data.exercises.forEach((e) => {
          migratedItems.push({
            id: e.id,
            name: e.name,
            completed: e.completed,
            type: "exercise",
            prescription: e.prescription,
            patientFeedback: e.patientFeedback?.notes || "",
            difficulty: e.difficulty,
          });
        });
      }

      if (migratedItems.length > 0) {
        onChange({ ...data, unifiedItems: migratedItems });
      }
    }
  }, []);

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const unifiedItems = data.unifiedItems || [];

  const normalizeUnifiedItems = (items: EvolutionItemV3[]) =>
    items.map((item, index) => ({ ...item, order: index }));

  const handleUnifiedItemsChange = (items: EvolutionItemV3[]) => {
    handleFieldChange("unifiedItems", normalizeUnifiedItems(items));
  };

  const appendUnifiedItem = (item: Omit<EvolutionItemV3, "id" | "completed" | "order">) => {
    handleUnifiedItemsChange([
      ...unifiedItems,
      {
        id: crypto.randomUUID(),
        completed: false,
        order: unifiedItems.length,
        ...item,
      },
    ]);
  };

  return (
    <>
      <Card
        className={cn(
          "h-full flex flex-col border-none shadow-none bg-background overflow-hidden",
          className,
        )}
      >
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 pb-12">

            {/* Linha 1: EVA + Observações Clínicas */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_2fr] gap-5">
              <EvolutionSectionCard
                accent="rose"
                icon={Activity}
                title="Nível de Dor"
                subtitle="Escala Visual Analógica (EVA)"
                flushContent
              >
                <PainLevelBlock
                  painLevel={data.painLevel}
                  painLocation={data.painLocation}
                  onPainLevelChange={(level) => handleFieldChange("painLevel", level)}
                  onPainLocationChange={(location) =>
                    handleFieldChange("painLocation", location)
                  }
                  disabled={disabled}
                />
              </EvolutionSectionCard>

              <EvolutionSectionCard
                accent="amber"
                icon={StickyNote}
                title="Observações Clínicas"
                subtitle="Notas livres da sessão"
                flushContent
              >
                <RichTextBlock
                  placeholder="Orientações gerais, encaminhamentos, cuidados e notas da sessão..."
                  value={data.evolutionText || data.observations}
                  onValueChange={(val) => {
                    handleFieldChange("evolutionText", val);
                    handleFieldChange("observations", val);
                  }}
                  disabled={disabled}
                  showToolbar
                  className="border-none shadow-none bg-transparent"
                />
              </EvolutionSectionCard>
            </div>

            {/* Linha 2: Procedimentos & Exercícios + Medições */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
              <EvolutionSectionCard
                accent="emerald"
                icon={Activity}
                title="Procedimentos & Exercícios"
                subtitle="Sequência da sessão"
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-emerald-200 text-emerald-700 text-xs hover:bg-emerald-50"
                      onClick={() => setProcedureLibraryOpen(true)}
                      disabled={disabled}
                    >
                      <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                      Procedimentos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-blue-200 text-blue-700 text-xs hover:bg-blue-50"
                      onClick={() => setExerciseLibraryOpen(true)}
                      disabled={disabled}
                    >
                      <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                      Exercícios
                    </Button>
                  </>
                }
              >
                <EvolutionBlockV3
                  items={unifiedItems}
                  onChange={handleUnifiedItemsChange}
                  type="unified"
                  title="Sequência da sessão"
                  disabled={disabled}
                />
              </EvolutionSectionCard>

              <EvolutionSectionCard
                accent="pink"
                icon={Ruler}
                title="Medições"
                subtitle="Sinais vitais e antropometria"
              >
                <MeasurementsBlock
                  measurements={data.measurements || []}
                  onChange={(meas) => handleFieldChange("measurements", meas)}
                  disabled={disabled}
                />
              </EvolutionSectionCard>
            </div>

            {/* Linha 3: Histórico de Sessões (timeline) */}
            <EvolutionSectionCard
              accent="blue"
              icon={History}
              title="Histórico de Sessões"
              subtitle="Últimas evoluções deste paciente"
            >
              <SessionTimelineStrip
                patientId={patientId}
                excludeId={evolutionId}
                onSeeAll={onNavigateToHistorico}
              />
            </EvolutionSectionCard>

            {/* Linha 4: Exercícios para Casa + Anexos */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
              <EvolutionSectionCard
                accent="slate"
                icon={Home}
                title="Exercícios para Casa"
                subtitle="HEP — Home Exercise Program"
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl border border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
                    onClick={() => setExerciseLibraryOpen(true)}
                    disabled={disabled}
                  >
                    <Library className="h-3.5 w-3.5 mr-1.5" />
                    Biblioteca
                  </Button>
                }
              >
                <HomeCareBlock
                  value={data.homeCareExercises || ""}
                  onChange={(val) => handleFieldChange("homeCareExercises", val)}
                  disabled={disabled}
                  className="border-none shadow-none bg-slate-50/60 rounded-xl"
                />
              </EvolutionSectionCard>

              <EvolutionSectionCard
                accent="zinc"
                icon={Paperclip}
                title="Anexos"
                subtitle="Fotos, exames e documentos"
              >
                <AttachmentsBlock
                  patientId={patientId}
                  evolutionId={evolutionId}
                  value={data.attachments || []}
                  onChange={(val) => handleFieldChange("attachments", val)}
                  disabled={disabled}
                  className="border-none shadow-none bg-zinc-50/60 rounded-xl"
                />
              </EvolutionSectionCard>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={procedureLibraryOpen} onOpenChange={setProcedureLibraryOpen}>
        <DialogContent className="w-[92vw] max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Biblioteca de procedimentos
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {COMMON_PROCEDURES.map((procedure) => (
              <button
                key={`${procedure.category}:${procedure.name}`}
                type="button"
                className="rounded-xl border border-border/60 bg-background p-3 text-left transition-colors hover:bg-emerald-500/10"
                onClick={() => {
                  appendUnifiedItem({
                    name: procedure.name,
                    type: "procedure",
                    category: procedure.category,
                  });
                }}
              >
                <span className="block text-sm font-semibold">{procedure.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {PROCEDURE_CATEGORY_LABELS[procedure.category]}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ExerciseLibraryModal
        open={exerciseLibraryOpen}
        onOpenChange={setExerciseLibraryOpen}
        addedExerciseIds={
          unifiedItems
            .filter((item) => item.type === "exercise")
            .map((item) => item.exerciseId)
            .filter(Boolean) as string[]
        }
        onSelectExercise={(exercise) => {
          appendUnifiedItem({
            name: exercise.name,
            type: "exercise",
            exerciseId: exercise.id,
            prescription: `${exercise.sets || 3}x${exercise.repetitions || 10}`,
          });
        }}
      />
    </>
  );
};
