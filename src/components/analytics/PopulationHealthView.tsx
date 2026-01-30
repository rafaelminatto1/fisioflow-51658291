/**
 * Population Health Analytics View
 *
 * Displays clinic population health metrics, trends, and benchmarks
 * Uses Firebase AI Logic for population analysis
 *
 * @module components/analytics/PopulationHealthView
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
} from 'lucide-react';
import {
  usePopulationHealthAnalysis,
  useTopConditions,
  useTreatmentEffectiveness,
  useRetentionAnalysis,
  useBenchmarks,
  usePopulationHealthChartData,
  usePopulationInsights,
  useRefreshPopulationAnalysis,
  getPeriodLabel,
  formatRetentionRate,
  getRetentionRateColor,
  getSuccessRateColor,
} from '@/hooks/usePopulationHealth';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// TYPES
// ============================================================================

interface PopulationHealthViewProps {
  clinicId?: string;
  defaultPeriod?: '30d' | '90d' | '180d' | '365d';
}

// Type for top conditions
interface ConditionData {
  condition: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Type for treatment effectiveness
interface TreatmentData {
  treatment: string;
  successRate: number;
  sampleSize: number;
  [key: string]: unknown;
}

interface TreatmentEffectivenessData {
  treatments: TreatmentData[];
  averageSuccessRate: number;
  totalSamples: number;
}

// Type for retention data
interface RetentionData {
  overallRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  byCondition: Record<string, number>;
  riskFactors: Array<{
    factor: string;
    impact: number;
  }>;
}

// Type for insights
interface PopulationInsight {
  type: 'opportunity' | 'risk' | 'trend';
  category: string;
  message: string;
  severity?: 'low' | 'medium' | 'high';
  actionable?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Type for population overview
interface PopulationOverview {
  totalPatients: number;
  activePatients: number;
  averageProgress: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  topConditions: Array<{ name: string; count: number }>;
  retentionRate: number;
}

function PopulationOverviewCard({
  overview,
  isLoading,
}: {
  overview?: PopulationOverview;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Panorama da População
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de Pacientes</p>
            <p className="text-2xl font-bold">{overview.totalPatients}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
            <p className="text-2xl font-bold text-green-600">{overview.activePatients}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Novos Pacientes</p>
            <p className="text-2xl font-bold text-blue-600">{overview.newPatients}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Média de Idade</p>
            <p className="text-2xl font-bold">{overview.averageAge} anos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopConditionsCard({
  conditions,
  isLoading,
}: {
  conditions?: ConditionData[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!conditions || conditions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Condições Mais Comuns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Condições Mais Comuns</CardTitle>
        <CardDescription>Baseado em {conditions[0]?.count || 0} pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conditions.slice(0, 10).map((condition, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{index + 1}.</span>
                  <span className="text-sm">{condition.condition}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{condition.count}</span>
                  <Badge
                    variant={
                      condition.trend === 'increasing'
                        ? 'destructive'
                        : condition.trend === 'decreasing'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {condition.trend === 'increasing' ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : condition.trend === 'decreasing' ? (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    ) : (
                      <Minus className="h-3 w-3 mr-1" />
                    )}
                    {condition.trend === 'increasing'
                      ? 'Aumentando'
                      : condition.trend === 'decreasing'
                      ? 'Diminuindo'
                      : 'Estável'}
                  </Badge>
                </div>
              </div>
              <Progress value={condition.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TreatmentEffectivenessCard({
  effectiveness,
  isLoading,
}: {
  effectiveness?: TreatmentEffectivenessData;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!effectiveness) {
    return null;
  }

  const { overallSuccessRate, byTreatmentType, bestPerformingTreatments, areasForImprovement } =
    effectiveness;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Eficácia do Tratamento
        </CardTitle>
        <CardDescription>
          Taxa de sucesso geral:{' '}
          <span className={`font-bold ${getSuccessRateColor(overallSuccessRate)}`}>
            {overallSuccessRate.toFixed(1)}%
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best performing */}
        {bestPerformingTreatments.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Melhores Desempenhos</p>
            <div className="flex flex-wrap gap-2">
              {bestPerformingTreatments.map((treatment: string, index: number) => (
                <Badge key={index} variant="default" className="text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {treatment}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* By treatment type */}
        {byTreatmentType && byTreatmentType.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Por Tipo de Tratamento</p>
            <div className="space-y-3">
              {byTreatmentType
                .filter((t: TreatmentData) => t.sampleSize >= 5)
                .sort((a: TreatmentData, b: TreatmentData) => b.successRate - a.successRate)
                .slice(0, 5)
                .map((treatment, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{treatment.treatment}</span>
                      <span className="font-medium">{treatment.successRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={treatment.successRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {treatment.sampleSize} casos • Satisfação: {treatment.patientSatisfaction.toFixed(0)}/100
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Areas for improvement */}
        {areasForImprovement.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">Áreas para Melhoria</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside">
                {areasForImprovement.map((area: string, index: number) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function RetentionAnalysisCard({
  retention,
  isLoading,
}: {
  retention?: RetentionData;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!retention) {
    return null;
  }

  const {
    overallRetentionRate,
    dropoutRate,
    averageSessionsPerPatient,
    keyDropoutFactors,
    recommendations,
  } = retention;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Análise de Retenção
        </CardTitle>
        <CardDescription>
          Taxa de retenção:{' '}
          <span className={`font-bold ${getRetentionRateColor(overallRetentionRate)}`}>
            {formatRetentionRate(overallRetentionRate)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
            <p className={`text-2xl font-bold ${getRetentionRateColor(overallRetentionRate)}`}>
              {overallRetentionRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Abandono</p>
            <p className="text-2xl font-bold text-red-600">{dropoutRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Média de Sessões</p>
            <p className="text-2xl font-bold">{averageSessionsPerPatient}</p>
          </div>
        </div>

        {/* Key factors */}
        {keyDropoutFactors && keyDropoutFactors.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Principais Fatores de Abandono</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside">
                {keyDropoutFactors.map((factor: string, index: number) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recomendações</p>
            <div className="space-y-2">
              {recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightsCard({
  insights,
  isLoading,
}: {
  insights?: PopulationInsight[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength':
        return <Award className="h-4 w-4 text-green-500" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'concern':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'trend':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Insights e Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.slice(0, 10).map((insight, index: number) => (
            <Alert key={index} variant={insight.impact === 'high' ? 'default' : 'secondary'}>
              {getCategoryIcon(insight.category)}
              <AlertTitle className="text-sm font-medium">{insight.title}</AlertTitle>
              <AlertDescription className="text-sm">{insight.description}</AlertDescription>
              {insight.actionable && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Acionável
                </Badge>
              )}
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PopulationHealthView({
  clinicId = 'default',
  defaultPeriod = '90d',
}: PopulationHealthViewProps) {
  const [period, setPeriod] = useState<'30d' | '90d' | '180d' | '365d'>(defaultPeriod);
  const [activeTab, setActiveTab] = useState('overview');
  const refreshAnalysis = useRefreshPopulationAnalysis();

  const { data: analysis, isLoading, error, refetch } = usePopulationHealthAnalysis({
    clinicId,
    period,
    includeBenchmarks: true,
    enabled: true,
  });

  const { data: topConditions } = useTopConditions({ clinicId, period, enabled: !isLoading });
  const { data: effectiveness } = useTreatmentEffectiveness({ clinicId, period, enabled: !isLoading });
  const { data: retention } = useRetentionAnalysis({ clinicId, period, enabled: !isLoading });
  const { data: insights } = usePopulationInsights({ clinicId, period, enabled: !isLoading });

  const handleRefresh = () => {
    refreshAnalysis.mutate({
      clinicId,
      startDate: new Date(Date.now() - (period === '30d' ? 30 : period === '90d' ? 90 : period === '180d' ? 180 : 365) * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      includeBenchmarks: true,
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar análise</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>Tentar Novamente</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Saúde Populacional</h2>
          <p className="text-muted-foreground">
            Métricas e insights da população da clínica
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(value: '30d' | '90d' | '180d' | '365d') => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="180d">Últimos 6 meses</SelectItem>
              <SelectItem value="365d">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshAnalysis.isPending}
          >
            {refreshAnalysis.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Period Info */}
      {analysis && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle className="text-sm">Período Analisado</AlertTitle>
          <AlertDescription className="text-sm">
            {getPeriodLabel(period)} • {analysis.periodAnalyzed.days} dias •{' '}
            {analysis.dataQuality.totalRecords} registros
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="conditions">Condições</TabsTrigger>
          <TabsTrigger value="effectiveness">Eficácia</TabsTrigger>
          <TabsTrigger value="retention">Retenção</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <PopulationOverviewCard
            overview={analysis?.populationOverview}
            isLoading={isLoading}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <TreatmentEffectivenessCard
              effectiveness={effectiveness?.effectiveness}
              isLoading={isLoading}
            />
            <RetentionAnalysisCard retention={retention?.retention} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4">
          <TopConditionsCard conditions={topConditions?.topConditions} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <TreatmentEffectivenessCard
            effectiveness={effectiveness?.effectiveness}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <RetentionAnalysisCard retention={retention?.retention} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsCard insights={insights?.insights} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PopulationHealthView;
