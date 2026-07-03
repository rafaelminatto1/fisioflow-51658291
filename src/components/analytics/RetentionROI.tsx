import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

interface BIData {
  revenue: {
    trend: Array<{ month: string; sessions: number; revenue: string }>;
    total_period: number;
    current_month: number;
    trend_pct: number;
  };
  occupancy: { rate: number };
  retention: { rate: number; retained_patients: number; total_active_patients: number };
  roi: {
    cac: number;
    ltv: number;
    payback: number;
    marketing_spend: number;
    new_patients: number;
  };
}

export function RetentionROI({ months = 6 }: { months?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "bi", months],
    queryFn: () => request<{ data: BIData }>(`/api/analytics/bi?months=${months}`),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });

  const trendData = data?.revenue?.trend || [];
  let accRevenue = 0;
  const chartData = trendData.map((t, index) => {
    accRevenue += Number(t.revenue);
    const marketingAccumulated = data?.roi?.marketing_spend
      ? Number(((data.roi.marketing_spend / trendData.length) * (index + 1)).toFixed(2))
      : 0;
    
    // Formatar mês para exibição amigável (ex: "2026-07" -> "Jul/26")
    const parts = t.month.split("-");
    const label = parts.length === 2 ? `${parts[1]}/${parts[0].slice(-2)}` : t.month;

    return {
      name: label,
      "Faturamento Acumulado": accRevenue,
      "Investimento em Marketing": marketingAccumulated,
    };
  });

  const cac = data?.roi?.cac ?? 0;
  const ltv = data?.roi?.ltv ?? 0;
  const payback = data?.roi?.payback ?? 0;

  return (
    <div className="space-y-6">
      {/* Cards de BI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CAC Card */}
        <Card className="border-emerald-100 dark:border-emerald-950 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Custo de Aquisição (CAC)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-600">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(cac)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Investimento de marketing dividido por {data?.roi?.new_patients ?? 0} novos pacientes particulares no período.
            </p>
          </CardContent>
        </Card>

        {/* LTV Card */}
        <Card className="border-blue-100 dark:border-blue-950 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Lifetime Value (LTV)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(ltv)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Retorno financeiro médio gerado por paciente com base no ticket médio e ciclo de sessões.
            </p>
          </CardContent>
        </Card>

        {/* Payback Card */}
        <Card className="border-slate-100 dark:border-slate-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="h-16 w-16 text-slate-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Payback da Clínica
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-200">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : payback > 0 ? (
                `${payback} ${payback === 1 ? "mês" : "meses"}`
              ) : (
                "Imediato"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tempo médio de retenção de paciente necessário para recuperar o investimento de aquisição (CAC).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Trend Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Retorno sobre o Investimento (ROI)</CardTitle>
              <CardDescription className="text-xs">
                Comparativo histórico entre o faturamento acumulado de pacientes particulares e os gastos de marketing.
              </CardDescription>
            </div>
            {ltv > 0 && cac > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                LTV/CAC: {Number((ltv / cac).toFixed(1))}x
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Dados insuficientes no período para gerar o gráfico de ROI.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMarketing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" stroke="rgba(0,0,0,0.4)" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="rgba(0,0,0,0.4)"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), ""]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="Faturamento Acumulado"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="Investimento em Marketing"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMarketing)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
