import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Activity, Target,
  BarChart3, Award, RefreshCw, Calendar,
} from "lucide-react";
import { request } from "@/api/v2/base";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BIData {
  revenue: {
    trend: Array<{ month: string; sessions: number; revenue: string }>;
    total_period: number;
    current_month: number;
    trend_pct: number;
  };
  occupancy: { rate: number; booked: number; total_slots: number };
  retention: { rate: number; retained_patients: number; total_active_patients: number };
  top_therapists: Array<{
    therapist_id: string; name: string;
    sessions_completed: number; no_shows: number; revenue: string;
  }>;
  status_breakdown: Array<{ status: string; count: number }>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useBIDashboard(months: number) {
  return useQuery({
    queryKey: ["analytics", "bi", months],
    queryFn: () => request<{ data: BIData }>(`/api/analytics/bi?months=${months}`),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, subtitle, icon: Icon, trend, iconBg, loading,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: number; iconBg: string; loading: boolean;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-8 w-32" /></div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
              <p className="text-2xl font-bold truncate">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className="shrink-0">
              <div className={`p-3 rounded-xl ${iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              {trend !== undefined && (
                <div className={`flex items-center justify-end gap-1 mt-1.5 text-[11px] font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend)}%
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981", realizado: "#10b981",
  scheduled: "#3b82f6", confirmed: "#6366f1",
  cancelled: "#f59e0b", cancelado: "#f59e0b",
  no_show: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído", realizado: "Realizado",
  scheduled: "Agendado", confirmed: "Confirmado",
  cancelled: "Cancelado", cancelado: "Cancelado",
  no_show: "Falta",
};

const MONTHS_OPTIONS = [3, 6, 12] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BIDashboardContent() {
  const [months, setMonths] = useState<number>(6);
  const { data, isLoading, refetch, isFetching } = useBIDashboard(months);

  const revenueMonths = (data?.revenue.trend ?? []).map((r) => ({
    month: r.month.slice(5), // MM
    receita: Number(r.revenue),
    sessoes: r.sessions,
  }));

  const pieData = (data?.status_breakdown ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pb-6 no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Dashboard Gerencial</h1>
            <p className="text-xs text-muted-foreground">Indicadores financeiros e operacionais da clínica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border">
            {MONTHS_OPTIONS.map((m) => (
              <Button
                key={m} variant={months === m ? "default" : "ghost"} size="sm"
                className="h-7 px-3 rounded-lg text-xs"
                onClick={() => setMonths(m)}
              >
                {m}M
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Receita no Período" loading={isLoading}
          value={formatCurrency(data?.revenue.total_period ?? 0)}
          subtitle={`Mês atual: ${formatCurrency(data?.revenue.current_month ?? 0)}`}
          icon={DollarSign} iconBg="bg-emerald-100 text-emerald-600"
          trend={data?.revenue.trend_pct}
        />
        <KpiCard
          title="Taxa de Ocupação" loading={isLoading}
          value={`${data?.occupancy.rate ?? 0}%`}
          subtitle={`${data?.occupancy.booked ?? 0} de ${data?.occupancy.total_slots ?? 0} slots`}
          icon={Calendar} iconBg="bg-blue-100 text-blue-600"
        />
        <KpiCard
          title="Retenção de Pacientes" loading={isLoading}
          value={`${data?.retention.rate ?? 0}%`}
          subtitle={`${data?.retention.retained_patients ?? 0} de ${data?.retention.total_active_patients ?? 0} pacientes`}
          icon={Users} iconBg="bg-violet-100 text-violet-600"
        />
        <KpiCard
          title="Top Terapeuta" loading={isLoading}
          value={data?.top_therapists[0]?.name?.split(" ")[0] ?? "—"}
          subtitle={data?.top_therapists[0] ? `${data.top_therapists[0].sessions_completed} sessões` : undefined}
          icon={Award} iconBg="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Receita & Sessões por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={revenueMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip formatter={(v: number, name: string) => [
                    name === "receita" ? formatCurrency(v) : v,
                    name === "receita" ? "Receita" : "Sessões",
                  ]} />
                  <Area type="monotone" dataKey="receita" stroke="#3b82f6" fill="url(#colorReceita)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Status das Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            {isLoading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Consultas"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                      <span className="font-semibold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Therapists */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Top Terapeutas — Últimos 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
          ) : (data?.top_therapists ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
          ) : (
            <div className="space-y-2">
              {(data?.top_therapists ?? []).map((t, i) => (
                <div key={t.therapist_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                  <span className="font-medium text-sm flex-1 truncate">{t.name}</span>
                  <Badge variant="secondary" className="rounded-lg text-xs">{t.sessions_completed} sessões</Badge>
                  {t.no_shows > 0 && (
                    <Badge variant="outline" className="rounded-lg text-xs text-amber-600 border-amber-200">{t.no_shows} faltas</Badge>
                  )}
                  <span className="text-sm font-bold text-emerald-600 shrink-0">{formatCurrency(Number(t.revenue))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions per month bar chart */}
      {!isLoading && revenueMonths.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Sessões por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "Sessões"]} />
                <Bar dataKey="sessoes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
