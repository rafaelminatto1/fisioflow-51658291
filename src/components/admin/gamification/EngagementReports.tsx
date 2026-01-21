import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Progress } from '@/components/shared/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';
import {
  TrendingUp, Users, Target, Flame, Award, Star,
  AlertTriangle, Calendar, CheckCircle2, Download
} from 'lucide-react';
import { useGamificationAdmin } from '@/hooks/useGamificationAdmin';
import { useEngagementData } from '@/hooks/useLeaderboard';
import { exportAtRiskPatientsToCSV } from '@/utils/gamificationExport';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Custom Tooltip
const CustomChartTooltip = React.memo(({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md">
        <p className="text-sm font-medium mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
});

CustomChartTooltip.displayName = 'CustomChartTooltip';

/**
 * EngagementReports Component
 * Displays engagement metrics, charts, and at-risk patients
 */
export const EngagementReports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30);

  const {
    stats,
    statsLoading,
    atRiskPatients,
    atRiskPatientsLoading,
    popularAchievements,
  } = useGamificationAdmin();

  const { data: engagementData, isLoading: engagementLoading } = useEngagementData(timeRange);

  // Calculate completion rate
  const completionRate = stats?.totalPatients > 0
    ? ((stats?.activeLast30Days || 0) / stats.totalPatients) * 100
    : 0;

  // Level distribution
  const levelDistribution = useMemo(() => {
    if (!stats) return [];

    // Simulated distribution - in real scenario, fetch from database
    const distribution = [
      { level: '1-5', count: Math.round((stats?.totalPatients || 0) * 0.35) },
      { level: '6-10', count: Math.round((stats?.totalPatients || 0) * 0.25) },
      { level: '11-15', count: Math.round((stats?.totalPatients || 0) * 0.20) },
      { level: '16-20', count: Math.round((stats?.totalPatients || 0) * 0.12) },
      { level: '21+', count: Math.round((stats?.totalPatients || 0) * 0.08) },
    ];

    return distribution;
  }, [stats]);

  const maxLevelCount = useMemo(() => {
    return Math.max(...levelDistribution.map(d => d.count), 1);
  }, [levelDistribution]);

  // Weekly activity heatmap
  const heatmapData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`);

    return days.map(day => ({
      day,
      hours: hours.map(hour => ({
        hour,
        activity: Math.floor(Math.random() * 10), // In real scenario, calculate from data
      })),
    }));
  }, []);

  const loading = statsLoading || engagementLoading;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Taxa de Engajamento</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">
                    {completionRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats?.activeLast30Days} de {stats?.totalPatients} pacientes ativos
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total XP Distribuído</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-3xl font-black">
                  {stats?.totalXpAwarded?.toLocaleString() || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Conquistas Desbloqueadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-500" />
                <span className="text-3xl font-black">
                  {stats?.achievementsUnlocked || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pacientes em Risco</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${(stats?.atRiskPatients || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                <span className={`text-3xl font-black ${(stats?.atRiskPatients || 0) > 0 ? 'text-warning' : ''}`}>
                  {stats?.atRiskPatients || 0}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:gap-5 md:grid-cols-2">
        {/* Engagement Over Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Engajamento ao Longo do Tempo
              </CardTitle>
              <div className="flex gap-1">
                {[7, 14, 30].map((days) => (
                  <Button
                    key={days}
                    variant={timeRange === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(days as 7 | 14 | 30)}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : engagementData && engagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={engagementData.map(d => ({
                    dia: format(new Date(d.date), 'dd/MM', { locale: ptBR }),
                    xp: d.xpAwarded,
                    quests: d.questsCompleted,
                  }))}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <XAxis
                    dataKey="dia"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={28}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }} />
                  <Line dataKey="xp" name="XP" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line dataKey="quests" name="Missões" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              Distribuição de Níveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton type="card" rows={1} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={levelDistribution}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="level"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }} />
                  <Bar dataKey="count" name="Pacientes" radius={[0, 4, 4, 0]}>
                    {levelDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" opacity={0.6 + (index * 0.1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popular Achievements */}
      {popularAchievements && popularAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Conquistas Mais Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {popularAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {achievement.unlockRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {achievement.unlockedCount} desbloqueada
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At-Risk Patients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Pacientes em Risco
            </CardTitle>
            {atRiskPatients && atRiskPatients.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAtRiskPatientsToCSV(atRiskPatients)}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
          <CardDescription>
            Pacientes sem atividade há mais de 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atRiskPatientsLoading ? (
            <LoadingSkeleton type="list" rows={3} />
          ) : !atRiskPatients || atRiskPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Todos os pacientes estão ativos!
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Nenhum paciente está em risco de churn no momento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRiskPatients.slice(0, 10).map((patient) => (
                <div
                  key={patient.patient_id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-warning/20">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium">{patient.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Nível {patient.level} • {patient.daysInactive} dias sem atividade
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Última atividade</p>
                    <p className="text-sm font-medium">
                      {patient.lastActivity
                        ? format(new Date(patient.lastActivity), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
              ))}
              {atRiskPatients.length > 10 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
                    E mais {atRiskPatients.length - 10} pacientes
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EngagementReports;
