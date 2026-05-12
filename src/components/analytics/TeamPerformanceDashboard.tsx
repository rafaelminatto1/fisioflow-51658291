import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Users, TrendingUp, DollarSign, Clock, UserCheck } from "lucide-react";

interface ProfessionalMetric {
  therapist_id: string;
  full_name: string;
  total_appointments: number;
  completed_count: number;
  no_show_count: number;
  monthly_revenue: number;
}

export function TeamPerformanceDashboard() {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-performance-bi"],
    queryFn: () => request<{ data: ProfessionalMetric[] }>("/api/clinic-metrics/team-performance"),
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Analisando performance da equipe...</div>;
  }

  const data = teamData?.data || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Faturamento por Profissional */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Faturamento por Profissional</CardTitle>
            <CardDescription>Receita gerada no mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <SafeResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="full_name" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="monthly_revenue" name="Receita (R$)" radius={[6, 6, 0, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#4f46e5" : "#6366f1"} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Comparecimento vs No-Show */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">Taxa de Adesão</CardTitle>
            <CardDescription>Comparativo de atendimentos realizados vs faltas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <SafeResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="full_name" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="completed_count" name="Realizados" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="no_show_count" name="Faltas" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </SafeResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Detalhada */}
      <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-black uppercase tracking-widest text-slate-400">Resumo de Produtividade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 font-bold">
                  <th className="px-6 py-4">Profissional</th>
                  <th className="px-6 py-4">Atendimentos</th>
                  <th className="px-6 py-4">Comparecimento</th>
                  <th className="px-6 py-4">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((prof) => {
                  const attendanceRate = prof.total_appointments > 0 
                    ? (prof.completed_count / prof.total_appointments) * 100 
                    : 0;
                    
                  return (
                    <tr key={prof.therapist_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{prof.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{prof.total_appointments} total</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black ${attendanceRate > 85 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {attendanceRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-brand-blue">
                        R$ {prof.monthly_revenue.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
