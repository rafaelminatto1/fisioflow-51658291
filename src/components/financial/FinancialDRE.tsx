import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DREReport {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  revenueDetails: Record<string, number>;
  expenseDetails: Record<string, number>;
}

export function FinancialDRE() {
  const { data: dreData, isLoading } = useQuery({
    queryKey: ["financial-dre"],
    queryFn: () => request<{ data: { report: DREReport } }>("/api/financial-analytics/dre"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Gerando demonstrativo financeiro...</div>;
  }

  const report = dreData?.data?.report;
  if (!report) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Resumo Executivo */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Receita Bruta</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(report.grossRevenue)}</h3>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Despesas</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(report.totalExpenses)}</h3>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-premium ${report.netProfit >= 0 ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'}`}>
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Lucro Líquido</p>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black">{formatCurrency(report.netProfit)}</h3>
              <div className="bg-white/20 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                {report.margin.toFixed(1)}% Margem
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de DRE Profissional */}
      <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
          <CardTitle className="text-base font-black uppercase tracking-widest text-slate-400">Demonstrativo do Resultado do Exercício (DRE)</CardTitle>
          <CardDescription>Visão detalhada por categorias de receita e despesa</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Seção Receitas */}
            <div className="px-8 py-4 bg-slate-50/30 dark:bg-slate-800/20">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">1. Receita Operacional Bruta</h4>
                <span className="font-black text-emerald-600">{formatCurrency(report.grossRevenue)}</span>
              </div>
              <div className="space-y-2 pl-4">
                {Object.entries(report.revenueDetails).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-xs text-slate-500">
                    <span>(+) {cat || "Geral"}</span>
                    <span>{formatCurrency(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção Despesas */}
            <div className="px-8 py-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">2. Deduções e Despesas</h4>
                <span className="font-black text-red-600">({formatCurrency(report.totalExpenses)})</span>
              </div>
              <div className="space-y-2 pl-4">
                {Object.entries(report.expenseDetails).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-xs text-slate-500">
                    <span>(-) {cat || "Operacional"}</span>
                    <span>{formatCurrency(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultado Final */}
            <div className="px-8 py-6 bg-slate-900 dark:bg-black text-white">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-lg uppercase tracking-[0.1em]">Resultado Líquido do Período</h4>
                <h4 className={`text-2xl font-black ${report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(report.netProfit)}
                </h4>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
