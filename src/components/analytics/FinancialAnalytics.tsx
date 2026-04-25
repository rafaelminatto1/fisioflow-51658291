import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, financialApi, type Pagamento } from "@/api/v2";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  format,
  eachMonthOfInterval,
  startOfMonth,
  addMonths,
  subDays,
  differenceInMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";
import { formatCurrency } from "@/lib/utils";
import { Activity, Target } from "lucide-react";

const normalizeMethod = (value?: string | null) => value?.trim() || "Outros";

const MONTHS_OPTIONS = [3, 6, 12] as const;

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  realizado: "#10b981",
  scheduled: "#3b82f6",
  confirmed: "#6366f1",
  cancelled: "#f59e0b",
  cancelado: "#f59e0b",
  no_show: "#ef4444",
};
const STATUS_LABELS: Record<string, string> = {
  completed: "Concluído",
  realizado: "Realizado",
  scheduled: "Agendado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
  no_show: "Falta",
};

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
    therapist_id: string;
    name: string;
    sessions_completed: number;
    no_shows: number;
    revenue: string;
  }>;
  status_breakdown: Array<{ status: string; count: number }>;
}

export function FinancialAnalytics() {
  const { filters } = useAnalyticsFilters();
  const { dateRange, professionalId } = filters;
  const [biMonths, setBiMonths] = useState<number>(6);

  // ── Receita por período (filtro global) ─────────────────────────────────────
  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["financial-revenue-analytics", dateRange, professionalId],
    enabled: !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const monthsDiff = differenceInMonths(dateRange.to, dateRange.from);

      if (monthsDiff >= 2) {
        const intervalMonths = eachMonthOfInterval({
          start: dateRange.from,
          end: dateRange.to,
        });

        return Promise.all(
          intervalMonths.map(async (month) => {
            const monthStart = startOfMonth(month);
            const monthEnd = startOfMonth(addMonths(month, 1));
            const response = await analyticsApi.financial({
              startDate: format(monthStart, "yyyy-MM-dd"),
              endDate: format(subDays(monthEnd, 1), "yyyy-MM-dd"),
              therapistId: professionalId === "all" ? undefined : professionalId,
            });
            return {
              label: format(month, "MMM/yy", { locale: ptBR }),
              receita: Number(response?.data?.totalRevenue ?? 0),
            };
          }),
        );
      }

      const response = await analyticsApi.financial({
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
        therapistId: professionalId === "all" ? undefined : professionalId,
      });
      return [
        {
          label: `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`,
          receita: Number(response?.data?.totalRevenue ?? 0),
        },
      ];
    },
  });

  // ── Métodos de pagamento (filtro global) ────────────────────────────────────
  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ["financial-payment-methods", dateRange, professionalId],
    enabled: !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      const response = await financialApi.pagamentos.list({ limit: 1000 });
      const payments = ((response?.data ?? []) as Pagamento[]).filter((p) => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return d >= dateRange.from! && d <= dateRange.to!;
      });

      const paymentMap = new Map<string, number>();
      payments.forEach((p) => {
        const method = normalizeMethod(p.forma_pagamento);
        paymentMap.set(method, (paymentMap.get(method) ?? 0) + Number(p.valor ?? 0));
      });

      return Array.from(paymentMap.entries())
        .map(([metodo, valor]) => ({ metodo, valor: Number(valor.toFixed(2)) }))
        .sort((a, b) => b.valor - a.valor);
    },
  });

  // ── BI histórico (período fixo 3/6/12 meses) ────────────────────────────────
  const { data: biData, isLoading: isLoadingBi } = useQuery({
    queryKey: ["analytics", "bi", biMonths],
    queryFn: () => request<{ data: BIData }>(`/api/analytics/bi?months=${biMonths}`),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });

  const revenueMonths = (biData?.revenue?.trend ?? []).map((r) => ({
    month: r.month?.slice(5) || "",
    receita: Number(r.revenue || 0),
    sessoes: r.sessions || 0,
  }));

  const pieData = (biData?.status_breakdown ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      {/* ── Receita por período (filtro global) ── */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Receita no Período</CardTitle>
          <CardDescription>Evolução da receita no intervalo selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {isLoadingRevenue ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <SafeResponsiveContainer className="h-full" minHeight={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </SafeResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Métodos de pagamento ── */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
        <CardHeader>
          <CardTitle>Distribuição por Método de Pagamento</CardTitle>
          <CardDescription>Volume financeiro por método no período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {isLoadingMethods ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <SafeResponsiveContainer className="h-full" minHeight={300}>
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="metodo"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Bar
                    dataKey="valor"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </SafeResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Visão Histórica (BI endpoint) ── */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <h3 className="text-base font-bold">Visão Histórica</h3>
          <p className="text-xs text-muted-foreground">
            Tendências de receita e sessões por período
          </p>
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-xl border">
          {MONTHS_OPTIONS.map((m) => (
            <Button
              key={m}
              variant={biMonths === m ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 rounded-lg text-xs"
              onClick={() => setBiMonths(m)}
            >
              {m}M
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Receita & Sessões trend */}
        <Card className="lg:col-span-2 shadow-sm border-none ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Receita por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoadingBi ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <SafeResponsiveContainer className="h-[210px]" minHeight={210}>
                <AreaChart data={revenueMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="biColorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      name === "receita" ? formatCurrency(v) : v,
                      name === "receita" ? "Receita" : "Sessões",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#3b82f6"
                    fill="url(#biColorReceita)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </SafeResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="shadow-sm border-none ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Status das Consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            {isLoadingBi ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <>
                <SafeResponsiveContainer className="h-[160px]" minHeight={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Consultas"]} />
                  </PieChart>
                </SafeResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: d.color }}
                      />
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

      {/* Sessões por mês bar */}
      {!isLoadingBi && revenueMonths.length > 0 && (
        <Card className="shadow-sm border-none ring-1 ring-gray-200/50 dark:ring-gray-800/50">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Sessões por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <SafeResponsiveContainer className="h-[180px]" minHeight={180}>
              <BarChart data={revenueMonths} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, "Sessões"]} />
                <Bar dataKey="sessoes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </SafeResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
