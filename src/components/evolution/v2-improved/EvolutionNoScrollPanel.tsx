import React, { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Activity,
  Anchor,
  ArrowRight,
  FileText,
  Flame,
  GitCompare,
  HeartPulse,
  History,
  Maximize2,
  MapPin,
  Plus,
  Ruler,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
  Zap,
  Undo2,
  Redo2,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { EvolutionV2Data } from "@/components/evolution/v2-improved/types";
import { RichTextBlock } from "@/components/evolution/v2-improved/RichTextBlock";
import { EvolutionBlockV3 } from "@/components/evolution/v3-unified/EvolutionBlockV3";
import { SessionTimelineStrip } from "@/components/evolution/v2-improved/SessionTimelineStrip";
import { PainGauge, painColor, painLabel } from "@/components/evolution/v2-improved/PainGauge";
import {
  PainTrendSparkline,
  type PainTrendPoint,
} from "@/components/evolution/v2-improved/PainTrendSparkline";
import { EvolutionInsightCard } from "@/components/evolution/v2-improved/EvolutionInsightCard";
import { MedicalReturnAlertCard } from "@/components/evolution/MedicalReturnAlertCard";
import { MeasurementForm } from "@/components/evolution/MeasurementForm";
import {
  PAIN_QUALITY_OPTIONS,
  PAIN_QUALITY_INTENSITIES,
  COMMON_ANATOMICAL_REGIONS,
  parsePainDetail,
  shouldShowVitals,
  stripPainDetail,
  type PainQualityIntensity,
  type PainLocationMember,
} from "@/lib/evolution/painDetail";
import { useSoapRecords } from "@/hooks/useSoapRecords";
import { usePatientSurgeries } from "@/hooks/usePatientEvolution";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

interface EvolutionNoScrollPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  patientId?: string;
  evolutionId?: string;
  patient?: any;
  pathologies?: any[];
  onNavigateToTab?: (tab: string) => void;
}

const QUALITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Pontada: Zap,
  Peso: Anchor,
  Queimação: Flame,
  Latejante: Waves,
};

const INTENSITY_WIDTH: Record<PainQualityIntensity, string> = {
  leve: "18%",
  moderada: "50%",
  intensa: "78%",
};

/** Card lateral genérico — borda superior colorida por seção. */
function SideCard({
  icon: Icon,
  title,
  accent = "border-t-slate-300",
  action,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** Classe Tailwind da borda superior, ex.: "border-t-rose-500". */
  accent?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-t-[3px] border-border bg-card px-3 py-2.5 shadow-sm",
        accent,
        onClick && "cursor-pointer transition-colors hover:border-slate-300",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <h4 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h4>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function CmpRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[12px] font-bold">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function deltaBadge(from: number, to: number, lowerIsBetter = true) {
  const diff = to - from;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff === 0 ? TrendingDown : diff < 0 ? TrendingDown : TrendingUp;
  const cls =
    diff === 0
      ? "bg-slate-100 text-slate-600"
      : improved
        ? "bg-emerald-100 text-emerald-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold", cls)}>
      <Icon className="h-3 w-3" /> {from} → {to}
    </span>
  );
}

