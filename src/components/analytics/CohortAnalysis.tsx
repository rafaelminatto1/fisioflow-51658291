import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CohortData {
  cohort_month: string;
  cohort_size: number;
  month_number: number;
  retained_patients: number;
  retention_rate: number;
}

export function CohortAnalysis() {
  const { data: cohortResponse, isLoading } = useQuery({
    queryKey: ["cohort-analysis"],
    queryFn: () => request<{ data: CohortData[] }>("/api/clinic-metrics/cohorts"),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Gerando análise de cohort...</div>;
  }

  const rawData = cohortResponse?.data || [];
  
  // Transformar dados para o formato de matriz (meses x retenção)
  const cohorts: Record<string, { size: number; months: Record<number, number> }> = {};
  const maxMonths = 6; // Mostrar até 6 meses de retenção

  rawData.forEach((item) => {
    if (!cohorts[item.cohort_month]) {
      cohorts[item.cohort_month] = { size: item.cohort_size, months: {} };
    }
    if (item.month_number <= maxMonths) {
      cohorts[item.cohort_month].months[item.month_number] = item.retention_rate;
    }
  });

  const getHeatmapColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-600 text-white";
    if (rate >= 75) return "bg-emerald-500 text-white";
    if (rate >= 60) return "bg-emerald-400 text-white";
    if (rate >= 45) return "bg-amber-400 text-slate-900";
    if (rate >= 30) return "bg-amber-300 text-slate-900";
    if (rate >= 15) return "bg-red-300 text-slate-900";
    return "bg-red-400 text-white";
  };

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-black tracking-tight">Análise de Cohort (Retenção)</CardTitle>
        <CardDescription>Percentual de pacientes que continuam ativos após o primeiro mês</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4 text-left">Mês de Início</th>
              <th className="px-4 py-4">Qtd</th>
              {[...Array(maxMonths + 1)].map((_, i) => (
                <th key={i} className="px-4 py-4">Mês {i}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(cohorts).map(([month, data]) => (
              <tr key={month}>
                <td className="px-6 py-4 text-left font-bold text-sm text-slate-700 dark:text-slate-200">
                  {format(new Date(month), "MMM yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-4 text-xs font-medium text-slate-500">{data.size}</td>
                {[...Array(maxMonths + 1)].map((_, i) => {
                  const rate = data.months[i];
                  if (rate === undefined) return <td key={i} className="px-4 py-4 bg-slate-50/30 dark:bg-slate-800/10"></td>;
                  return (
                    <td key={i} className={`px-4 py-4 text-xs font-black transition-colors ${getHeatmapColor(rate)}`}>
                      {rate.toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
