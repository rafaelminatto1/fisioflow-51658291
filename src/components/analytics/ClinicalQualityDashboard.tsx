import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface QualityMetric {
  full_name: string;
  avg_quality: number;
  reviews_count: number;
  total_sessions: number;
}

export function ClinicalQualityDashboard() {
  const { data: qualityRes, isLoading } = useQuery({
    queryKey: ["clinical-quality-bi"],
    queryFn: () => request<{ data: QualityMetric[] }>("/api/clinic-metrics/clinical-quality"),
    staleTime: 1000 * 60 * 60, // 1h
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Auditando qualidade dos prontuários...
      </div>
    );
  }

  const data = (qualityRes?.data || []).map((d) => ({
    ...d,
    score: Number(d.avg_quality),
  }));

  return (
    <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-2 text-indigo-600 mb-1">
          <ShieldCheck className="h-4 w-4" />
          <CardTitle className="text-lg font-black tracking-tight">
            Auditoria de Qualidade SOAP
          </CardTitle>
        </div>
        <CardDescription>
          Qualidade média das evoluções clínicas avaliada via Peer-Review IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Radar Chart de Qualidade */}
          <div className="h-[300px]">
            <SafeResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="full_name" tick={{ fontSize: 10, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar
                  name="Qualidade SOAP"
                  dataKey="score"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.2}
                />
                <Tooltip />
              </RadarChart>
            </SafeResponsiveContainer>
          </div>

          {/* Cards de Resumo */}
          <div className="space-y-4">
            {data.map((prof) => (
              <div
                key={prof.full_name}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {prof.full_name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {prof.reviews_count} revisões realizadas
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span
                      className={`text-xl font-black ${prof.score > 85 ? "text-emerald-500" : "text-amber-500"}`}
                    >
                      {prof.score}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">/100</span>
                  </div>
                  <p className="text-[9px] text-slate-400">Score de Precisão</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-indigo-600 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <strong>Dica de Gestão:</strong> Fisioterapeutas com score abaixo de 70 podem necessitar
            de treinamento no preenchimento de dados objetivos e escalas funcionais para garantir a
            melhor recuperação dos pacientes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
