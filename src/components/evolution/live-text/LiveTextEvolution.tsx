/**
 * LiveTextEvolution
 *
 * Editor único de evolução (texto livre). Layout em grid colorido:
 *
 * ┌─────────────┬─────────────────────────────────────────┐
 * │  EVA        │  OBSERVAÇÕES (texto livre)              │
 * ├─────────────┴─────────────────────────────────────────┤
 * │  HISTÓRICO DE EVOLUÇÕES                               │
 * ├───────────────────────────┬───────────────────────────┤
 * │  PROCEDIMENTOS + EXERCÍCIOS │  MEDIÇÕES               │
 * ├───────────────────────────┼───────────────────────────┤
 * │  EXERCÍCIOS PARA CASA     │  ANEXOS                   │
 * └───────────────────────────┴───────────────────────────┘
 */

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Library, Activity, Dumbbell, ListOrdered } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { QuickPainSlider } from "@/components/evolution/v3-notion/QuickPainSlider";
import { MagicTextarea } from "@/components/ai/MagicTextarea";
import { ProcedureChecklistBlock } from "@/components/evolution/v2-improved/ProcedureChecklistBlock";
import { ExerciseBlockV2 } from "@/components/evolution/v2-improved/ExerciseBlockV2";
import { MeasurementsBlock } from "@/components/evolution/v2-improved/MeasurementsBlock";
import { HomeCareBlock } from "@/components/evolution/v2-improved/HomeCareBlock";
import { AttachmentsBlock } from "@/components/evolution/v2-improved/AttachmentsBlock";
import { ExerciseLibraryModal } from "@/components/exercises/ExerciseLibraryModal";
import { stripHtml } from "@/lib/utils/stripHtml";
import { normalizeInterventionSequence, SessionSequenceBlock } from "./SessionSequenceBlock";

import type { EvolutionData } from "@/hooks/evolution/usePatientEvolutionState";

export interface LiveTextEvolutionProps {
  data: EvolutionData;
  onChange: (next: EvolutionData) => void;
  patientId?: string;
  evolutionId?: string;
  /** Sessões anteriores para o card "Histórico de evoluções" (azul). */
  previousEvolutions?: Array<{
    id: string;
    created_at?: string;
    record_date?: string;
    observacao?: string;
    pain_scale?: number | null;
    subjective?: string;
    assessment?: string;
  }>;
  onSelectPreviousEvolution?: (id: string) => void;
  /** Texto adicional de "exercícios para casa" salvo como string HTML simples
   *  (compatibilidade com HomeCareBlock; sincronizado com `data.homeExercises`). */
  homeExercisesText?: string;
  onHomeExercisesTextChange?: (text: string) => void;
  /** Anexos persistidos como lista de URLs (HomeCareBlock-like). */
  attachments?: string[];
  onAttachmentsChange?: (urls: string[]) => void;
  disabled?: boolean;
}

