/**
 * LiveTextEvolution — Layout Notion-style
 *
 * Layout limpo, profissional, sem glassmorphism ou backgrounds coloridos.
 * Divisores horizontais sutis separam as seções.
 *
 * Ordem das seções:
 *  1. Evolução Clínica (Texto Livre) — seção principal
 *  2. Nível de Dor (EVA)
 *  3. Observações Clínicas
 *  4. Histórico de Evoluções (condicional)
 *  5. Procedimentos / Exercícios
 *  6. Medições
 *  7. Exercícios para Casa
 *  8. Anexos
 *
 * @version 3.0.0 - Notion-style
 */

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";
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
import { stripHtml } from "@/lib/utils/stripHtml";

import type { EvolutionData } from "@/hooks/evolution/usePatientEvolutionState";

export interface LiveTextEvolutionProps {
  data: EvolutionData;
  onChange: (next: EvolutionData) => void;
  patientId?: string;
  evolutionId?: string;
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
  homeExercisesText?: string;
  onHomeExercisesTextChange?: (text: string) => void;
  attachments?: string[];
  onAttachmentsChange?: (urls: string[]) => void;
  disabled?: boolean;
}

/** Divisor sutil entre seções */
const Divider = () => <div className="h-px bg-[#ECEBEA] w-full" />;

/** Header de seção no estilo Notion */
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[15px] font-semibold text-[#37352f] hover:text-[#2383e2] transition-colors cursor-default select-none">
    {children}
  </h2>
);

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
      previousEvolutions.slice(0, 5).map((ev) => {
        const dateStr = ev.created_at || ev.record_date;
        const dateLabel = dateStr
          ? format(new Date(dateStr), "dd/MM/yy", { locale: ptBR })
          : "—";
        const preview = stripHtml(ev.observacao || ev.subjective || ev.assessment || "").slice(0, 120);
        return {
          id: ev.id,
          dateLabel,
          pain: ev.pain_scale ?? null,
          preview: preview || "Sem registro",
        };
      }),
    [previousEvolutions],
  );

  const handleProceduresChange = (procedures: any[]) => onChange({ ...data, procedures });
  const handleExercisesChange = (exercises: any[]) => onChange({ ...data, exercises });
  const handleMeasurementsChange = (measurements: any[]) => onChange({ ...data, measurements });

  const handleSelectFromLibrary = (exercise: any) => {
    const newItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lib_${Date.now()}`,
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
    <div className="flex flex-col w-full max-w-4xl mx-auto bg-white">
      {/* ── 1. Evolução Clínica (Texto Livre) ── */}
      <div className="py-6 px-1">
        <SectionHeader>Evolução Clínica</SectionHeader>
        <div className="mt-3">
          <RichTextBlock
            placeholder="Descreva a evolução clínica do paciente nesta sessão..."
            value={data.observacao}
            onValueChange={(html) => onChange({ ...data, observacao: html })}
            disabled={disabled}
            className="min-h-[200px]"
          />
        </div>
      </div>

      <Divider />

      {/* ── 2. Nível de Dor (EVA) ── */}
      <div className="py-6 px-1">
        <SectionHeader>Nível de Dor (EVA)</SectionHeader>
        <div className="mt-4">
          <QuickPainSlider
            value={data.painScale ?? undefined}
            onChange={(level) => onChange({ ...data, painScale: level })}
            disabled={disabled}
          />
        </div>
      </div>

      <Divider />

      {/* ── 3. Observações Clínicas ── */}
      <div className="py-6 px-1">
        <SectionHeader>Observações Clínicas</SectionHeader>
        <textarea
          className="mt-3 w-full bg-transparent border-none outline-none text-sm text-[#37352f] placeholder:text-[#9B9A97] resize-none min-h-[80px] leading-relaxed focus:ring-0"
          placeholder="Descreva o que o paciente relatou e o que foi feito na sessão..."
          value={data.subjective || ""}
          onChange={(e) => onChange({ ...data, subjective: e.target.value })}
          disabled={disabled}
        />
      </div>

      {/* ── 4. Histórico de Evoluções (condicional) ── */}
      {previousItems.length > 0 && (
        <>
          <Divider />
          <div className="py-6 px-1">
            <SectionHeader>Histórico de Evoluções</SectionHeader>
            <div className="mt-3 flex flex-col gap-2">
              {previousItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between py-2 border-b border-[#ECEBEA] last:border-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-[#37352f]">{item.dateLabel}</span>
                    <p className="text-xs text-[#9B9A97] line-clamp-2 max-w-md">{item.preview}</p>
                  </div>
                  {item.pain != null && (
                    <span className="ml-4 shrink-0 text-xs font-semibold text-[#37352f] bg-[#F1F0EF] px-2 py-0.5 rounded">
                      EVA {item.pain}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* ── 5. Procedimentos / Exercícios ── */}
      <div className="py-6 px-1">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader>Procedimentos e Exercícios</SectionHeader>
          <div className="flex items-center gap-2">
            <Tabs value={groupTab} onValueChange={(v) => setGroupTab(v as any)}>
              <TabsList className="h-7 bg-[#F1F0EF] rounded-md p-0.5">
                <TabsTrigger value="procedures" className="text-[11px] font-medium h-6 px-2 rounded data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Procedimentos
                </TabsTrigger>
                <TabsTrigger value="exercises" className="text-[11px] font-medium h-6 px-2 rounded data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Exercícios
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] font-medium text-[#9B9A97] hover:text-[#37352f] hover:bg-[#F1F0EF] px-2"
              onClick={() => setLibraryOpen(true)}
              disabled={disabled}
            >
              <Library className="w-3 h-3 mr-1" />
              Biblioteca
            </Button>
          </div>
        </div>

        <Tabs value={groupTab} onValueChange={(v) => setGroupTab(v as any)}>
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
      </div>

      <Divider />

      {/* ── 6. Medições ── */}
      <div className="py-6 px-1">
        <SectionHeader>Medições</SectionHeader>
        <div className="mt-3">
          <MeasurementsBlock
            measurements={data.measurements as any}
            onChange={handleMeasurementsChange}
            disabled={disabled}
          />
        </div>
      </div>

      <Divider />

      {/* ── 7. Exercícios para Casa ── */}
      <div className="py-6 px-1">
        <SectionHeader>Exercícios para Casa</SectionHeader>
        <div className="mt-3">
          <HomeCareBlock
            value={homeExercisesText}
            onChange={(v) => onHomeExercisesTextChange?.(v)}
            disabled={disabled}
          />
        </div>
      </div>

      <Divider />

      {/* ── 8. Anexos ── */}
      <div className="py-6 px-1">
        <SectionHeader>Anexos</SectionHeader>
        <div className="mt-3">
          <AttachmentsBlock
            patientId={patientId}
            evolutionId={evolutionId}
            value={attachments}
            onChange={(urls) => onAttachmentsChange?.(urls)}
            disabled={disabled}
          />
        </div>
      </div>

      <ExerciseLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelectExercise={handleSelectFromLibrary}
        addedExerciseIds={data.exercises.map((e) => e.exerciseId).filter(Boolean) as string[]}
      />
    </div>
  );
}