/** Extrai um valor de ROM representativo das measurements (graus). */
function extractRom(measurements: any[] = []): number | null {
  const m = stripPainDetail(measurements).find((x: any) => {
    const t = `${x.measurement_type ?? ""}`.toLowerCase();
    return t.includes("movimento") || t.includes("goniom");
  });
  if (!m) return null;
  const n = parseInt(String(m.value).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

function formatSurgeryDuration(date: string) {
  if (!date) return "Data não informada";
  const d1 = new Date(date);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date();
  d2.setHours(0, 0, 0, 0);
  
  const diffMs = d2.getTime() - d1.getTime();
  const totalDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  
  if (totalDays === 0) return "Hoje";
  
  const years = Math.floor(totalDays / 365);
  const remainingDaysAfterYears = totalDays % 365;
  const months = Math.floor(remainingDaysAfterYears / 30);
  const remainingDaysAfterMonths = remainingDaysAfterYears % 30;
  const weeks = Math.floor(remainingDaysAfterMonths / 7);
  const days = remainingDaysAfterMonths % 7;
  
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  
  if (parts.length === 0) return "Hoje";
  if (parts.length > 1) {
    const last = parts.pop();
    return parts.join(", ") + " e " + last;
  }
  return parts[0];
}

export const EvolutionNoScrollPanel = memo(
  ({
    data,
    onChange,
    patientId,
    evolutionId,
    patient,
    pathologies = [],
    onNavigateToTab,
  }: EvolutionNoScrollPanelProps) => {
    const { data: surgeries = [] } = usePatientSurgeries(patientId || "");
    const [historyOpen, setHistoryOpen] = useState(false);
    const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
    const [focusSection, setFocusSection] = useState<null | "obs" | "condutas">(null);
    const [saveFeedback, setSaveFeedback] = useState<null | "saved" | "error">(null);
    const [activePainMode, setActivePainMode] = useState<"arrival" | "discharge">("discharge");

    // Atalhos de teclado (T013)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+S ou Cmd+S → salvar (disparar onChange para autosave)
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          setSaveFeedback("saved");
          setTimeout(() => setSaveFeedback(null), 2000);
        }
        // Alt+O → foco em Observações
        if (e.altKey && e.key === "o") {
          e.preventDefault();
          setFocusSection("obs");
        }
        // Alt+C → foco em Condutas
        if (e.altKey && e.key === "c") {
          e.preventDefault();
          setFocusSection("condutas");
        }
        // Alt+D → foco em Dor (scroll para coluna 3)
        if (e.altKey && e.key === "d") {
          e.preventDefault();
          const painSection = document.querySelector("[data-pain-section]");
          painSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // Escape → fechar foco
        if (e.key === "Escape") {
          setFocusSection(null);
          setHistoryOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Feedback de "Sessão salva" (T016)
    const triggerSaveFeedback = useCallback(() => {
      setSaveFeedback("saved");
      setTimeout(() => setSaveFeedback(null), 2000);
    }, []);

    // Revisão para forçar o editor a sincronizar quando troca o registro carregado.
    const revisionRef = useRef(0);
    const lastEvoId = useRef(evolutionId);
    if (evolutionId !== lastEvoId.current) {
      lastEvoId.current = evolutionId;
      revisionRef.current += 1;
    }

    const arrival = data.painLevelArrival;
    const discharge = data.painLevelDischarge ?? data.painLevel ?? 0;
    const quality = data.painQuality ?? [];

    type PainData = Pick<
      EvolutionV2Data,
      | "painLevelArrival"
      | "painLevelDischarge"
      | "painLevel"
      | "painQuality"
      | "painLocation"
      | "locationMembers"
      | "isIndividualPain"
    >;
    const [painPast, setPainPast] = useState<PainData[]>([]);
    const [painFuture, setPainFuture] = useState<PainData[]>([]);

    const [regionSearch, setRegionSearch] = useState("");
    const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
    const autoLoadedMembersRef = useRef(false);

    const currentPainData: PainData = useMemo(
      () => ({
        painLevelArrival: data.painLevelArrival,
        painLevelDischarge: data.painLevelDischarge,
        painLevel: data.painLevel,
        painQuality: data.painQuality,
        painLocation: data.painLocation,
        locationMembers: data.locationMembers,
        isIndividualPain: data.isIndividualPain,
      }),
      [
        data.painLevelArrival,
        data.painLevelDischarge,
        data.painLevel,
        data.painQuality,
        data.painLocation,
        data.locationMembers,
        data.isIndividualPain,
      ],
    );

    const commitPainChange = useCallback(
      (newPainData: Partial<EvolutionV2Data>) => {
        setPainPast((p) => [...p, currentPainData].slice(-50));
        setPainFuture([]);
        onChange({ ...data, ...newPainData });
      },
      [currentPainData, data, onChange],
    );

    const handlePainUndo = useCallback(() => {
      if (painPast.length === 0) return;
      const prev = painPast[painPast.length - 1];
      setPainPast((p) => p.slice(0, -1));
      setPainFuture((f) => [currentPainData, ...f]);
      onChange({ ...data, ...prev });
    }, [painPast, currentPainData, data, onChange]);

    const handlePainRedo = useCallback(() => {
      if (painFuture.length === 0) return;
      const next = painFuture[0];
      setPainFuture((f) => f.slice(1));
      setPainPast((p) => [...p, currentPainData]);
      onChange({ ...data, ...next });
    }, [painFuture, currentPainData, data, onChange]);

    const handleObservationsChange = (text: string) => {
      onChange({ ...data, observations: text, evolutionText: text });
    };
    const handleUnifiedItemsChange = (items: any[]) => {
      onChange({ ...data, unifiedItems: items });
    };
    const setArrival = (v: number) => commitPainChange({ painLevelArrival: v });
    const setDischarge = (v: number) =>
      commitPainChange({ painLevelDischarge: v, painLevel: v });
    const setLocation = (v: string) => commitPainChange({ painLocation: v });
    const toggleQuality = (type: string) => {
      const exists = quality.find((q) => q.type === type);
      let nextQuality;
      if (!exists) {
        nextQuality = [...quality, { type, intensity: "moderada" as PainQualityIntensity }];
      } else {
        // cicla intensidade: moderada → intensa → leve → (remove)
        const order = PAIN_QUALITY_INTENSITIES;
        const idx = order.indexOf(exists.intensity);
        if (idx === order.length - 1) {
          nextQuality = quality.filter((q) => q.type !== type);
        } else {
          nextQuality = quality.map((q) =>
            q.type === type ? { ...q, intensity: order[idx + 1] } : q,
          );
        }
      }
      commitPainChange({ painQuality: nextQuality });
    };

    const handleReplicate = (oldData: Partial<EvolutionV2Data>) => {
      onChange({
        ...data,
        evolutionText: oldData.evolutionText || oldData.observations || data.evolutionText,
        unifiedItems: oldData.unifiedItems || data.unifiedItems,
      });
      setHistoryOpen(false);
    };

    // Histórico de dor (real) para tendência + comparação.
    const { data: rawRecords = [] } = useSoapRecords(patientId ?? "", 6);
    const previousRecords = useMemo(
      () =>
        (evolutionId ? rawRecords.filter((r) => r.id !== evolutionId) : rawRecords)
          .filter((r) => r.pain_scale != null)
          .slice(0, 3)
          .reverse(),
      [rawRecords, evolutionId],
    );

    const trendPoints: PainTrendPoint[] = useMemo(() => {
      const pts: PainTrendPoint[] = previousRecords.map((r, i) => ({
        label: `S${String(i + 1).padStart(2, "0")}`,
        level: r.pain_scale ?? 0,
      }));
      pts.push({ label: `S${String(pts.length + 1).padStart(2, "0")}`, level: discharge });
      return pts;
    }, [previousRecords, discharge]);

    const trendDelta =
      trendPoints.length >= 2 ? trendPoints[trendPoints.length - 1].level - trendPoints[0].level : null;

    const prevRecord = useMemo(
      () => (evolutionId ? rawRecords.find((r) => r.id !== evolutionId) : rawRecords[0]),
      [rawRecords, evolutionId],
    );
    const prevRom = extractRom((prevRecord?.measurements as any[]) ?? []);
    const curRom = extractRom((data.measurements as any[]) ?? []);

    const showVitals = useMemo(
      () => shouldShowVitals(patient, pathologies, (data.measurements as any[]) ?? []),
      [patient, pathologies, data.measurements],
    );
    const vitalsList = useMemo(
      () =>
        ((data.measurements as any[]) ?? []).filter(
          (m: any) => m.measurement_type === "Sinais Vitais",
        ),
      [data.measurements],
    );
    // Medições reais (sem as entradas internas de detalhe de dor).
    const realMeasurementsCount = useMemo(
      () => stripPainDetail((data.measurements as any[]) ?? []).length,
      [data.measurements],
    );

    const observationsValue = data.evolutionText || data.observations || "";
    
    // Contagem de palavras simples (removendo tags HTML)
    const plainText = observationsValue.replace(/<[^>]*>?/gm, '').trim();
    const wordCount = plainText ? plainText.split(/\s+/).length : 0;
    
    // Placeholder dinâmico (com base na existência de evoluções anteriores)
    const dynamicPlaceholder = previousRecords.length > 0
      ? "Continue a evolução clínica (foco no acompanhamento e progressão)..."
      : "Registre a evolução clínica: queixas, achados, intervenções e resposta do paciente...";

    return (
      <div className="evolution-main-grid">
        {/* ===================== COLUNA 1 — OBSERVAÇÕES ===================== */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-t-[3px] border-border border-t-[#F59E0B] bg-card shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-800">Observações clínicas</div>
              <div className="text-[11px] font-semibold text-muted-foreground">
                Registro principal da sessão
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFocusSection("obs")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-slate-50"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Foco
            </button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 px-3 py-2">
            <RichTextBlock
              value={observationsValue}
              onValueChange={handleObservationsChange}
              placeholder={dynamicPlaceholder}
              showToolbar
              externalValueRevision={revisionRef.current}
              className="clinical-observations-editor flex-1 min-h-0"
            />
          </div>
          <div className="flex justify-between items-center px-4 py-1.5 border-t border-border bg-slate-50/50 text-[10px] font-semibold text-slate-500 rounded-b-2xl">
            <span>{wordCount} {wordCount === 1 ? "palavra" : "palavras"}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Autosave ativo
            </span>
          </div>
        </motion.div>

        {/* ===================== COLUNA 2 — CONDUTAS ===================== */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-t-[3px] border-border border-t-primary bg-card shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Stethoscope className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-800">Procedimentos &amp; exercícios</div>
              <div className="text-[11px] font-semibold text-muted-foreground">
                Alterne procedimento/exercício acima do campo
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFocusSection("condutas")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-slate-50"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Foco
            </button>
          </div>
          <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-4">
            <EvolutionBlockV3
              items={data.unifiedItems || []}
              onChange={handleUnifiedItemsChange}
              patientId={patientId || ""}
              type="unified"
              variant="embedded"
              className="h-full"
            />
          </div>
        </motion.div>

        {/* ===================== COLUNA 3 — DOR + ITENS ===================== */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="custom-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto pb-2 pr-1"
        >
          {/* alerta de retorno médico — vermelho até o relatório ser enviado */}
          <MedicalReturnAlertCard
            patientId={patientId || ""}
            patientName={patient?.name}
            patientGender={patient?.gender ?? null}
          />

          {/* nível de dor — EVA */}
          <div data-pain-section className="rounded-2xl border border-t-[3px] border-border border-t-rose-500 bg-card px-3 py-2 shadow-sm">
            <div className="mb-0.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Activity className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-800">Nível de dor — EVA</div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Escala Visual Analógica · 0 a 10
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    onClick={handlePainUndo}
                    disabled={painPast.length === 0}
                    className="p-1.5 text-rose-400 hover:bg-rose-100/50 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Desfazer exclusão/edição"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePainRedo}
                    disabled={painFuture.length === 0}
                    className="p-1.5 text-rose-400 hover:bg-rose-100/50 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Refazer"
                  >
                    <Redo2 className="h-4 w-4" />
                  </button>
                </div>
                {saveFeedback === "saved" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-700 animate-pulse">
                    ✓ Salvo
                  </span>
                )}
                {delta != null && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-extrabold",
                      delta <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                    )}
                  >
                    {delta <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {delta === 0 ? "estável" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}
                  </span>
                )}
              </div>
            </div>

            <PainGauge
              value={discharge}
              arrival={arrival}
              compact
              onChange={activePainMode === "arrival" ? setArrival : setDischarge}
              showDeltaArc
              showTooltips
              activeMode={activePainMode}
              onModeChange={setActivePainMode}
            />

            <div className="mt-1 flex gap-2">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Chegada
                  </label>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700">
                    {(arrival ?? 0)}/10
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[arrival ?? 0]}
                  onValueChange={([value]) => setArrival(value)}
                  aria-label="Nível de dor na chegada"
                  className="h-4"
                />
                {arrival !== null && (
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Sem Dor</span>
                    <span>{painLabel(arrival)}</span>
                    <span>Dor Máxima</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Saída
                  </label>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700">
                    {discharge}/10
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[data.painLevelDischarge ?? data.painLevel ?? 0]}
                  onValueChange={([value]) => setDischarge(value)}
                  aria-label="Nível de dor na saída"
                  className="h-4"
                />
                {(data.painLevelDischarge ?? data.painLevel) !== null && (
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Sem Dor</span>
                    <span>{painLabel(data.painLevelDischarge ?? data.painLevel)}</span>
                    <span>Dor Máxima</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-nowrap items-center gap-1 overflow-hidden">
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Tipo:
              </span>
              {PAIN_QUALITY_OPTIONS.map((type) => {
                const Icon = QUALITY_ICON[type] ?? Zap;
                const active = quality.find((q) => q.type === type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleQuality(type)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold leading-none transition-colors xl:gap-1 xl:px-2 xl:py-1 xl:text-[10px]",
                      active
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-muted-foreground hover:bg-slate-200",
                    )}
                    title={active ? `${type} · ${active.intensity}` : type}
                  >
                    <Icon className="h-2.5 w-2.5 xl:h-3 xl:w-3" /> {type}
                    {active && (
                      <span className="text-[9px] font-extrabold uppercase opacity-70">
                        {active.intensity[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Localização da dor com Autocomplete e EVA por Membro */}
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2 space-y-2">
              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-700">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Localização da dor</span>
                  {autoLoadedMembersRef.current && (
                    <span className="shrink-0 text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full" title="Repetido da última sessão">
                      ↺ Repetido
                    </span>
                  )}
                </div>

                {/* Alternador Global vs Individual */}
                {(data.locationMembers?.length ?? 0) > 0 && (
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-slate-200/70 p-0.5 text-[9.5px] font-extrabold">
                    <button
                      type="button"
                      onClick={() => toggleIndividualPain(false)}
                      className={cn(
                        "px-1.5 py-0.5 rounded-md transition-colors",
                        !data.isIndividualPain ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      Dor Única
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleIndividualPain(true)}
                      className={cn(
                        "px-1.5 py-0.5 rounded-md transition-colors",
                        data.isIndividualPain ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      Por Membro
                    </button>
                  </div>
                )}
              </div>

              {/* Autocomplete Input */}
              <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-rose-500">
                    <input
                      type="text"
                      value={regionSearch}
                      onChange={(e) => {
                        setRegionSearch(e.target.value);
                        if (!isRegionPopoverOpen) setIsRegionPopoverOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && regionSearch.trim()) {
                          e.preventDefault();
                          addPainMember(regionSearch);
                          setRegionSearch("");
                          setIsRegionPopoverOpen(false);
                        }
                      }}
                      placeholder="Adicionar membro (ex: Ombro D, Lombar)..."
                      className="w-full bg-transparent text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1 max-h-48 overflow-y-auto" align="start">
                  {filteredRegions.length > 0 ? (
                    filteredRegions.map((region) => {
                      const isSelected = data.locationMembers?.some(
                        (m) => m.member.toLowerCase() === region.toLowerCase(),
                      );
                      return (
                        <button
                          key={region}
                          type="button"
                          onClick={() => {
                            addPainMember(region);
                            setRegionSearch("");
                            setIsRegionPopoverOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-md transition-colors flex items-center justify-between"
                        >
                          <span>{region}</span>
                          {isSelected && (
                            <span className="text-[9px] font-bold text-rose-500">Adicionado</span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-2 py-1.5 text-[11px] text-slate-500 text-center">
                      Nenhuma região sugerida
                    </div>
                  )}
                  {regionSearch.trim() &&
                    !COMMON_ANATOMICAL_REGIONS.some(
                      (r) => r.toLowerCase() === regionSearch.trim().toLowerCase(),
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          addPainMember(regionSearch);
                          setRegionSearch("");
                          setIsRegionPopoverOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md border-t border-slate-100 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar "{regionSearch.trim()}"
                      </button>
                    )}
                </PopoverContent>
              </Popover>

              {/* Lista de Membros Selecionados */}
              {(data.locationMembers?.length ?? 0) > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  {data.locationMembers?.map((m) => {
                    const mArrival = m.arrival ?? arrival ?? 0;
                    const mDischarge = m.discharge ?? discharge;
                    return (
                      <div
                        key={m.member}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between font-extrabold text-slate-800">
                          <span className="flex items-center gap-1 text-rose-700">
                            <MapPin className="h-3 w-3 shrink-0" /> {m.member}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePainMember(m.member)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                            title="Remover membro"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>

                        {/* EVA Individual por Membro */}
                        {data.isIndividualPain && (
                          <div className="pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <div className="flex justify-between font-semibold text-slate-600 mb-1">
                                <span>Chegada:</span>
                                <span className="font-extrabold text-violet-700">{mArrival}/10</span>
                              </div>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[mArrival]}
                                onValueChange={([v]) => updatePainMemberLevel(m.member, "arrival", v)}
                                className="h-3"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between font-semibold text-slate-600 mb-1">
                                <span>Saída:</span>
                                <span className="font-extrabold text-violet-700">{mDischarge}/10</span>
                              </div>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[mDischarge]}
                                onValueChange={([v]) => updatePainMemberLevel(m.member, "discharge", v)}
                                className="h-3"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Insight Clínico Unificado */}
          <EvolutionInsightCard
            trendData={trendPoints}
            metaPain={discharge > 3 ? 3 : undefined}
            currentLevel={discharge}
          />

          <SideCard
            icon={GitCompare}
            title="VS. sessão anterior"
            accent="border-t-violet-500"
            action={
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="text-[10px] font-extrabold uppercase tracking-wider text-primary hover:underline"
              >
                Ver histórico
              </button>
            }
          >
            {prevRecord ? (
              <div className="space-y-2">
                <CmpRow label="Dor (EVA)">
                  {deltaBadge(prevRecord.pain_scale ?? 0, discharge, true)}
                </CmpRow>
                {prevRom != null && curRom != null ? (
                  <CmpRow label="ROM">
                    {deltaBadge(prevRom, curRom, false)}
                  </CmpRow>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] font-semibold text-muted-foreground">
                Ainda não há sessão anterior suficiente para comparação.
              </p>
            )}
          </SideCard>

          {/* medições */}
          <SideCard
            icon={Ruler}
            title="Medições"
            accent="border-t-[#8B5CF6]"
            action={
              <button
                type="button"
                onClick={() => onNavigateToTab?.("avaliacao")}
                className="text-[10px] font-extrabold uppercase tracking-wider text-primary hover:underline"
              >
                Detalhar
              </button>
            }
          >
            {realMeasurementsCount > 0 ? (
              <p className="text-[12px] font-bold text-slate-700">
                {realMeasurementsCount}{" "}
                {realMeasurementsCount === 1 ? "registro" : "registros"} nesta sessão
              </p>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <Ruler className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-[11px] font-semibold text-muted-foreground text-center">
                  Nenhuma medição registrada
                </p>
                <button
                  type="button"
                  onClick={() => setMeasurementModalOpen(true)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  + Adicionar medição
                </button>
              </div>
            )}
          </SideCard>

          {/* cirurgias (condicional) */}
          {surgeries.length > 0 && (
            <SideCard
              icon={Scissors}
              title="Cirurgias"
              accent="border-t-orange-500"
            >
              <div className="space-y-2">
                {surgeries.map((s: any) => (
                  <div key={s.id} className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-bold text-slate-700">{s.surgery_name}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {s.surgery_date ? formatSurgeryDuration(s.surgery_date) : "Data não informada"}
                    </span>
                  </div>
                ))}
              </div>
            </SideCard>
          )}

          {/* sinais vitais — condicional */}
          {showVitals && (
            <SideCard icon={HeartPulse} title="Sinais vitais" accent="border-t-[#14B8A6]">
              {vitalsList.length > 0 ? (
                vitalsList.map((m: any) => (
                  <CmpRow key={m.id} label={m.measurement_name || "Sinal"}>
                    {m.value}
                    {m.unit ? ` ${m.unit}` : ""}
                  </CmpRow>
                ))
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                    <HeartPulse className="h-4 w-4 text-teal-500" />
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground text-center">
                    Relevante para este paciente
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab?.("avaliacao")}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    + Registrar sinais vitais
                  </button>
                </div>
              )}
            </SideCard>
          )}
        </motion.div>

        {/* ---------- FOCO (tela cheia) ---------- */}
        <Dialog open={focusSection !== null} onOpenChange={(o) => !o && setFocusSection(null)}>
          <DialogContent
            className={cn(
              "flex flex-col gap-0 p-0 overflow-hidden transition-all duration-300",
              focusSection === "condutas" ? "max-w-3xl max-h-[82vh] h-auto rounded-3xl" : "max-w-4xl h-[82vh] rounded-3xl"
            )}
          >
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              {focusSection === "condutas" ? (
                <Stethoscope className="h-5 w-5 text-orange-500 animate-pulse" />
              ) : (
                <FileText className="h-5 w-5 text-amber-500 animate-pulse" />
              )}
              <span className="text-sm font-extrabold text-slate-800">
                {focusSection === "condutas" ? "Condutas da sessão" : "Observações clínicas"}
              </span>
              <button
                type="button"
                onClick={() => setFocusSection(null)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-all duration-200"
                aria-label="Fechar foco"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className={cn(
                "custom-scrollbar flex-1 overflow-y-auto",
                focusSection === "obs" ? "p-6 bg-slate-50/60 dark:bg-slate-900/10" : "p-5"
              )}
            >
              {focusSection === "obs" && (
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 shadow-md focus-within:shadow-xl focus-within:border-slate-300 dark:focus-within:border-slate-700 rounded-2xl p-6 min-h-[50vh] transition-all duration-300">
                  <RichTextBlock
                    value={observationsValue}
                    onValueChange={handleObservationsChange}
                    placeholder="Digite a evolução clínica aqui…"
                    showToolbar
                    externalValueRevision={revisionRef.current}
                    editorClassName="clinical-observations-editor min-h-[40vh]"
                  />
                </div>
              )}
              {focusSection === "condutas" && (
                <EvolutionBlockV3
                  items={data.unifiedItems || []}
                  onChange={handleUnifiedItemsChange}
                  patientId={patientId || ""}
                  type="unified"
                  variant="embedded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={measurementModalOpen} onOpenChange={setMeasurementModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle>Adicionar medição</DialogTitle>
              <DialogDescription>
                Registre as medições desta sessão sem sair da evolução.
              </DialogDescription>
            </DialogHeader>
            {patientId ? (
              <div className="p-4">
                <MeasurementForm patientId={patientId} soapRecordId={evolutionId} />
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* ---------- HISTÓRICO ---------- */}
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="right" className="w-[92vw] overflow-y-auto p-4 sm:max-w-xl">
            <SheetHeader className="pr-8">
              <SheetTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Histórico de sessões
              </SheetTitle>
              <SheetDescription>Últimas evoluções deste paciente</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <SessionTimelineStrip
                patientId={patientId}
                excludeId={evolutionId}
                onSeeAll={() => {
                  setHistoryOpen(false);
                  onNavigateToTab?.("historico");
                }}
                onReplicate={handleReplicate}
                maxItems={20}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
);

EvolutionNoScrollPanel.displayName = "EvolutionNoScrollPanel";