export function LiveTextEvolution({
  data,
  onChange,
  patientId,
  evolutionId,
  previousEvolutions = [],
  homeExercisesText = "",
  onHomeExercisesTextChange,
  attachments = [],
  onAttachmentsChange,
  disabled = false,
}: LiveTextEvolutionProps) {
  const [groupTab, setGroupTab] = useState<"sequence" | "procedures" | "exercises">("sequence");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const previousItems = useMemo(
    () =>
      previousEvolutions.slice(0, 8).map((ev) => {
        const dateStr = ev.created_at || ev.record_date;
        const dateLabel = dateStr ? format(new Date(dateStr), "dd/MM/yy", { locale: ptBR }) : "—";
        const preview = stripHtml(ev.observacao || ev.subjective || ev.assessment || "").slice(
          0,
          120,
        );
        return {
          id: ev.id,
          dateLabel,
          pain: ev.pain_scale ?? null,
          preview: preview || "Sem registro",
        };
      }),
    [previousEvolutions],
  );

  const handleProceduresChange = (procedures: any[]) => {
    onChange({
      ...data,
      ...normalizeInterventionSequence(procedures, data.exercises),
    });
  };
  const handleExercisesChange = (exercises: any[]) => {
    onChange({
      ...data,
      ...normalizeInterventionSequence(data.procedures, exercises),
    });
  };
  const handleInterventionSequenceChange = (next: { procedures: any[]; exercises: any[] }) => {
    onChange({ ...data, procedures: next.procedures, exercises: next.exercises });
  };
  const handleMeasurementsChange = (measurements: any[]) => onChange({ ...data, measurements });

  const handleSelectFromLibrary = (exercise: any) => {
    const newItem = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `lib_${Date.now()}`,
      exerciseId: exercise.id,
      name: exercise.name || exercise.title || "Exercício",
      prescription: exercise.prescription || "3x10",
      completed: false,
      image_url: exercise.image_url ?? exercise.imageUrl,
      thumbnail_url: exercise.thumbnail_url ?? exercise.thumbnailUrl,
      video_url: exercise.video_url ?? exercise.videoUrl,
    };
    if (groupTab !== "procedures") {
      onChange({
        ...data,
        ...normalizeInterventionSequence(data.procedures, [...data.exercises, newItem as any]),
      });
    } else {
      const newProc = {
        id: newItem.id,
        name: newItem.name,
        completed: false,
        category: "outro" as const,
      };
      onChange({
        ...data,
        ...normalizeInterventionSequence([...data.procedures, newProc as any], data.exercises),
      });
    }
    setLibraryOpen(false);
  };

  return (
    <div className="grid grid-cols-12 gap-3 auto-rows-max">
      {/* 🔴 EVA */}
      <section
        aria-label="Escala de dor"
        className="col-span-12 md:col-span-3 rounded-xl border-2 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Dor (EVA)
          {data.painScale != null ? (
            <span className="ml-auto text-xs font-bold text-red-600 dark:text-red-200 tabular-nums">
              {data.painScale}/10
            </span>
          ) : null}
        </header>
        <QuickPainSlider
          value={data.painScale ?? undefined}
          onChange={(level) => onChange({ ...data, painScale: level })}
          disabled={disabled}
        />
      </section>

      {/* 🟡 Observações */}
      <section
        aria-label="Observações"
        className="col-span-12 md:col-span-9 rounded-xl border-2 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-3 min-h-[180px]"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> Observações clínicas
        </header>
        <MagicTextarea
          placeholder="Descreva o que o paciente relatou e o que foi feito na sessão…"
          value={data.observacao || ""}
          onValueChange={(html) => onChange({ ...data, observacao: html })}
          disabled={disabled}
          className="min-h-[140px] w-full"
        />
      </section>

      {/* 🔵 Histórico de evoluções */}
      <section
        aria-label="Histórico de evoluções"
        className="col-span-12 rounded-xl border-2 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-3"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Histórico de evoluções
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {previousEvolutions.length} sessões
          </span>
        </header>
        {previousItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sem evoluções anteriores.
          </p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {previousItems.map((item) => (
              <li
                key={item.id}
                className="shrink-0 w-56 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 p-2 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{item.dateLabel}</span>
                  {item.pain != null && (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">
                      EVA {item.pain}/10
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground line-clamp-3">{item.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 🟢 Procedimentos + Exercícios (unificado) */}
      <section
        aria-label="Procedimentos e exercícios"
        className="col-span-12 md:col-span-7 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 p-3"
      >
        <Tabs value={groupTab} onValueChange={(v) => setGroupTab(v as typeof groupTab)}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <TabsList className="bg-emerald-100 dark:bg-emerald-900">
              <TabsTrigger value="sequence" className="gap-1">
                <ListOrdered className="w-3 h-3" /> Sequência (
                {data.procedures.length + data.exercises.length})
              </TabsTrigger>
              <TabsTrigger value="procedures" className="gap-1">
                <Activity className="w-3 h-3" /> Procedimentos ({data.procedures.length})
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-1">
                <Dumbbell className="w-3 h-3" /> Exercícios ({data.exercises.length})
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setLibraryOpen(true)}
              disabled={disabled}
            >
              <Library className="w-4 h-4 mr-1" /> Biblioteca
            </Button>
          </div>
          <TabsContent value="sequence" className="mt-0">
            <SessionSequenceBlock
              procedures={data.procedures}
              exercises={data.exercises}
              onChange={handleInterventionSequenceChange}
              disabled={disabled}
            />
          </TabsContent>
          <TabsContent value="procedures" className="mt-0">
            <ProcedureChecklistBlock
              procedures={data.procedures as any}
              onChange={handleProceduresChange}
              disabled={disabled}
            />
          </TabsContent>
          <TabsContent value="exercises" className="mt-0">
            <ExerciseBlockV2
              exercises={data.exercises as any}
              onChange={handleExercisesChange}
              disabled={disabled}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* 🟣 Medições */}
      <section
        aria-label="Medições"
        className="col-span-12 md:col-span-5 rounded-xl border-2 border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950 p-3"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-pink-700 dark:text-pink-300">
          <span className="inline-block w-2 h-2 rounded-full bg-pink-500" /> Medições
        </header>
        <MeasurementsBlock
          measurements={data.measurements as any}
          onChange={handleMeasurementsChange}
          disabled={disabled}
        />
      </section>

      {/* ⚪ Exercícios para casa */}
      <section
        aria-label="Exercícios para casa"
        className="col-span-12 md:col-span-7 rounded-xl border-2 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 p-3"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-500" /> Exercícios para casa
        </header>
        <HomeCareBlock
          value={homeExercisesText}
          onChange={(v) => onHomeExercisesTextChange?.(v)}
          disabled={disabled}
        />
      </section>

      {/* ⚫ Anexos */}
      <section
        aria-label="Anexos"
        className="col-span-12 md:col-span-5 rounded-xl border-2 border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 p-3"
      >
        <header className="flex items-center gap-2 mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <span className="inline-block w-2 h-2 rounded-full bg-zinc-900" /> Anexos
        </header>
        <AttachmentsBlock
          patientId={patientId}
          evolutionId={evolutionId}
          value={attachments}
          onChange={(urls) => onAttachmentsChange?.(urls)}
          disabled={disabled}
        />
      </section>

      <ExerciseLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelectExercise={handleSelectFromLibrary}
        addedExerciseIds={data.exercises.map((e) => e.exerciseId).filter(Boolean) as string[]}
      />
    </div>
  );
}
