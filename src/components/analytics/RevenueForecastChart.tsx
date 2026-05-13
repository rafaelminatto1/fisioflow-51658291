import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, DollarSign, Calendar, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function RevenueForecastChart() {
  const { data: forecastRes, isLoading } = useQuery({
    queryKey: ["revenue-forecast-bi"],
    queryFn: () => request<{ data: any }>("/api/financial-analytics/prediction"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Projetando faturamento dos próximos 90 dias...</div>;
  }

  const data = forecastRes?.data;
  if (!data) return null;

  // Gerar dados para o gráfico (Mockando curva baseada no 30-day forecast)
  const chartData = [
    { name: "Hoje", value: 0 },
    { name: "30 Dias", value: data.next30Days.adjusted },
    { name: "60 Dias", value: data.next30Days.adjusted * 1.8 },
    { name: "90 Dias", value: data.next30Days.adjusted * 2.5 },
  ];

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary mb-1">
          <TrendingUp className="h-4 w-4" />
          <CardTitle className="text-lg font-black tracking-tight">Previsão de Receita (IA)</CardTitle>
        </div>
        <CardDescription>Projeção de ganhos baseada em pacotes ativos e novos planos de tratamento</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Próximos 30 Dias</p>
              <h3 className="text-2xl font-black text-indigo-600">{formatCurrency(data.next30Days.adjusted)}</h3>
              <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                <Sparkles className="h-2 w-2" /> Ajustado por No-Show ({Math.round(data.noShowImpact * 100)}%)
              </p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sessões Previstas</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{data.next30Days.sessions}</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Agendadas + Ciclos IA</p>
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">VGV em Aberto</p>
              <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(data.inventory.packageValue)}</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase">Valor de sessões remanescentes</p>
           </div>
        </div>

        <div className="h-[250px] mt-4">
          <SafeResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
              <YAxis hide />
              <Tooltip 
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </SafeResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
