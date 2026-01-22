/**
 * Patient Analytics Dashboard
 *
 * Comprehensive dashboard displaying patient progress, predictions,
 * risk scores, lifecycle, and insights.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Progress } from '@/components/shared/ui/progress';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import { usePatientAnalyticsDashboard, useUpdatePatientRiskScore } from '@/hooks/usePatientAnalytics';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  Calendar,
  Award,
  Activity,
  Brain,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  loading = false,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
  };

  if (loading) {
    return <Skeleton className="h-28 w-full" />;
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RiskGaugeProps {
  score: number;
  label?: string;
}

function RiskGauge({ score, label }: RiskGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  const getBgColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={getBgColor(score)}
            strokeWidth="12"
            strokeDasharray={`${(score / 100) * 251.3} 251.3`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-2xl font-bold", getColor(score))}>{score}</span>
        </div>
      </div>
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}

interface LifecycleStageProps {
  stage: string;
  date: string;
  duration?: number;
  isActive?: boolean;
}

function LifecycleStage({ stage, date, duration, isActive = false }: LifecycleStageProps) {
  const stageLabels: Record<string, string> = {
    lead_created: 'Lead',
    first_contact: 'Primeiro Contato',
    first_appointment_scheduled: 'Agendado',
    first_appointment_completed: 'Primeira Sessão',
    treatment_started: 'Iniciado',
    treatment_paused: 'Pausado',
    treatment_resumed: 'Retomado',
    treatment_completed: 'Concluído',
    discharged: 'Alta',
    follow_up_scheduled: 'Acompanhamento',
    reactivation: 'Reativado',
    churned: 'Abandonou',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-3 h-3 rounded-full",
        isActive ? 'bg-primary' : 'bg-muted'
      )} />
      <div className="flex-1">
        <p className="text-sm font-medium">{stageLabels[stage] || stage}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(date), 'dd/MM/yyyy')}
          {duration !== undefined && ` • ${duration} dias`}
        </p>
      </div>
    </div>
  );
}

interface GoalProgressCardProps {
  goal: {
    id: string;
    goal_title: string;
    goal_category: string;
    progress_percentage?: number;
    status: string;
    target_date?: string;
  };
}

function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const statusColors: Record<string, string> = {
    not_started: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    achieved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  const categoryIcons: Record<string, React.ElementType> = {
    pain_reduction: Activity,
    functional_improvement: TrendingUp,
    range_of_motion: Target,
    strength: Award,
    endurance: Clock,
    activities_of_daily_living: CheckCircle2,
    return_to_sport: Award,
    other: Target,
  };

  const Icon = categoryIcons[goal.goal_category] || Target;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{goal.goal_title}</p>
              <Badge variant="outline" className={cn("text-xs", statusColors[goal.status])}>
                {goal.status === 'in_progress' ? 'Em andamento' :
                 goal.status === 'achieved' ? 'Alcançado' :
                 goal.status === 'not_started' ? 'Não iniciado' :
                 goal.status === 'on_hold' ? 'Pausado' : 'Cancelado'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={goal.progress_percentage || 0} className="flex-1 h-2" />
              <span className="text-xs font-medium w-12 text-right">
                {Math.round(goal.progress_percentage || 0)}%
              </span>
            </div>
            {goal.target_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {format(new Date(goal.target_date), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  insight: {
    id: string;
    insight_type: string;
    insight_text: string;
    created_at: string;
  };
  onAcknowledge?: (id: string) => void;
}

function InsightCard({ insight, onAcknowledge }: InsightCardProps) {
  const insightConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    trend_alert: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    milestone_achieved: { icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    risk_detected: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10' },
    recommendation: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    comparison: { icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
    progress_summary: { icon: Info, color: 'text-gray-600', bg: 'bg-gray-500/10' },
  };

  const config = insightConfig[insight.insight_type] || insightConfig.progress_summary;
  const Icon = config.icon;

  return (
    <Card className={cn("border-l-4", insight.insight_type === 'risk_detected' ? 'border-l-red-500' : 'border-l-primary')}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1">
            <p className="text-sm">{insight.insight_text}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(insight.created_at), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          {onAcknowledge && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAcknowledge(insight.id)}
              className="h-8 px-2"
            >
              Confirmar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface PatientAnalyticsDashboardProps {
  patientId: string;
  patientName: string;
}

export function PatientAnalyticsDashboard({ patientId, patientName }: PatientAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data, isLoading, isError, refetch } = usePatientAnalyticsDashboard(patientId);
  const updateRiskScore = useUpdatePatientRiskScore();

  // Memoized chart data for performance - must be before early returns
  const painChartData = useMemo(() =>
    data?.pain_trend?.data_points.map(dp => ({
      date: format(new Date(dp.date), 'dd/MM'),
      fullDate: dp.date,
      dor: dp.normalized_score ?? dp.score,
    })) || [],
    [data?.pain_trend?.data_points]
  );

  const functionChartData = useMemo(() =>
    data?.function_trend?.data_points.map(dp => ({
      date: format(new Date(dp.date), 'dd/MM'),
      fullDate: dp.date,
      função: dp.normalized_score ?? dp.score,
    })) || [],
    [data?.function_trend?.data_points]
  );

  // Combined chart data for tooltip lookup - memoized
  const allChartData = useMemo(() =>
    [...painChartData, ...functionChartData],
    [painChartData, functionChartData]
  );

  // Memoized radar chart data for risk factors
  const radarData = useMemo(() =>
    data?.risk_score ? [
      { factor: 'Risco de Abandono', value: data.risk_score.dropout_risk_score },
      { factor: 'Risco de No-Show', value: data.risk_score.no_show_risk_score },
      { factor: 'Risco de Desfecho', value: data.risk_score.poor_outcome_risk_score },
      {
        factor: 'Adesão',
        value: 100 - (data.risk_score.risk_factors?.attendance_rate
          ? (1 - data.risk_score.risk_factors.attendance_rate) * 100
          : 50)
      },
      { factor: 'Engajamento', value: 70 }, // Placeholder - would come from actual data
    ].map(d => ({ ...d, value: Math.min(100, Math.max(0, d.value)) })) : [],
    [data?.risk_score]
  );

  const handleRefreshRiskScore = async () => {
    await updateRiskScore.mutateAsync(patientId);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Erro ao carregar dados de analytics</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { progress_summary, pain_trend, function_trend, risk_score, predictions, lifecycle, goals, recent_insights } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Paciente</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sessões Realizadas"
          value={progress_summary.total_sessions}
          icon={Calendar}
          variant="default"
        />
        <MetricCard
          title="Redução da Dor"
          value={`${progress_summary.total_pain_reduction > 0 ? '+' : ''}${progress_summary.total_pain_reduction}`}
          subtitle="Níveis de dor (0-10)"
          icon={Activity}
          variant={progress_summary.total_pain_reduction > 0 ? 'success' : 'warning'}
          trend={progress_summary.total_pain_reduction > 0 ? 'down' : 'neutral'}
          trendValue="desde o início"
        />
        <MetricCard
          title="Objetivos Concluídos"
          value={`${progress_summary.goals_achieved}/${progress_summary.goals_achieved + progress_summary.goals_in_progress}`}
          subtitle="metas alcançadas"
          icon={Target}
          variant="default"
        />
        <MetricCard
          title="Progresso Geral"
          value={`${Math.round(progress_summary.overall_progress_percentage || 0)}%`}
          subtitle="média dos objetivos"
          icon={TrendingUp}
          variant={progress_summary.overall_progress_percentage && progress_summary.overall_progress_percentage > 50 ? 'success' : 'default'}
          trend={progress_summary.overall_progress_percentage && progress_summary.overall_progress_percentage > 50 ? 'up' : 'neutral'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="predictions">Predições</TabsTrigger>
          <TabsTrigger value="risks">Riscos</TabsTrigger>
          <TabsTrigger value="goals">Objetivos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Progress Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Clínica</CardTitle>
                <CardDescription>Painel de progresso do paciente</CardDescription>
              </CardHeader>
              <CardContent>
                {painChartData.length > 0 || functionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={painChartData.length > 0 ? painChartData : functionChartData}
                      aria-label="Gráfico de evolução clínica mostrando progresso ao longo do tempo"
                      role="img"
                    >
                      <defs>
                        <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        label={{ value: 'Nível (0-100)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(label) => {
                          const item = allChartData.find(d => d.date === label);
                          return item?.fullDate || label;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={painChartData.length > 0 ? 'dor' : 'função'}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorProgress)"
                        name={painChartData.length > 0 ? 'Nível de Dor' : 'Pontuação Funcional'}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="h-[250px] flex items-center justify-center text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="text-center">
                      <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      <p className="text-sm">Dados insuficientes para gráfico</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lifecycle */}
            <Card>
              <CardHeader>
                <CardTitle>Ciclo de Vida</CardTitle>
                <CardDescription>Jornada do paciente na clínica</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2 pr-4">
                    {!lifecycle || !lifecycle.stage_history || lifecycle.stage_history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum evento de ciclo de vida registrado
                      </p>
                    ) : (
                      lifecycle.stage_history.map((stage, index) => (
                        <LifecycleStage
                          key={index}
                          stage={stage.stage}
                          date={stage.date}
                          duration={stage.duration_days}
                          isActive={index === lifecycle.stage_history.length - 1}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Insights */}
          {recent_insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Insights Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recent_insights.slice(0, 4).map(insight => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pain Trend */}
            {pain_trend && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Evolução da Dor</span>
                    <Badge variant={pain_trend.trend === 'improving' ? 'default' : pain_trend.trend === 'declining' ? 'destructive' : 'secondary'}>
                      {pain_trend.trend === 'improving' ? 'Melhorando' : pain_trend.trend === 'declining' ? 'Piorando' : 'Estável'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {pain_trend.change > 0 ? '+' : ''}{pain_trend.change_percentage}% desde o início
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={pain_trend.data_points}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 'dataMax + 10']} className="text-xs" />
                      <Tooltip
                        labelFormatter={(v) => format(new Date(v as string), 'dd/MM/yyyy')}
                        formatter={(value: number) => [value, 'Nível de Dor']}
                      />
                      <Line
                        type="monotone"
                        dataKey="normalized_score"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 4 }}
                        name="Dor"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Function Trend */}
            {function_trend && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Evolução Funcional</span>
                    <Badge variant={function_trend.trend === 'improving' ? 'default' : function_trend.trend === 'declining' ? 'destructive' : 'secondary'}>
                      {function_trend.trend === 'improving' ? 'Melhorando' : function_trend.trend === 'declining' ? 'Piorando' : 'Estável'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {function_trend.change > 0 ? '+' : ''}{function_trend.change_percentage}% desde o início
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={function_trend.data_points}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        labelFormatter={(v) => format(new Date(v as string), 'dd/MM/yyyy')}
                        formatter={(value: number) => [value, 'Score Funcional']}
                      />
                      <Line
                        type="monotone"
                        dataKey="normalized_score"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="Função"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Probabilidade de Sucesso"
              value={`${Math.round(predictions.success_probability)}%`}
              subtitle="baseado em dados históricos"
              icon={Target}
              variant={predictions.success_probability > 70 ? 'success' : predictions.success_probability > 50 ? 'warning' : 'danger'}
            />
            <MetricCard
              title="Previsão de Abandono"
              value={`${Math.round(predictions.dropout_probability)}%`}
              subtitle="risco de descontinuar tratamento"
              icon={AlertTriangle}
              variant={predictions.dropout_probability < 20 ? 'success' : predictions.dropout_probability < 50 ? 'warning' : 'danger'}
            />
            <MetricCard
              title="Sessões Restantes"
              value={predictions.expected_sessions_remaining ?? '--'}
              subtitle="estimativa para alta"
              icon={Calendar}
              variant="default"
            />
          </div>

          {predictions.predicted_recovery_date && (
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-500/10 rounded-xl">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Previsão de Recuperação
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {format(new Date(predictions.predicted_recovery_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      Confiança da previsão: {Math.round(predictions.predicted_recovery_confidence * 100)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {predictions.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
                <CardDescription>Sugestões baseadas em análise de dados</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {predictions.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          {risk_score ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Overall Risk */}
                <Card>
                  <CardHeader>
                    <CardTitle>Score de Risco Geral</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-8">
                      <RiskGauge score={risk_score.overall_risk_score} label="Risco Geral" />
                      <div className="space-y-3">
                        <div className="text-center">
                          <p className="text-3xl font-bold">
                            {risk_score.risk_level === 'critical' ? 'Crítico' :
                             risk_score.risk_level === 'high' ? 'Alto' :
                             risk_score.risk_level === 'medium' ? 'Médio' : 'Baixo'}
                          </p>
                          <Badge variant={
                            risk_score.risk_level === 'critical' ? 'destructive' :
                            risk_score.risk_level === 'high' ? 'destructive' :
                            risk_score.risk_level === 'medium' ? 'secondary' : 'default'
                          } className="mt-1">
                            {risk_score.risk_level.toUpperCase()}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRefreshRiskScore} className="w-full gap-2">
                          <RefreshCw className={cn("h-3 w-3", updateRiskScore.isPending && "animate-spin")} />
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Radar */}
                <Card>
                  <CardHeader>
                    <CardTitle>Análise de Fatores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Radar
                          name="Risco"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors Detail */}
              <Card>
                <CardHeader>
                  <CardTitle>Fatores de Risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(risk_score.risk_factors || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium">
                          {typeof value === 'number' ? Math.round(value * 100) / 100 : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {risk_score.recommended_actions && risk_score.recommended_actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Ações Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {risk_score.recommended_actions.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum dado de risco disponível</p>
                <Button variant="outline" onClick={handleRefreshRiskScore} className="mt-4 gap-2">
                  <RefreshCw className={cn("h-4 w-4", updateRiskScore.isPending && "animate-spin")} />
                  Calcular Risco
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          {goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map(goal => (
                <GoalProgressCard key={goal.id} goal={goal} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum objetivo definido para este paciente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PatientAnalyticsDashboard;
