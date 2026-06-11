import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Brain, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface ClinicalROI {
  protocolName: string;
  painReductionAvg: number;
  functionalImprovementAvg: number;
  avgLtv: number;
  patientCount: number;
}

interface PopulationHealth {
  successRate: number;
  avgSatisfaction: number;
  churnRiskCount: number;
  roiData: ClinicalROI[];
}

export function ClinicalValueDashboard() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["clinical-value-bi"],
    queryFn: () => request<{ data: PopulationHealth }>("/api/analytics/population-health-bi"),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  if (isLoading) {
    return <div className="h-96 flex items-center justify-center">Calculando ROI Clínico...</div>;
  }

  const roiData = healthData?.data?.roiData || [
    {
      protocolName: "Ortopedia",
      painReductionAvg: 65,
      functionalImprovementAvg: 70,
      avgLtv: 2400,
      patientCount: 45,
    },
    {
      protocolName: "Pilates",
      painReductionAvg: 40,
      functionalImprovementAvg: 85,
      avgLtv: 3800,
      patientCount: 32,
    },
    {
      protocolName: "Neurologia",
      painReductionAvg: 30,
      functionalImprovementAvg: 50,
      avgLtv: 5200,
      patientCount: 12,
    },
    {
      protocolName: "Postura",
      painReductionAvg: 55,
      functionalImprovementAvg: 60,
      avgLtv: 1800,
      patientCount: 20,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Level KPIs ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Taxa de Sucesso"
          value={`${healthData?.data?.successRate || 78}%`}
          sub="Melhora clínica significativa"
          icon={TrendingUp}
          color="text-emerald-500"
        />
        <KPICard
          title="Satisfação (NPS)"
          value={healthData?.data?.avgSatisfaction || 9.2}
          sub="Média de 0-10"
          icon={Brain}
          color="text-emerald-500"
        />
        <KPICard
          title="Risco de Churn"
          value={healthData?.data?.churnRiskCount || 4}
          sub="Pacientes com baixa adesão"
          icon={AlertTriangle}
          color="text-amber-500"
        />
        <KPICard
          title="Total Analisado"
          value="129"
          sub="Pacientes na Mooca"
          icon={Users}
          color="text-blue-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Matriz de Eficiência: Dor vs LTV ── */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">
              Matriz de Eficiência Clínica
            </CardTitle>
            <CardDescription>
              Correlação entre Redução de Dor (%) e Valor Financeiro (LTV)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <SafeResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="painReductionAvg"
                    name="Redução de Dor"
                    unit="%"
                    label={{
                      value: "Melhora Clínica (%)",
                      position: "bottom",
                      offset: 0,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="avgLtv"
                    name="LTV"
                    unit="R$"
                    label={{
                      value: "Valor (LTV)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 10,
                    }}
                  />
                  <ZAxis
                    type="number"
                    dataKey="patientCount"
                    range={[100, 1000]}
                    name="Pacientes"
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Protocolos" data={roiData} fill="#3b82f6">
                    {roiData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColorByLTV(entry.avgLtv)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </SafeResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> Low LTV
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Mid LTV
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> High LTV
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Melhora Funcional por Protocolo ── */}
        <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight">
              Performance por Especialidade
            </CardTitle>
            <CardDescription>Média de melhora funcional detectada pelo AI Studio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <SafeResponsiveContainer>
                <BarChart data={roiData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="protocolName"
                    axisLine={false}
                    tickLine={false}
                    fontSize={11}
                    width={80}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="functionalImprovementAvg"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    name="Melhora Funcional (%)"
                    barSize={20}
                  />
                </BarChart>
              </SafeResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="border-none shadow-sm bg-card">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {title}
            </p>
            <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
            <p className="mt-1 text-[10px] text-slate-500">{sub}</p>
          </div>
          <div
            className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${color.replace("text-", "text-opacity-70")}`}
          >
            <Icon size={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getColorByLTV(ltv: number) {
  if (ltv < 2000) return "#60a5fa"; // blue-400
  if (ltv < 4000) return "#6366f1"; // indigo-500
  return "#9333ea"; // emerald-600
}
