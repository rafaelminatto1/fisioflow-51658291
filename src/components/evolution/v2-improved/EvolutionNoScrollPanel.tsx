import React, { memo, useMemo, useRef, useState } from "react";
import {
  Activity,
  Anchor,
  ArrowRight,
  FileText,
  Fingerprint,
  Flame,
  GitCompare,
  HeartPulse,
  History,
  Maximize2,
  MapPin,
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

interface EvolutionNoScrollPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  patientId?: string;
  evolutionId?: string;
  patient?: any;
  pathologies?: any[];
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

/** Picker compacto de EVA 0–10 (chegada/saída). */
function EvaPicker({
  label,
  sub,
  value,
  highlight,
  onChange,
}: {
  label: string;
  sub: string;
  value?: number;
  highlight?: boolean;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = value ?? 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-1 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
            highlight
              ? "border-amber-200 bg-amber-50/70 hover:bg-amber-50"
              : "border-border bg-card hover:bg-slate-50",
          )}
        >
          <div
            className="text-[30px] font-extrabold leading-none tabular-nums"
            style={{ color: painColor(display) }}
          >
            {value == null ? "–" : display}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="truncate text-[11px] font-bold text-muted-foreground">{sub}</div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {label} · EVA 0–10
        </div>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(i);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-extrabold tabular-nums transition-all",
                value === i ? "text-white" : "border border-border bg-card hover:border-primary/50",
              )}
              style={value === i ? { backgroundColor: painColor(i), borderColor: "transparent" } : undefined}
            >
              {i}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Card lateral genérico (Layout E). */
function SideCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
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
  ({ data, onChange, patientId, evolutionId, patient, pathologies = [] }: EvolutionNoScrollPanelProps) => {
    const [historyOpen, setHistoryOpen] = useState(false);
    const [focusSection, setFocusSection] = useState<null | "obs" | "condutas">(null);

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

    const observationsValue = data.evolutionText || data.observations || "";

    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        {/* ============================ COLUNA PRINCIPAL ============================ */}
        <div className="custom-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          {/* ---------- PAIN HERO ---------- */}
          <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:grid-cols-[280px_1fr]">
            <div>
              <PainGauge value={discharge} arrival={arrival} />
              <div className="mt-1 flex justify-center gap-4">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-rose-500 bg-white" />
                  Chegada · {arrival ?? "–"}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: painColor(discharge) }}
                  />
                  Saída · {discharge}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-800">Nível de dor — EVA</div>
                  <div className="text-[11.5px] font-semibold text-muted-foreground">
                    Escala Visual Analógica · 0 a 10
                  </div>
                </div>
                {delta != null && (
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                      delta <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                    )}
                  >
                    {delta <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {delta === 0 ? "estável" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} na sessão`}
                  </span>
                )}
              </div>

              <div className="flex gap-2.5">
                <EvaPicker
                  label="Chegada"
                  sub={arrival != null ? painLabel(arrival) : "Toque para registrar"}
                  value={arrival}
                  onChange={setArrival}
                />
                <EvaPicker
                  label="Saída"
                  sub={painLabel(discharge)}
                  value={data.painLevelDischarge ?? data.painLevel}
                  highlight
                  onChange={setDischarge}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                        active
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-muted-foreground hover:bg-slate-200",
                      )}
                      title={active ? `${type} · ${active.intensity}` : type}
                    >
                      <Icon className="h-3.5 w-3.5" /> {type}
                      {active && (
                        <span className="text-[9px] font-extrabold uppercase opacity-70">
                          {active.intensity[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50/60 px-3 py-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={data.painLocation || ""}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Localização da dor (ex.: Ombro D · anterior · arco 70–110°)"
                  className="w-full bg-transparent text-[12.5px] font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ---------- DESCRIÇÃO ---------- */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
            <div className="px-3 py-2">
              <RichTextBlock
                value={observationsValue}
                onValueChange={handleObservationsChange}
                placeholder="Digite a evolução clínica aqui…"
                showToolbar
                externalValueRevision={revisionRef.current}
              />
            </div>
          </div>

          {/* ---------- CONDUTAS ---------- */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Stethoscope className="h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-800">Condutas da sessão</div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Procedimentos e exercícios — alterne com os botões acima do campo
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
            <div className="p-4">
              <EvolutionBlockV3
                items={data.unifiedItems || []}
                onChange={handleUnifiedItemsChange}
                patientId={patientId || ""}
                type="unified"
                variant="embedded"
              />
            </div>
          </div>
        </div>

        {/* ============================ COLUNA LATERAL ============================ */}
        <div className="custom-scrollbar flex min-h-0 flex-col gap-3.5 overflow-y-auto pb-2 pr-1">
          {/* tendência */}
          <SideCard icon={TrendingDown} title="Tendência da dor">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[30px] font-extrabold tabular-nums tracking-tight">
                {discharge}
                <span className="text-sm font-bold text-muted-foreground">/10</span>
              </span>
              {trendDelta != null && trendDelta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[12px] font-extrabold",
                    trendDelta < 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {trendDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {trendDelta > 0 ? "+" : "−"}
                  {Math.abs(trendDelta)} no período
                </span>
              )}
            </div>
            <PainTrendSparkline data={trendPoints} meta={discharge > 3 ? 3 : undefined} />
          </SideCard>

          {/* qualidade */}
          <SideCard icon={Fingerprint} title="Qualidade da dor">
            {quality.length === 0 ? (
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                Selecione o tipo de dor no medidor ao lado.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {quality.map((q) => {
                  const Icon = QUALITY_ICON[q.type] ?? Zap;
                  return (
                    <div key={q.type}>
                      <div className="mb-1 flex items-center justify-between text-[11.5px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-rose-500" /> {q.type}
                        </span>
                        <span className="capitalize">{q.intensity}</span>
                      </div>
                      <div className="h-[7px] overflow-hidden rounded-full bg-slate-100">
                        <i
                          className="block h-full rounded-full bg-rose-500"
                          style={{ width: INTENSITY_WIDTH[q.intensity] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SideCard>

          {/* vs sessão anterior */}
          <SideCard icon={GitCompare} title="vs. sessão anterior">
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

          {/* sinais vitais — condicional */}
          {showVitals && (
            <SideCard icon={HeartPulse} title="Sinais vitais">
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
          <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-0 p-0">
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              {focusSection === "condutas" ? (
                <Stethoscope className="h-5 w-5 text-emerald-600" />
              ) : (
                <FileText className="h-5 w-5 text-amber-600" />
              )}
              <span className="text-sm font-extrabold text-slate-800">
                {focusSection === "condutas" ? "Condutas da sessão" : "Observações clínicas"}
              </span>
              <button
                type="button"
                onClick={() => setFocusSection(null)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100"
                aria-label="Fechar foco"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
              {focusSection === "obs" && (
                <RichTextBlock
                  value={observationsValue}
                  onValueChange={handleObservationsChange}
                  placeholder="Digite a evolução clínica aqui…"
                  showToolbar
                  externalValueRevision={revisionRef.current}
                />
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
                onSeeAll={() => {}}
                onReplicate={handleReplicate}
                maxItems={8}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  },
);

EvolutionNoScrollPanel.displayName = "EvolutionNoScrollPanel";
