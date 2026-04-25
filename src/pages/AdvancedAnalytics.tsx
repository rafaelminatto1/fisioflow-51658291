import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { AppointmentAnalytics } from "@/components/analytics/AppointmentAnalytics";
import { PatientAnalytics } from "@/components/analytics/PatientAnalytics";
import { FinancialAnalytics } from "@/components/analytics/FinancialAnalytics";
import { TeamPerformance } from "@/components/analytics/TeamPerformance";
import { PredictiveAnalytics } from "@/components/analytics/PredictiveAnalytics";
import { AnalyticsFiltersProvider } from "@/contexts/AnalyticsFiltersContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { formatCurrency } from "@/lib/utils";
import { ErrorBoundary } from "react-error-boundary";
import { MainLayout } from "@/components/layout/MainLayout";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-red-100 rounded-xl">
          <Sparkles className="h-6 w-6 text-red-600" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-red-900">Ops! Algo deu errado na análise</h3>
        <p className="text-sm text-red-600 max-w-md mx-auto">
          Não conseguimos carregar os dados desta seção. Isso pode ser um problema temporário de
          conexão.
        </p>
      </div>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        className="border-red-200 text-red-600 hover:bg-red-100"
      >
        Tentar novamente
      </Button>
    </div>
  );
}

const MONTHS_OPTIONS = [3, 6, 12] as const;

interface BIData {
  revenue: { total_period: number; current_month: number; trend_pct: number };
  occupancy: { rate: number };
  retention: {
    rate: number;
    retained_patients: number;
    total_active_patients: number;
  };
  top_therapists: Array<{ name: string; sessions_completed: number }>;
}

function KpiStrip({
  months,
  onMonthsChange,
}: {
  months: number;
  onMonthsChange: (m: number) => void;
}) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["analytics", "bi", months],
    queryFn: () => request<{ data: BIData }>(`/api/analytics/bi?months=${months}`),
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data,
  });

  const kpis = [
    {
      label: "Receita no Período",
      value: isLoading ? "—" : formatCurrency(data?.revenue?.total_period ?? 0),
      sub: isLoading ? "" : `Mês atual: ${formatCurrency(data?.revenue?.current_month ?? 0)}`,
      trend: data?.revenue?.trend_pct,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Taxa de Ocupação",
      value: isLoading ? "—" : `${data?.occupancy?.rate ?? 0}%`,
      sub: "",
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Retenção de Pacientes",
      value: isLoading ? "—" : `${data?.retention?.rate ?? 0}%`,
      sub: isLoading
        ? ""
        : `${data?.retention?.retained_patients ?? 0} / ${data?.retention?.total_active_patients ?? 0}`,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {MONTHS_OPTIONS.map((m) => (
            <Button
              key={m}
              variant={months === m ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs rounded-xl"
              onClick={() => onMonthsChange(m)}
            >
              {m}M
            </Button>
          ))}
          <span className="text-[10px] text-muted-foreground font-medium hidden sm:block">
            período de referência dos KPIs
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-xl"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-background border border-border/50 shadow-sm"
          >
            <div className={`p-2.5 rounded-xl ${kpi.bg} shrink-0`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                {kpi.label}
              </p>
              <div className="flex items-center gap-1.5">
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <span className={`text-lg font-black ${kpi.color}`}>{kpi.value}</span>
                )}
                {kpi.trend !== undefined && !isLoading && (
                  <span
                    className={`flex items-center text-[10px] font-bold ${kpi.trend >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {kpi.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(kpi.trend)}%
                  </span>
                )}
              </div>
              {kpi.sub && <p className="text-[10px] text-muted-foreground truncate">{kpi.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvancedAnalyticsContentInternal() {
  const [biMonths, setBiMonths] = useState<number>(6);

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-primary/20">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Análise <span className="text-primary">& IA</span>
              </h1>
              <Badge className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-medium mt-0.5 max-w-2xl">
              Insights e previsões baseadas em IA para otimizar o desempenho da clínica.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl text-xs font-bold text-primary shrink-0">
          <Sparkles className="h-4 w-4" />
          Powered by Gemini AI
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip months={biMonths} onMonthsChange={setBiMonths} />

      {/* Global Filters */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 to-transparent rounded-[2rem] blur-2xl opacity-50" />
        <AnalyticsFilters />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="patients" className="space-y-6">
        <div className="flex items-center overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          <TabsList className="h-12 inline-flex items-center justify-start p-1.5 bg-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm">
            <TabsTrigger
              value="patients"
              className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
            >
              Pacientes
            </TabsTrigger>
            <TabsTrigger
              value="appointments"
              className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
            >
              Agendamentos
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
            >
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
            >
              Equipe
            </TabsTrigger>
            <TabsTrigger
              value="predictive"
              className="h-9 px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all text-xs font-bold gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Preditivo
            </TabsTrigger>
          </TabsList>
        </div>

        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <TabsContent
            value="patients"
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <PatientAnalytics />
          </TabsContent>

          <TabsContent
            value="appointments"
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <AppointmentAnalytics />
          </TabsContent>

          <TabsContent
            value="financial"
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <FinancialAnalytics />
          </TabsContent>

          <TabsContent
            value="team"
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <TeamPerformance />
          </TabsContent>

          <TabsContent
            value="predictive"
            className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <PredictiveAnalytics />
          </TabsContent>
        </ErrorBoundary>
      </Tabs>
    </div>
  );
}

export function AdvancedAnalyticsContent() {
  return (
    <AnalyticsFiltersProvider>
      <AdvancedAnalyticsContentInternal />
    </AnalyticsFiltersProvider>
  );
}

export function AdvancedAnalytics() {
  return (
    <MainLayout>
      <AdvancedAnalyticsContent />
    </MainLayout>
  );
}

export default AdvancedAnalytics;
