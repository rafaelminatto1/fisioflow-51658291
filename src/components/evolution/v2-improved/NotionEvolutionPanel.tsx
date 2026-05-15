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

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-5">
              {/* Left Column: EVA */}
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 transition-all hover:bg-red-500/10 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-red-500/20">
                      <Activity className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">Nível de Dor</h3>
                  </div>
                  <div className="flex-1 -mx-3 -mb-3">
                    <PainLevelBlock
                      painLevel={data.painLevel}
                      painLocation={data.painLocation}
                      onPainLevelChange={(level) => handleFieldChange("painLevel", level)}
                      onPainLocationChange={(location) => handleFieldChange("painLocation", location)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Free Text Evolution */}
              <div className="flex flex-col min-w-0">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden flex flex-col transition-all hover:bg-amber-500/10" style={{ minHeight: 180 }}>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20">
                      <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Observações Clínicas</h3>
                  </div>
                  <RichTextBlock
                    title=""
                    placeholder="Orientações gerais, encaminhamentos, cuidados e notas da sessão..."
                    value={data.evolutionText || data.observations}
                    onValueChange={(val) => {
                      handleFieldChange("evolutionText", val);
                      handleFieldChange("observations", val);
                    }}
                    disabled={disabled}
                    className="flex-1 border-none shadow-none bg-transparent"
                    accentColor="amber"
                  />
                </div>
              </div>
            </div>

            {/* Card Verde: Procedimentos e Exercícios */}
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4 transition-all hover:bg-emerald-500/10 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20">
                    <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">
                    Procedimentos & Exercícios
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl border border-emerald-500/20 text-emerald-700 text-xs hover:bg-emerald-500/10"
                    onClick={() => setProcedureLibraryOpen(true)}
                    disabled={disabled}
                  >
                    <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                    Procedimentos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl border border-blue-500/20 text-blue-700 text-xs hover:bg-blue-500/10"
                    onClick={() => setExerciseLibraryOpen(true)}
                    disabled={disabled}
                  >
                    <Dumbbell className="h-3.5 w-3.5 mr-1.5" />
                    Exercícios
                  </Button>
                </div>
              </div>
              <div className="-mx-4 -mb-4 px-4 pb-4 bg-background/30 rounded-b-2xl">
                <EvolutionBlockV3
                  items={unifiedItems}
                  onChange={handleUnifiedItemsChange}
                  type="unified"
                  title="Sequência da sessão"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Card Rosa: Medições */}
            <div className="rounded-2xl bg-pink-500/5 border border-pink-500/10 p-4 transition-all hover:bg-pink-500/10 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-pink-500/20">
                  <Ruler className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="font-semibold text-pink-900 dark:text-pink-300 text-sm">Medições</h3>
              </div>
              <div className="-mx-4 -mb-4 px-4 pb-4">
                <MeasurementsBlock
                  measurements={data.measurements || []}
                  onChange={(meas) => handleFieldChange("measurements", meas)}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Card Cinza: Home Care */}
            <div className="rounded-2xl bg-zinc-500/5 border border-zinc-500/10 p-4 transition-all hover:bg-zinc-500/10 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-500/20">
                    <Home className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-300 text-sm">Exercícios para Casa</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl border border-zinc-500/20 text-zinc-700 text-xs hover:bg-zinc-500/10"
                  onClick={() => setExerciseLibraryOpen(true)}
                  disabled={disabled}
                >
                  <Library className="h-3.5 w-3.5 mr-1.5" />
                  Biblioteca
                </Button>
              </div>
              <div className="-mx-4 -mb-4 px-4 pb-4">
                <HomeCareBlock
                  value={data.homeCareExercises || ""}
                  onChange={(val) => handleFieldChange("homeCareExercises", val)}
                  disabled={disabled}
                  className="border-none shadow-none bg-background/50 rounded-xl"
                />
              </div>
            </div>

            {/* Card Preto: Anexos */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 transition-all hover:bg-zinc-800/90 text-zinc-100 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-zinc-800">
                  <Paperclip className="h-4 w-4 text-zinc-300" />
                </div>
                <h3 className="font-semibold text-zinc-100 text-sm">Anexos</h3>
              </div>
              <div className="-mx-4 -mb-4 px-4 pb-4">
                <AttachmentsBlock
                  patientId={patientId}
                  evolutionId={evolutionId}
                  value={data.attachments || []}
                  onChange={(val) => handleFieldChange("attachments", val)}
                  disabled={disabled}
                  className="border-none shadow-none bg-zinc-950/50 rounded-xl"
                />
              </div>
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
