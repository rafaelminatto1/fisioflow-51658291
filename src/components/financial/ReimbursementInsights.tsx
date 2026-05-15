import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReimbursementPattern {
  insurance_name: string;
  procedure: string;
  avg_reimbursement: number;
  volume: number;
  last_payment: string;
}

interface AIInsights {
  analysis: string;
  suggestions: string[];
  topPerformers: string[];
}

export function ReimbursementInsights() {
  const { data: insightsRes, isLoading } = useQuery({
    queryKey: ["reimbursement-patterns"],
    queryFn: () =>
      request<{ data: { patterns: ReimbursementPattern[]; aiInsights: AIInsights } }>(
        "/api/financial-analytics/reimbursement-patterns",
      ),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Analisando padrões de reembolso em SP...
      </div>
    );
  }

  const data = insightsRes?.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      <Card className="border-none shadow-premium bg-gradient-to-br from-brand-blue to-indigo-700 text-white overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-200" />
            <CardTitle className="text-sm font-black uppercase tracking-widest">
              Consultoria IA: Faturamento Mooca
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed font-medium text-blue-50">
            {data.aiInsights.analysis}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.aiInsights.suggestions.map((s, i) => (
              <div key={i} className="flex gap-2 p-3 rounded-xl bg-white/10 border border-white/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                <p className="text-[11px] font-bold text-white leading-tight">{s}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {data.patterns.slice(0, 3).map((p, i) => (
          <Card key={i} className="border-none shadow-sm bg-white dark:bg-slate-900/50">
            <CardContent className="p-4">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">
                {p.insurance_name}
              </p>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                {p.procedure || "Sessão Fisioterapia"}
              </h4>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-indigo-600">
                  {formatCurrency(p.avg_reimbursement)}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">médio</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Table */}
      <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-lg font-black tracking-tight">Métricas por Convênio</CardTitle>
          <CardDescription>
            Otimize sua agenda priorizando os convênios com melhor margem
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Convênio</th>
                <th className="px-6 py-4 text-center">Volume</th>
                <th className="px-6 py-4 text-right">Média Reembolso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.patterns.map((p, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{p.insurance_name}</p>
                    <p className="text-[10px] text-slate-500">{p.procedure}</p>
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-500">
                    {p.volume} guias
                  </td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">
                    {formatCurrency(p.avg_reimbursement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
