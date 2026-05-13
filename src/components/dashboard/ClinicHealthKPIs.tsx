import React from "react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Users, DollarSign, Calendar, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const ClinicHealthKPIs: React.FC = () => {
  const { data: kpiRes, isLoading } = useQuery({
    queryKey: ["clinic-kpis-dashboard"],
    queryFn: () => request<{ data: any }>("/api/clinic-metrics/kpis"),
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  if (isLoading) {
    return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Monitorando saúde da clínica...</div>;
  }

  const kpis = kpiRes?.data;
  if (!kpis) return null;

  const occupancyRate = (kpis.occupancy.booked / kpis.occupancy.capacity) * 100;
  const noShowRate = (kpis.noShow.count / kpis.noShow.total) * 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Ocupação */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Taxa de Ocupação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-baseline justify-between">
                <h3 className="text-2xl font-black">{occupancyRate.toFixed(1)}%</h3>
                <Calendar className="h-4 w-4 text-indigo-500" />
             </div>
             <Progress value={occupancyRate} className="h-1.5" />
             <p className="text-[9px] text-slate-500 font-bold uppercase">{kpis.occupancy.booked} de {kpis.occupancy.capacity} slots</p>
          </CardContent>
        </Card>

        {/* Faturamento */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Receita Mensal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(kpis.financial.totalRevenue)}</h3>
                <DollarSign className="h-4 w-4 text-emerald-500" />
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase">Ticket Médio: {formatCurrency(kpis.financial.avgTicket)}</p>
          </CardContent>
        </Card>

        {/* No-Show */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Faltas (90 dias)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
             <div className="flex items-center justify-between">
                <h3 className={cn("text-2xl font-black", noShowRate > 15 ? "text-red-500" : "text-slate-900 dark:text-white")}>
                  {noShowRate.toFixed(1)}%
                </h3>
                <Users className="h-4 w-4 text-slate-400" />
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase">{kpis.noShow.count} ausências detectadas</p>
          </CardContent>
        </Card>

        {/* LTV */}
        <Card className="border-none shadow-premium bg-indigo-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Ciclo Médio (LTV)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
             <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black">{kpis.clinical.avgSessions.toFixed(1)}</h3>
                <ShieldCheck className="h-4 w-4 text-indigo-300" />
             </div>
             <p className="text-[9px] text-indigo-100 font-bold uppercase">Sessões por paciente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
