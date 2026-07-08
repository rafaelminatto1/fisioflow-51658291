import { useQuery } from "@tanstack/react-query";
import { TrendingUp, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/api/v2/base";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenchmarkMetric {
  sua_clinica: number;
  media_sp: number;
  top20: number;
  posicao: "top_performer" | "above_average" | "below_average" | "critical";
  delta: number;
}

interface BenchmarkData {
  ocupacao: BenchmarkMetric;
  ticket_medio: BenchmarkMetric;
  noshow_rate: BenchmarkMetric;
  nps: BenchmarkMetric;
  retencao_30dias: BenchmarkMetric;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_CONFIG = [
  {
    key: "ocupacao" as const,
    label: "Ocupação",
    unit: "%",
    format: (v: number) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: "ticket_medio" as const,
    label: "Ticket Médio",
    unit: "R$",
    format: (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    higherIsBetter: true,
  },
  {
    key: "noshow_rate" as const,
    label: "No-show Rate",
    unit: "%",
    format: (v: number) => `${v.toFixed(1)}%`,
    higherIsBetter: false,
  },
  {
    key: "nps" as const,
    label: "NPS",
    unit: "",
    format: (v: number) => `${v.toFixed(0)}`,
    higherIsBetter: true,
  },
  {
    key: "retencao_30dias" as const,
    label: "Retenção 30d",
    unit: "%",
    format: (v: number) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
];

const POSITION_CONFIG = {
  top_performer: {
    label: "Top Performer",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    barColor: "bg-emerald-500",
  },
  above_average: {
    label: "Acima da Média",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
    barColor: "bg-teal-500",
  },
  below_average: {
    label: "Abaixo da Média",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    barColor: "bg-amber-500",
  },
  critical: {
    label: "Crítico",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    barColor: "bg-red-500",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calcula a posição relativa (0–100) de your_value entre min e max */
function relativePosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

// ─── Sub-component: MetricRow ─────────────────────────────────────────────────

interface MetricRowProps {
  config: (typeof METRIC_CONFIG)[number];
  metric: BenchmarkMetric;
  index: number;
}

function MetricRow({ config, metric, index }: MetricRowProps) {
  const pos = POSITION_CONFIG[metric.posicao];

  // For the progress bar: position of our clinic value between 0 and top20*1.2 (give room above top20)
  const rangeMin = 0;
  const rangeMax = metric.top20 * 1.3;
  const barWidth = relativePosition(metric.sua_clinica, rangeMin, rangeMax);
  const avgWidth = relativePosition(metric.media_sp, rangeMin, rangeMax);
  const top20Width = relativePosition(metric.top20, rangeMin, rangeMax);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="rounded-2xl border border-border/40 bg-card/60 p-4 hover:bg-card/80 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        {/* Label + badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
            {config.label}
          </span>
          <Badge className={cn("text-[9px] px-1.5 py-0 border-0 font-black", pos.className)}>
            {pos.label}
          </Badge>
        </div>

        {/* Delta */}
        <span
          className={cn(
            "text-[10px] font-black shrink-0",
            metric.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
          )}
        >
          {metric.delta >= 0 ? "+" : ""}
          {metric.delta.toFixed(1)}
          {config.unit || ""}
        </span>
      </div>

      {/* Values row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
            Sua Clínica
          </span>
          <span className="text-base font-black text-primary font-display">
            {config.format(metric.sua_clinica)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
            Média SP
          </span>
          <span className="text-sm font-bold text-muted-foreground">
            {config.format(metric.media_sp)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
            Top 20%
          </span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {config.format(metric.top20)}
          </span>
        </div>
      </div>

      {/* Progress bar visualization */}
      <div className="relative h-2.5 bg-muted/40 rounded-full overflow-visible">
        {/* Avg SP marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40 rounded-full z-10"
          style={{ left: `${avgWidth}%` }}
          title={`Média SP: ${config.format(metric.media_sp)}`}
        />
        {/* Top 20% marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70 rounded-full z-10"
          style={{ left: `${top20Width}%` }}
          title={`Top 20%: ${config.format(metric.top20)}`}
        />
        {/* Your clinic bar */}
        <div
          className={cn("h-full rounded-full transition-all duration-700", pos.barColor)}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-muted-foreground/60">0</span>
        <span className="text-[8px] text-amber-500/70 font-bold">Top 20%</span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BenchmarkWidget() {
  const { data, isLoading } = useQuery<BenchmarkData>({
    queryKey: ["benchmark", "market-position"],
    queryFn: () => request<BenchmarkData>("/api/benchmark/market-position"),
    staleTime: 60 * 60 * 1000, // 1h — benchmark data doesn't change often
  });

  if (isLoading) {
    return (
      <Card className="premium-glass border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="premium-glass border-border/40 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            Benchmark vs. Mercado SP
          </CardTitle>
          <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-black px-2.5 py-1 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            São Paulo 2026
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-3">
        {METRIC_CONFIG.map((config, index) => {
          const metric = data[config.key];
          return (
            <MetricRow key={config.key} config={config} metric={metric} index={index} />
          );
        })}
      </CardContent>
    </Card>
  );
}
