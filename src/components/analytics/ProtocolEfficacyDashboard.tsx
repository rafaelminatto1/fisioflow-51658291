import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Trophy } from "lucide-react";

interface ProtocolMetric {
  protocol_id: string;
  protocol_name: string;
  total_patients: number;
  avg_sessions_to_goal: number;
}

export function ProtocolEfficacyDashboard() {
  const { data: efficacyRes, isLoading } = useQuery({
    queryKey: ["protocol-efficacy-bi"],
    queryFn: () => request<{ data: ProtocolMetric[] }>("/api/clinic-metrics/protocol-efficacy"),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">Calculando desfechos clínicos...</div>
    );
  }

  const data = efficacyRes?.data || [];

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-2 text-indigo-600 mb-1">
          <Trophy className="h-4 w-4" />
          <CardTitle className="text-lg font-black tracking-tight">
            Velocidade de Recuperação
          </CardTitle>
        </div>
        <CardDescription>
          Média de sessões necessárias para reduzir a dor (VAS ≤ 3) por protocolo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] mb-8">
          <SafeResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                opacity={0.1}
              />
              <XAxis type="number" hide />
              <YAxis
                dataKey="protocol_name"
                type="category"
                axisLine={false}
                tickLine={false}
                fontSize={10}
                width={120}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.02)" }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                }}
              />
              <Bar
                dataKey="avg_sessions_to_goal"
                name="Sessões Médias"
                radius={[0, 6, 6, 0]}
                barSize={20}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.avg_sessions_to_goal < 10 ? "#10b981" : "#6366f1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </SafeResponsiveContainer>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {data.slice(0, 4).map((item) => (
            <div
              key={item.protocol_id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
            >
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">
                {item.protocol_name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {item.avg_sessions_to_goal}
                </span>
                <span className="text-[10px] font-bold text-slate-500">sessões</span>
              </div>
              <p className="text-[9px] text-emerald-600 font-bold mt-1">
                N = {item.total_patients} casos
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
