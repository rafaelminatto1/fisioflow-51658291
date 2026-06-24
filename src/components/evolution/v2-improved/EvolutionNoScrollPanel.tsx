import React, { memo, useMemo, useRef, useState } from "react";
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
  Paperclip,
  Ruler,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvolutionV2Data } from "@/components/evolution/v2-improved/types";
import { RichTextBlock } from "@/components/evolution/v2-improved/RichTextBlock";
import { EvolutionBlockV3 } from "@/components/evolution/v3-unified/EvolutionBlockV3";
import { SessionTimelineStrip } from "@/components/evolution/v2-improved/SessionTimelineStrip";
import { AttachmentsBlock } from "@/components/evolution/v2-improved/AttachmentsBlock";
import { PainGauge, painColor, painLabel } from "@/components/evolution/v2-improved/PainGauge";
import {
  PainTrendSparkline,
  type PainTrendPoint,
} from "@/components/evolution/v2-improved/PainTrendSparkline";
import {
  PAIN_QUALITY_OPTIONS,
  PAIN_QUALITY_INTENSITIES,
  shouldShowVitals,
  stripPainDetail,
  type PainQualityIntensity,
} from "@/lib/evolution/painDetail";
import { useSoapRecords } from "@/hooks/useSoapRecords";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

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
        "rounded-2xl border border-t-[3px] border-border bg-card p-3 shadow-sm",
        accent,
        onClick && "cursor-pointer transition-colors hover:border-slate-300",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
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
    const [historyOpen, setHistoryOpen] = useState(false);
    const [focusSection, setFocusSection] = useState<null | "obs" | "condutas">(null);
    const [anexosOpen, setAnexosOpen] = useState(false);

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
    const delta = arrival != null ? discharge - arrival : null;

    const handleObservationsChange = (text: string) => {
      onChange({ ...data, observations: text, evolutionText: text });
    };
    const handleUnifiedItemsChange = (items: any[]) => {
      onChange({ ...data, unifiedItems: items });
    };
    const setArrival = (v: number) => onChange({ ...data, painLevelArrival: v });
    const setDischarge = (v: number) =>
      onChange({ ...data, painLevelDischarge: v, painLevel: v });
    const setLocation = (v: string) => onChange({ ...data, painLocation: v });
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
      onChange({ ...data, painQuality: nextQuality });
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

    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,540px)_minmax(300px,340px)]">
        {/* ===================== COLUNA 1 — OBSERVAÇÕES ===================== */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-t-[3px] border-border border-t-[#F59E0B] bg-card shadow-sm">
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
          <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-2">
            <RichTextBlock
              value={observationsValue}
              onValueChange={handleObservationsChange}
              placeholder="Digite a evolução clínica aqui…"
              showToolbar
              externalValueRevision={revisionRef.current}
              className="clinical-observations-editor h-full [&_.ProseMirror]:min-h-[60vh]"
            />
          </div>
        </div>

        {/* ===================== COLUNA 2 — CONDUTAS ===================== */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-t-[3px] border-border border-t-primary bg-card shadow-sm">
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
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            <EvolutionBlockV3
              items={data.unifiedItems || []}
              onChange={handleUnifiedItemsChange}
              patientId={patientId || ""}
              type="unified"
              variant="embedded"
            />
          </div>
        </div>

        {/* ===================== COLUNA 3 — DOR + ITENS ===================== */}
        <div className="custom-scrollbar flex min-h-0 flex-col gap-2.5 overflow-y-auto pb-2 pr-1">
          {/* nível de dor — EVA */}
          <div className="rounded-2xl border border-t-[3px] border-border border-t-rose-500 bg-card p-3 shadow-sm">
            <div className="mb-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-800">Nível de dor — EVA</div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Escala Visual Analógica · 0 a 10
                </div>
              </div>
              {delta != null && (
                <span
                  className={cn(
                    "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-extrabold",
                    delta <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                  )}
                >
                  {delta <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {delta === 0 ? "estável" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}
                </span>
              )}
            </div>

            <PainGauge value={discharge} arrival={arrival} compact onChange={setDischarge} />

            <div className="mt-2 flex gap-2.5">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                  Chegada
                </label>
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                  Saída
                </label>
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

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
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
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                      active
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-muted-foreground hover:bg-slate-200",
                    )}
                    title={active ? `${type} · ${active.intensity}` : type}
                  >
                    <Icon className="h-3 w-3" /> {type}
                    {active && (
                      <span className="text-[9px] font-extrabold uppercase opacity-70">
                        {active.intensity[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-slate-50/60 px-3 py-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={data.painLocation || ""}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Localização da dor (opcional)"
                className="w-full bg-transparent text-[12px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* tendência */}
          <SideCard
            icon={TrendingDown}
            title="Tendência da dor"
            accent="border-t-rose-400"
            action={
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-extrabold tabular-nums leading-none text-slate-800">
                  {discharge}
                  <span className="text-[11px] font-bold text-muted-foreground">/10</span>
                </span>
                {trendDelta != null && trendDelta !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[11px] font-extrabold",
                      trendDelta < 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {trendDelta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {trendDelta > 0 ? "+" : "−"}
                    {Math.abs(trendDelta)}
                  </span>
                )}
              </div>
            }
          >
            <PainTrendSparkline
              data={trendPoints}
              meta={discharge > 3 ? 3 : undefined}
              heightClass="h-16"
            />
          </SideCard>



          {/* vs sessão anterior */}
          <SideCard icon={GitCompare} title="vs. sessão anterior" accent="border-t-blue-500">
            {prevRecord ? (
              <>
                {prevRecord.pain_scale != null && (
                  <CmpRow label="Dor (EVA)">{deltaBadge(prevRecord.pain_scale, discharge)}</CmpRow>
                )}
                {prevRom != null && curRom != null && (
                  <CmpRow label="ROM">{deltaBadge(prevRom, curRom, false)}</CmpRow>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  Ver histórico completo <ArrowRight className="h-3 w-3" />
                </button>
              </>
            ) : (
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                Primeira sessão registrada deste paciente.
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
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                Nenhuma medição nesta sessão.
              </p>
            )}
          </SideCard>

          {/* histórico de sessões */}
          <SideCard
            icon={History}
            title="Histórico de sessões"
            accent="border-t-blue-500"
            onClick={() => setHistoryOpen(true)}
            action={<ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          >
            <p className="text-[11.5px] font-semibold text-muted-foreground">
              {previousRecords.length > 0
                ? `${previousRecords.length} ${previousRecords.length === 1 ? "sessão" : "sessões"} · clique para replicar conduta`
                : "Abra o histórico completo deste paciente."}
            </p>
          </SideCard>

          {/* anexos — minimizado por padrão */}
          <SideCard
            icon={Paperclip}
            title="Anexos"
            accent="border-t-[#14B8A6]"
            action={
              <button
                type="button"
                onClick={() => setAnexosOpen((v) => !v)}
                className="text-[10px] font-extrabold uppercase tracking-wider text-primary hover:underline"
              >
                {anexosOpen ? "Recolher" : (data.attachments?.length ?? 0) > 0 ? "Ver" : "Adicionar"}
              </button>
            }
          >
            {anexosOpen ? (
              <AttachmentsBlock
                patientId={patientId}
                evolutionId={evolutionId}
                value={data.attachments ?? []}
                onChange={(attachments) => onChange({ ...data, attachments })}
                variant="embedded"
              />
            ) : (
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                {(data.attachments?.length ?? 0) > 0
                  ? `${data.attachments?.length} arquivo(s) anexado(s)`
                  : "Nenhum arquivo."}
              </p>
            )}
          </SideCard>

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
                <p className="text-[11.5px] font-semibold text-muted-foreground">
                  Relevante para este paciente — registre PA, FC e SpO₂ na aba Avaliação.
                </p>
              )}
            </SideCard>
          )}
        </div>

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
