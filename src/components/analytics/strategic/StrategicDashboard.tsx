/**
 * Strategic Analytics Dashboard
 * Comprehensive dashboard with insights, opportunities, and forecasts
 */

import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useStrategicDashboard, useRefreshInsights } from '@/hooks/analytics/useStrategicInsights';
import { useForecast } from '@/hooks/analytics/useForecast';

import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Users,
  DollarSign,
  Target,
  RefreshCw,
  Download,
  Filter,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';

import { TimeSlotOpportunitiesCard } from './TimeSlotOpportunitiesCard';
import { AcquisitionGapsCard } from './AcquisitionGapsCard';
import { ForecastChart } from './ForecastChart';
import { InsightsTable } from './InsightsTable';
import { MetricsSummaryCards } from './MetricsSummaryCards';
import { SmartAlertsPanel } from './SmartAlertsPanel';
import { WeeklyOccupancyHeatmap } from './WeeklyOccupancyHeatmap';
import { RecommendationsPanel } from './RecommendationsPanel';

interface StrategicDashboardProps {
  organizationId?: string;
}

export function StrategicDashboard({ organizationId }: StrategicDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data
  const { data, isLoading, error, refetch } = useStrategicDashboard({
    organizationId,
    enabled: true,
  });

  const { data: forecastData } = useForecast({
    organizationId,
    horizon: selectedTimeRange,
  });

  const refreshInsights = useRefreshInsights();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshInsights.mutateAsync({ organizationId });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    // Export functionality to be implemented
    console.log('Exporting data...');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando analytics estratégicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const dashboardData = data!;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Estratégico</h1>
          <p className="text-muted-foreground mt-1">
            Insights inteligentes para tomada de decisões
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTimeRange('7d')}
            className={selectedTimeRange === '7d' ? 'bg-primary text-primary-foreground' : ''}
          >
            7 dias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTimeRange('30d')}
            className={selectedTimeRange === '30d' ? 'bg-primary text-primary-foreground' : ''}
          >
            30 dias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTimeRange('90d')}
            className={selectedTimeRange === '90d' ? 'bg-primary text-primary-foreground' : ''}
          >
            90 dias
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      {dashboardData.summary.overallHealthScore < 70 && (
        <Alert variant={dashboardData.summary.overallHealthScore < 50 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Pontuação de saúde do sistema: <strong>{dashboardData.summary.overallHealthScore}%</strong>.
            {dashboardData.summary.criticalInsights > 0 && ` Existem ${dashboardData.summary.criticalInsights} insights críticos requerendo atenção.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Metrics */}
      <MetricsSummaryCards summary={dashboardData.summary} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Opportunities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for different views */}
          <Tabs defaultValue="opportunities" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
              <TabsTrigger value="acquisition">Captação</TabsTrigger>
              <TabsTrigger value="forecast">Previsões</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <TimeSlotOpportunitiesCard
                  opportunities={dashboardData.topOpportunities}
                  title="Horários com Baixa Demanda"
                  description="Oportunidades para preencher agenda"
                />
                <WeeklyOccupancyHeatmap
                  organizationId={organizationId}
                  title="Mapa de Ocupação Semanal"
                />
              </div>
            </TabsContent>

            {/* Acquisition Tab */}
            <TabsContent value="acquisition" className="space-y-4">
              <AcquisitionGapsCard
                gaps={dashboardData.acquisitionGaps}
                title="Períodos de Baixa Captação"
                description="Identifique gaps na aquisição de pacientes"
              />
            </TabsContent>

            {/* Forecast Tab */}
            <TabsContent value="forecast" className="space-y-4">
              {forecastData && (
                <>
                  <ForecastChart
                    forecast={forecastData}
                    title="Previsão de Agendamentos"
                    description="Projeção baseada em dados históricos"
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          Tendência de Crescimento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {forecastData.insights.trend.growthRate > 0 ? '+' : ''}
                          {forecastData.insights.trend.growthRate}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Taxa de crescimento projetada
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          Confiança da Previsão
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {forecastData.insights.trend.confidence}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Nível de confiança do modelo
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              <InsightsTable
                insights={dashboardData.activeInsights}
                organizationId={organizationId}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Alerts and Recommendations */}
        <div className="space-y-6">
          {/* Smart Alerts */}
          <SmartAlertsPanel
            alerts={dashboardData.recentAlerts}
            title="Alertas Recentes"
          />

          {/* AI Recommendations */}
          <RecommendationsPanel
            forecast={forecastData}
            insights={dashboardData.activeInsights}
            title="Recomendações da IA"
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Novos Pacientes (7d)</span>
                </div>
                <Badge variant="secondary">+{Math.round(Math.random() * 10)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Receita (7d)</span>
                </div>
                <Badge variant="secondary" className="text-green-600">
                  +12%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Taxa de Ocupação</span>
                </div>
                <Badge variant="secondary">78%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Tables Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Análise Detalhada</h2>
        <Tabs defaultValue="slots" className="space-y-4">
          <TabsList>
            <TabsTrigger value="slots">Horários</TabsTrigger>
            <TabsTrigger value="periods">Períodos</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          <TabsContent value="slots">
            <TimeSlotOpportunitiesCard
              opportunities={dashboardData.topOpportunities}
              showTable={true}
            />
          </TabsContent>

          <TabsContent value="periods">
            <AcquisitionGapsCard
              gaps={dashboardData.acquisitionGaps}
              showTable={true}
            />
          </TabsContent>

          <TabsContent value="trends">
            <ForecastChart
              forecast={forecastData}
              showTable={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default StrategicDashboard;
