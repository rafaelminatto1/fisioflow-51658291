import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Calendar, DollarSign, Activity, LayoutDashboard, Sparkles } from 'lucide-react';
import { AppointmentAnalytics } from '@/components/analytics/AppointmentAnalytics';
import { PatientAnalytics } from '@/components/analytics/PatientAnalytics';
import { FinancialAnalytics } from '@/components/analytics/FinancialAnalytics';
import { PredictiveAnalytics } from '@/components/analytics/PredictiveAnalytics';
import { InternalDashboard } from '@/components/analytics/InternalDashboard';
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
import { AnalyticsFiltersProvider } from '@/contexts/AnalyticsFiltersContext';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';

function AdvancedAnalyticsContent() {
  const { summary, isLoading } = useAnalyticsSummary();

  return (
    <div className="px-6 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            Advanced Analytics & IA
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Insights inteligentes e previsões baseadas em inteligência artificial para otimizar o desempenho da sua clínica e antecipar tendências.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" />
          Powered by Gemini AI
        </div>
      </div>

      {/* Filtros Globais */}
      <AnalyticsFilters />

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50 hover:ring-primary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : summary?.totalAppointments || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "..." : `${summary?.appointmentGrowth || 0}%`} vs. período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50 hover:ring-primary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Pacientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : summary?.activePatients || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "..." : `${summary?.patientGrowth || 0}%`} vs. período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50 hover:ring-primary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? "..." : `R$ ${(summary?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isLoading ? "..." : `${summary?.revenueGrowth || 0}%`} vs. período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50 hover:ring-primary/30 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Taxa de Ocupação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${summary?.occupancyRate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capacidade utilizada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Analytics */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Agendamentos</TabsTrigger>
          <TabsTrigger value="patients" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Pacientes</TabsTrigger>
          <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Financeiro</TabsTrigger>
          <TabsTrigger value="predictive" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Sparkles className="h-3 w-3 mr-2" />
            Preditivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <InternalDashboard />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AppointmentAnalytics />
        </TabsContent>

        <TabsContent value="patients" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PatientAnalytics />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <FinancialAnalytics />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PredictiveAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdvancedAnalytics() {
  return (
    <MainLayout fullWidth>
      <AnalyticsFiltersProvider>
        <AdvancedAnalyticsContent />
      </AnalyticsFiltersProvider>
    </MainLayout>
  );
}
