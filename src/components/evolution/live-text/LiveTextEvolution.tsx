/**
 * LiveTextEvolution
 *
 * Editor de evolução clínica — layout Notion-style.
 * Fundo branco limpo, divisores sutis, sem bordas coloridas.
 */

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Library, Activity, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { QuickPainSlider } from "@/components/evolution/v3-notion/QuickPainSlider";
import { RichTextBlock } from "@/components/evolution/v2-improved/RichTextBlock";
import { ProcedureChecklistBlock } from "@/components/evolution/v2-improved/ProcedureChecklistBlock";
import { ExerciseBlockV2 } from "@/components/evolution/v2-improved/ExerciseBlockV2";
import { MeasurementsBlock } from "@/components/evolution/v2-improved/MeasurementsBlock";
import { HomeCareBlock } from "@/components/evolution/v2-improved/HomeCareBlock";
import { AttachmentsBlock } from "@/components/evolution/v2-improved/AttachmentsBlock";
import { ExerciseLibraryModal } from "@/components/exercises/ExerciseLibraryModal";

import type { EvolutionData } from "@/hooks/evolution/usePatientEvolutionState";

export interface LiveTextEvolutionProps {
  data: EvolutionData;
  onChange: (next: EvolutionData) => void;
  patientId?: string;
  evolutionId?: string;
  /** Sessões anteriores para o card "Histórico de evoluções". */
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
  /** Texto de exercícios para casa (HTML simples). */
  homeExercisesText?: string;
  onHomeExercisesTextChange?: (text: string) => void;
  /** Anexos como lista de URLs. */
  attachments?: string[];
  onAttachmentsChange?: (urls: string[]) => void;
  disabled?: boolean;
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

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
  const [groupTab, setGroupTab] = useState<"procedures" | "exercises">("procedures");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const previousItems = useMemo(
    () =>
      previousEvolutions.slice(0, 8).map((ev) => {
        const dateStr = ev.created_at || ev.record_date;
        const dateLabel = dateStr
          ? format(new Date(dateStr), "dd/MM/yy", { locale: ptBR })
          : "—";
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

  const handleProceduresChange = (procedures: any[]) =>
    onChange({ ...data, procedures });
  const handleExercisesChange = (exercises: any[]) =>
    onChange({ ...data, exercises });
  const handleMeasurementsChange = (measurements: any[]) =>
    onChange({ ...data, measurements });

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
    if (groupTab === "exercises") {
      onChange({ ...data, exercises: [...data.exercises, newItem as any] });
    } else {
      const newProc = {
        id: newItem.id,
        name: newItem.name,
        completed: false,
        category: "outro" as const,
      };
      onChange({ ...data, procedures: [...data.procedures, newProc as any] });
    }
    setLibraryOpen(false);
  };

  return (
    <div className="space-y-0">

      {/* ── Dor (EVA) ────────────────────────────────────────────── */}
      <section aria-label="Escala de dor" id="pain-section" className="scroll-mt-28">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Nível de Dor (EVA)
          </h2>
        </div>
        <QuickPainSlider
          value={data.painScale ?? undefined}
          onChange={(level) => onChange({ ...data, painScale: level })}
          disabled={disabled}
          showLabel
        />
      </section>

      <div className="h-px bg-[#ECEBEA] my-8" />

      {/* ── Observações / Texto livre ─────────────────────────────── */}
      <section aria-label="Observações" id="observacoes">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Observações Clínicas
          </h2>
          <span className="text-xs text-muted-foreground">
            {stripHtml(data.observacao || "").length} caracteres
          </span>
        </div>
        <div className="text-[#37352f]">
          <RichTextBlock
            placeholder="Descreva o que o paciente relatou e o que foi feito na sessão…"
            value={data.observacao}
            onValueChange={(html) => onChange({ ...data, observacao: html })}
            disabled={disabled}
            className="min-h-[200px]"
          />
        </div>
      </section>

      <div className="h-px bg-[#ECEBEA] my-8" />

      {/* ── Histórico de evoluções ────────────────────────────────── */}
      {previousItems.length > 0 && (
        <>
          <section aria-label="Histórico de evoluções" id="historico">
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
                Histórico de Evoluções
              </h2>
              <span className="text-xs text-muted-foreground">
                {previousEvolutions.length} sessões
              </span>
            </div>
            <ul className="flex gap-3 overflow-x-auto pb-2">
              {previousItems.map((item) => (
                <li
                  key={item.id}
                  className="shrink-0 w-56 rounded-lg bg-[#FBFBFA] border border-[#E9E9E8] p-3 text-xs cursor-pointer hover:border-[#2383e2]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#37352f]">{item.dateLabel}</span>
                    {item.pain != null && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium">
                        EVA {item.pain}/10
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{item.preview}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="h-px bg-[#ECEBEA] my-8" />
        </>
      )}

      {/* ── Procedimentos + Exercícios ────────────────────────────── */}
      <section aria-label="Procedimentos e exercícios" id="procedimentos">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Procedimentos & Exercícios
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibraryOpen(true)}
            disabled={disabled}
            className="gap-1 text-xs"
          >
            <Library className="w-3.5 h-3.5" /> Biblioteca
          </Button>
        </div>
        <Tabs
          value={groupTab}
          onValueChange={(v) => setGroupTab(v as typeof groupTab)}
        >
          <TabsList className="bg-[#F1F0EE] mb-3">
            <TabsTrigger value="procedures" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" /> Procedimentos ({data.procedures.length})
            </TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1.5 text-xs">
              <Dumbbell className="w-3.5 h-3.5" /> Exercícios ({data.exercises.length})
            </TabsTrigger>
          </TabsList>
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

      <div className="h-px bg-[#ECEBEA] my-8" />

      {/* ── Medições ─────────────────────────────────────────────── */}
      <section aria-label="Medições" id="medicoes">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Medições
          </h2>
        </div>
        <MeasurementsBlock
          measurements={data.measurements as any}
          onChange={handleMeasurementsChange}
          disabled={disabled}
        />
      </section>

      <div className="h-px bg-[#ECEBEA] my-8" />

      {/* ── Exercícios para casa ──────────────────────────────────── */}
      <section aria-label="Exercícios para casa" id="exercicios-casa">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Exercícios para Casa
          </h2>
        </div>
        <HomeCareBlock
          value={homeExercisesText}
          onChange={(v) => onHomeExercisesTextChange?.(v)}
          disabled={disabled}
        />
      </section>

      <div className="h-px bg-[#ECEBEA] my-8" />

      {/* ── Anexos ───────────────────────────────────────────────── */}
      <section aria-label="Anexos" id="anexos">
        <div className="flex items-baseline justify-between gap-2 mb-4">
          <h2 className="text-2xl font-semibold text-[#37352f] hover:text-[#2383e2] cursor-text transition-colors">
            Anexos
          </h2>
        </div>
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
