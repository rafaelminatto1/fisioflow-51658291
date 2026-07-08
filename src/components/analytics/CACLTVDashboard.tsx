import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Crown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CACLTVData {
  periodo_meses: number;
  cac: { valor: number; novos_pacientes: number; custo_marketing: number; nota: string | null };
  ltv: { medio: number; mediana: number; maximo: number; minimo: number; total_pacientes: number };
  ticket_medio: number;
  receita_total_periodo: number;
  total_transacoes: number;
  payback: { sessoes: number | null; valor_estimado: number | null };
  ltv_cac: { ratio: number | null; status: "excellent" | "healthy" | "warning" | "critical" | "unknown"; meta: string };
  cohorts: Array<{ cohort_mes: string; pacientes_no_cohort: number; receita_total_cohort: number; ltv_cohort: number }>;
  top_pacientes: Array<{ id: string; full_name: string; photo_url: string | null; receita_total: number; num_transacoes: number }>;
}

const STATUS_CONFIG = {
  excellent: { label: "Excelente", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", Icon: Crown },
  healthy: { label: "Saudável", color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20", Icon: CheckCircle2 },
  warning: { label: "Atenção", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", Icon: AlertTriangle },
  critical: { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", Icon: AlertTriangle },
  unknown: { label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border/30", Icon: Target },
};

const PERIOD_OPTIONS = [3, 6, 12] as const;

function KpiCard({ label, value, sub, Icon, delay = 0 }: { label: string; value: string; sub?: string; Icon: React.ElementType; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="premium-glass border-border/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground truncate">{label}</p>
              <p className="text-2xl font-black text-foreground font-display">{value}</p>
              {sub && <p className="text-xs text-muted-foreground font-medium truncate">{sub}</p>}
            </div>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CACLTVDashboard() {
  const [months, setMonths] = useState<3 | 6 | 12>(3);
  const { data: res, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cac-ltv-dashboard", months],
    queryFn: () => request<{ data: CACLTVData }>(`/api/clinic-metrics/cac-ltv?months=${months}`),
    staleTime: 1000 * 60 * 10,
  });

  const d = res?.data;
  const ltvRatio = d?.ltv_cac?.ratio;
  const status = d?.ltv_cac?.status ?? "unknown";
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Gestão de Crescimento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">CAC · LTV · Payback · Cohort Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-secondary/30 p-1 rounded-xl border border-border/50">
            {PERIOD_OPTIONS.map((m) => (
              <Button key={m} size="sm" variant={months === m ? "default" : "ghost"} onClick={() => setMonths(m)} className="h-7 px-3 rounded-lg text-xs font-black uppercase tracking-wide">
                {m}m
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-8 w-8 p-0 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className={`premium-glass rounded-3xl p-6 border ${cfg.border} flex flex-col sm:flex-row items-center gap-6`}>
          <div className={`h-16 w-16 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <cfg.Icon className={`h-8 w-8 ${cfg.color}`} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <span className={`text-4xl font-black font-display ${cfg.color}`}>{ltvRatio !== null ? `${ltvRatio}:1` : "—"}</span>
              <Badge variant="outline" className={`${cfg.bg} ${cfg.color} ${cfg.border} border font-black text-xs gap-1.5 px-3 py-1`}>
                <cfg.Icon className="h-3 w-3" /> {cfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Razão LTV:CAC — {d?.ltv_cac?.meta ?? "Saudável se ≥ 3:1 | Excelente se ≥ 10:1"}</p>
            {d?.cac.nota && <p className="text-xs text-amber-500 mt-1 font-medium">ℹ️ {d.cac.nota}</p>}
          </div>
          <div className="text-center sm:text-right shrink-0">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Período</p>
            <p className="text-xl font-black font-display text-foreground">{months} meses</p>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="CAC" value={d?.cac.valor ? formatCurrency(d.cac.valor) : "—"} sub={`${d?.cac.novos_pacientes ?? 0} novos pacientes`} Icon={Users} delay={0.05} />
          <KpiCard label="LTV Médio" value={d?.ltv.medio ? formatCurrency(d.ltv.medio) : "—"} sub={`${d?.ltv.total_pacientes ?? 0} pacientes com receita`} Icon={TrendingUp} delay={0.1} />
          <KpiCard label="Ticket Médio" value={d?.ticket_medio ? formatCurrency(d.ticket_medio) : "—"} sub={`${d?.total_transacoes ?? 0} transações`} Icon={DollarSign} delay={0.15} />
          <KpiCard label="Payback" value={d?.payback.sessoes ? `${d.payback.sessoes} sessões` : "—"} sub={d?.payback.valor_estimado ? `≈ ${formatCurrency(d.payback.valor_estimado)}` : "Registre custos de marketing"} Icon={Target} delay={0.2} />
        </div>
      )}

      {!isLoading && d?.cohorts && d.cohorts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
          <Card className="premium-glass border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">LTV por Cohort de Entrada</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d.cohorts} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="cohort_mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "LTV Cohort"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                  <Bar dataKey="ltv_cohort" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!isLoading && d?.top_pacientes && d.top_pacientes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="premium-glass border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Top 10 Pacientes por Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {d.top_pacientes.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <span className="text-xs font-black text-muted-foreground w-5 text-right shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.num_transacoes} sessões</p>
                    </div>
                    <span className="text-sm font-black text-primary shrink-0">{formatCurrency(p.receita_total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!isLoading && !d && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum dado disponível</p>
          <p className="text-xs mt-1">Registre transações financeiras para ver as métricas</p>
        </div>
      )}
    </div>
  );
}
