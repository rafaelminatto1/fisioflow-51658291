import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Map, Building2, TrendingUp, Users, DollarSign, LayoutDashboard, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

interface RegionalMetric {
  clinic_name: string;
  clinic_id: string;
  revenue: number;
  appointments_today: number;
}

export default function EnterpriseDashboard() {
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [auditResult, setAuditResult] = React.useState<string | null>(null);

  const { data: regionalData, isLoading } = useQuery({
    queryKey: ["regional-summary"],
    queryFn: () => request<{ data: RegionalMetric[] }>("/api/enterprise/regional-summary"),
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Consolidando dados das filiais...</div>;
  }

  const clinics = regionalData?.data || [];

  const runRegionalAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await request<{ data: { summary: string } }>("/api/enterprise/regional-audit");
      setAuditResult(res.data.summary);
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <MainLayout title="Dashboard Regional (Enterprise)">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Map className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Regional São Paulo</h1>
              <p className="text-slate-500 font-medium">Gestão centralizada de múltiplas unidades</p>
            </div>
          </div>

          <Button 
            onClick={runRegionalAudit} 
            disabled={isAuditing}
            className="rounded-xl h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 border-none px-6 gap-2"
          >
            {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAuditing ? "Auditando Regional..." : "Auditoria Inteligente (IA)"}
          </Button>
        </div>

        {/* AI Audit Result */}
        {auditResult && (
          <Card className="border-none shadow-premium bg-indigo-50/50 dark:bg-indigo-950/20 animate-in fade-in slide-in-from-top-4 duration-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-black uppercase tracking-widest">Relatório Estratégico Regional</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {auditResult}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Global Regional KPIs */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Faturamento Regional (Mês)</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(clinics.reduce((acc, c) => acc + Number(c.revenue || 0), 0))}
              </h3>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Atendimentos Hoje</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {clinics.reduce((acc, c) => acc + Number(c.appointments_today || 0), 0)} sessões
              </h3>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium bg-white dark:bg-slate-900/50">
            <CardContent className="p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Unidades Ativas</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{clinics.length} clínicas</h3>
            </CardContent>
          </Card>
        </div>

        {/* Units List */}
        <div className="grid gap-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-blue" /> Desempenho por Unidade
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clinics.map((clinic) => (
              <Card key={clinic.clinic_id} className="border-none shadow-premium hover:shadow-xl transition-all group overflow-hidden">
                <div className="h-2 bg-brand-blue w-full opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{clinic.clinic_name}</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Unidade São Paulo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Receita Mensal</span>
                    <span className="font-black text-emerald-600">{formatCurrency(clinic.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Agenda Hoje</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{clinic.appointments_today} slots</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-colors flex items-center justify-center gap-2">
                      <LayoutDashboard className="h-3 w-3" /> Acessar Unidade
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
