/**
 * LiveTextEvolution
 *
 * Refatorado para o layout Premium:
 * [ Área de Texto Livre (Evolução Clínica) ] [ Sidebar de Cards Coloridos ]
 *
 * Cores e Grid:
 * - Esquerda: Evolução Clínica (Card Grande)
 * - Direita: Sidebar (Grid 2-col):
 *   - EVA (Vermelho) | Observações (Amarelo)
 *   - Histórico (Azul) - Full Sidebar
 *   - Procedimentos/Exercícios (Verde) | Medições (Rosa)
 *   - Exercícios Casa (Cinza) | Anexos (Preto)
 *
 * @version 2.0.0 - Premium Grid
 */

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Library, Activity, Dumbbell, History, Scale, Home, Paperclip, MessageSquare } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * Componente de Card Reutilizável com Estilo Premium
 */
const PremiumCard = ({
  children,
  title,
  icon: Icon,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  title: string;
  icon: any;
  variant?: "red" | "amber" | "blue" | "emerald" | "pink" | "slate" | "black" | "default";
  className?: string;
}) => {
  const variants = {
    red: "border-red-200 bg-red-50/40 text-red-700",
    amber: "border-amber-200 bg-amber-50/40 text-amber-800",
    blue: "border-blue-200 bg-blue-50/40 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50/40 text-emerald-700",
    pink: "border-pink-200 bg-pink-50/40 text-pink-700",
    slate: "border-slate-300 bg-slate-50/60 text-slate-700",
    black: "border-zinc-800 bg-zinc-900 text-zinc-100",
    default: "border-slate-200 bg-white text-slate-900",
  };

  const headerColors = {
    red: "text-red-700",
    amber: "text-amber-800",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    pink: "text-pink-700",
    slate: "text-slate-700",
    black: "text-zinc-400",
    default: "text-slate-600",
  };

  const dotColors = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    pink: "bg-pink-500",
    slate: "bg-slate-500",
    black: "bg-zinc-100",
    default: "bg-slate-400",
  };

  return (
    <section
      className={cn(
        "rounded-[2.5rem] border-2 p-5 transition-all duration-300 shadow-sm hover:shadow-md",
        variants[variant],
        className
      )}
    >
      <header className={cn("flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider", headerColors[variant])}>
        <span className={cn("inline-block w-2.5 h-2.5 rounded-full", dotColors[variant])} />
        <Icon className="w-4 h-4 opacity-70" />
        {title}
      </header>
      <div className="relative">
        {children}
      </div>
    </section>
  );
};

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
        const preview = stripHtml(ev.observacao || ev.subjective || ev.assessment || "").slice(
          0,
          100,
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
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* 🟢 Evolução Clínica (Main) */}
      <section className="rounded-[3rem] border-2 border-slate-200 bg-white p-8 shadow-sm flex flex-col transition-all hover:shadow-md">
        <header className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Evolução Clínica</h2>
            <p className="text-sm text-slate-500">Relatório detalhado da sessão</p>
          </div>
        </header>
        
        <div className="w-full">
          <RichTextBlock
            placeholder="Comece a digitar a evolução clínica do paciente aqui..."
            value={data.observacao}
            onValueChange={(html) => onChange({ ...data, observacao: html })}
            disabled={disabled}
            className="min-h-[300px]"
          />
        </div>
      </section>

      {/* 🔴 Grid de Cards (Sem Sidebar) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1: EVA + OBS (Lado a Lado no Desktop) */}
        <PremiumCard title="Dor (EVA)" icon={Activity} variant="red">
          <QuickPainSlider
            value={data.painScale ?? undefined}
            onChange={(level) => onChange({ ...data, painScale: level })}
            disabled={disabled}
          />
        </PremiumCard>

        <PremiumCard title="Observações" icon={MessageSquare} variant="amber">
          <textarea
            className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none min-h-[80px]"
            placeholder="Notas rápidas..."
            value={data.subjective || ""}
            onChange={(e) => onChange({ ...data, subjective: e.target.value })}
            disabled={disabled}
          />
        </PremiumCard>

        {/* Row 2: Histórico (Largura Total) */}
        <PremiumCard title="Histórico de Evoluções" icon={History} variant="blue" className="md:col-span-2">
          {previousItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Sem registros anteriores.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {previousItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/40 border border-blue-100 flex flex-col gap-1 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-900">{item.dateLabel}</span>
                    {item.pain != null && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                        EVA {item.pain}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 line-clamp-2">{item.preview}</p>
                </div>
              ))}
            </div>
          )}
        </PremiumCard>

        {/* Row 3: Intervenções (Largura Total) */}
        <PremiumCard title="Intervenções" icon={Dumbbell} variant="emerald" className="md:col-span-2">
          <Tabs value={groupTab} onValueChange={(v) => setGroupTab(v as any)} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-emerald-100/50 p-1 rounded-xl">
                <TabsTrigger value="procedures" className="text-[10px] uppercase font-bold rounded-lg px-2 py-1">Procs</TabsTrigger>
                <TabsTrigger value="exercises" className="text-[10px] uppercase font-bold rounded-lg px-2 py-1">Exer</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] uppercase font-bold text-emerald-700 hover:bg-emerald-100"
                onClick={() => setLibraryOpen(true)}
                disabled={disabled}
              >
                <Library className="w-3 h-3 mr-1" /> Biblioteca
              </Button>
            </div>

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
        </PremiumCard>

        {/* Row 4: Medições (Largura Total) */}
        <PremiumCard title="Medições" icon={Scale} variant="pink" className="md:col-span-2">
          <MeasurementsBlock
            measurements={data.measurements as any}
            onChange={handleMeasurementsChange}
            disabled={disabled}
          />
        </PremiumCard>

        {/* Row 5: Home Care + Anexos (Lado a Lado no Desktop) */}
        <PremiumCard title="Casa" icon={Home} variant="slate">
          <HomeCareBlock
            value={homeExercisesText}
            onChange={(v) => onHomeExercisesTextChange?.(v)}
            disabled={disabled}
          />
        </PremiumCard>

        <PremiumCard title="Anexos" icon={Paperclip} variant="black">
          <AttachmentsBlock
            patientId={patientId}
            evolutionId={evolutionId}
            value={attachments}
            onChange={(urls) => onAttachmentsChange?.(urls)}
            disabled={disabled}
          />
        </PremiumCard>
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
