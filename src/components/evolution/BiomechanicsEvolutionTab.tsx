/**
 * BiomechanicsEvolutionTab — Shows all biomechanics assessments for a patient.
 * Supports date range filtering and comparative chart visualization.
 */
import React, { useState, useEffect } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Zap,
  AlignJustify,
  Layout,
  FileDown,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { biomechanicsApi, type BiomechanicsData } from "@/api/v2";
import type { Assessment } from "@/utils/biomechanics-reports";
import type { SessionRecord } from "@/types/workers";

type BiomechanicsSession = SessionRecord & { biomechanics_data?: BiomechanicsData };

const TYPE_META = {
  gait: { label: "Marcha", icon: Activity, color: "#60a5fa" },
  jump: { label: "Salto", icon: Zap, color: "#34d399" },
  posture: { label: "Postura", icon: AlignJustify, color: "#fbbf24" },
  functional: { label: "Funcional", icon: Layout, color: "#818cf8" },
};

interface BiomechanicsEvolutionTabProps {
  patientId: string;
  patientName: string;
}

export const BiomechanicsEvolutionTab: React.FC<BiomechanicsEvolutionTabProps> = ({
  patientId,
  patientName,
}) => {
  const [sessions, setSessions] = useState<BiomechanicsSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<BiomechanicsData["type"] | "all">("all");
  const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 6), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await biomechanicsApi.listByPatient({
          patientId,
          dateFrom,
          dateTo,
          type: filterType === "all" ? undefined : filterType,
          limit: 50,
        });
        setSessions(res.data || []);
      } catch {
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [patientId, dateFrom, dateTo, filterType]);

  // Build chart data from sessions
  const chartData = sessions
    .filter((s) => s.biomechanics_data)
    .map((s) => {
      const bm = s.biomechanics_data!;
      return {
        date: format(parseISO(s.record_date || s.created_at || bm.analyzedAt), "dd/MM/yy", {
          locale: ptBR,
        }),
        type: bm.type,
        asymmetry: bm.asymmetry ?? null,
        ...bm.metrics,
      };
    });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { generateComparativeReport } = await import("@/utils/biomechanics-reports");
      const assessments: Assessment[] = sessions
        .filter((s) => s.biomechanics_data)
        .map((s) => ({
          date: new Date(s.record_date || s.created_at || Date.now()),
          type: s.biomechanics_data!.type as any,
          metrics: s.biomechanics_data!.metrics,
          asymmetry: s.biomechanics_data!.asymmetry ? String(s.biomechanics_data!.asymmetry) : null,
        }));
      await generateComparativeReport({ patientName, assessments });
    } finally {
      setIsExporting(false);
    }
  };

  const renderTrend = (val: number | null | undefined) => {
    if (val == null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (val > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    return <TrendingDown className="h-4 w-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-lg border bg-card px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-lg border bg-card px-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "gait", "jump", "posture", "functional"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "all" ? "Todos" : TYPE_META[t].label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || sessions.length < 2}
          className="gap-2 text-xs"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? "Gerando..." : "Relatório Comparativo"}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 rounded-full bg-muted/50">
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-bold text-muted-foreground">Nenhuma análise encontrada</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                As análises biomecânicas aparecerão aqui quando forem realizadas e salvas durante as
                sessões.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asymmetry Chart */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Evolução de Métricas — Linha do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <ReferenceLine
                  y={15}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: "Limiar Risco (15%)", fontSize: 10, fill: "#ef4444" }}
                />
                <Bar
                  dataKey="asymmetry"
                  name="Assimetria (%)"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cadence"
                  name="Cadência"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="jumpHeight"
                  name="Altura Salto (cm)"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session Cards */}
      {!isLoading && sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
            Avaliações ({sessions.length})
          </h3>
          {sessions.map((s, idx) => {
            const bm = s.biomechanics_data;
            if (!bm) return null;
            const meta = TYPE_META[bm.type];
            const Icon = meta.icon;
            const asymmetry = bm.asymmetry;
            const isHighRisk = asymmetry != null && Math.abs(asymmetry) > 15;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-2.5 rounded-xl shrink-0"
                        style={{ backgroundColor: `${meta.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm">{meta.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              parseISO(s.record_date || s.created_at || bm.analyzedAt),
                              "dd 'de' MMMM yyyy",
                              { locale: ptBR },
                            )}
                          </span>
                          {isHighRisk && (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" />
                              Assimetria &gt;15%
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2">
                          {asymmetry != null && (
                            <div className="flex items-center gap-1.5">
                              {renderTrend(asymmetry)}
                              <span className="text-xs font-mono">
                                Assimetria:{" "}
                                <span
                                  className={
                                    isHighRisk
                                      ? "text-red-400 font-bold"
                                      : "text-emerald-400 font-bold"
                                  }
                                >
                                  {Math.abs(asymmetry).toFixed(1)}%
                                </span>
                              </span>
                            </div>
                          )}
                          {bm.metrics &&
                            Object.entries(bm.metrics)
                              .slice(0, 4)
                              .map(([k, v]) => (
                                <span key={k} className="text-xs text-muted-foreground font-mono">
                                  {k}: <span className="text-foreground font-semibold">{v}</span>
                                </span>
                              ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
