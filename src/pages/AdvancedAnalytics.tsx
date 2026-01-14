import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Calendar, DollarSign, Activity, LayoutDashboard } from "lucide-react";
import { AppointmentAnalytics } from "@/components/analytics/AppointmentAnalytics";
import { PatientAnalytics } from "@/components/analytics/PatientAnalytics";
import { FinancialAnalytics } from "@/components/analytics/FinancialAnalytics";
import { PredictiveAnalytics } from "@/components/analytics/PredictiveAnalytics";
import { InternalDashboard } from "@/components/analytics/InternalDashboard";
import { useAnalyticsSummary } from "@/hooks/useAnalyticsSummary";

export default function AdvancedAnalytics() {
  const { summary, isLoading } = useAnalyticsSummary();

  return (
    <MainLayout fullWidth>
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
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
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
                {isLoading ? "..." : `${summary?.appointmentGrowth || 0}%`} vs. mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
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
                {isLoading ? "..." : `${summary?.patientGrowth || 0}%`} vs. mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `R$ ${(summary?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? "..." : `${summary?.revenueGrowth || 0}%`} vs. mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
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
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="predictive">Preditivo</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <InternalDashboard />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <AppointmentAnalytics />
          </TabsContent>

          <TabsContent value="patients" className="space-y-4">
            <PatientAnalytics />
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <FinancialAnalytics />
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <PredictiveAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
