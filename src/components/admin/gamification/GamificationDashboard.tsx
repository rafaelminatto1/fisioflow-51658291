import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy, Target, Flame, Star, Users, TrendingUp, AlertTriangle,
  Award, Zap, Activity, TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { useGamificationAdmin } from '@/hooks/useGamificationAdmin';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

// Custom Tooltip Component
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

// Animated Card Wrapper
interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const AnimatedCard = React.memo(({ children, delay = 0, className = '' }: AnimatedCardProps) => (
  <div
    className={`animate-fade-in-up ${className}`}
    style={{
      animationDelay: `${delay}ms`,
      animationFillMode: 'both'
    }}
  >
    {children}
  </div>
));

AnimatedCard.displayName = 'AnimatedCard';

/**
 * Gamification Dashboard Component
 * Displays statistics, charts, and alerts for the gamification system
 */
export const GamificationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    stats,
    statsLoading,
    engagementData,
    engagementLoading,
    atRiskPatients,
    popularAchievements,
  } = useGamificationAdmin();

  const loading = statsLoading || engagementLoading;

  // Process engagement data for chart
  const chartData = useMemo(() => {
    if (!engagementData || engagementData.length === 0) return [];

    return engagementData.slice(-7).map(d => ({
      dia: new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
      xp: d.xpAwarded,
      quests: d.questsCompleted,
    }));
  }, [engagementData]);

  const maxWeeklyXp = useMemo(() => {
    return Math.max(...chartData.map(d => d.xp), 1);
  }, [chartData]);

  const maxQuests = useMemo(() => {
    return Math.max(...chartData.map(d => d.quests), 1);
  }, [chartData]);

  // Popular achievements for chart
  const popularAchievementsData = useMemo(() => {
    if (!popularAchievements || popularAchievements.length === 0) return [];

    return popularAchievements.slice(0, 5).map(a => ({
      name: a.title.length > 20 ? a.title.substring(0, 20) + '...' : a.title,
      count: a.unlockedCount,
    }));
  }, [popularAchievements]);

  const maxAchievements = useMemo(() => {
    return Math.max(...popularAchievementsData.map(a => a.count), 1);
  }, [popularAchievementsData]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Main Statistics Cards */}
      {loading ? (
        <LoadingSkeleton type="stats" rows={4} />
      ) : (
        <section aria-label="Métricas principais de gamificação">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            <AnimatedCard delay={0}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Pacientes Ativos</span>
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                      {stats?.totalPatients || 0}
                    </p>
                    <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-success/10 text-success">
                      {stats?.activeLast30Days || 0} ativos
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={50}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">XP Total Distribuído</span>
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                      {stats?.totalXpAwarded?.toLocaleString() || 0}
                    </p>
                    <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                      XP total
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Nível Médio</span>
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                      {stats?.averageLevel?.toFixed(1) || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={150}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Streak Médio</span>
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                      {stats?.averageStreak?.toFixed(1) || 0}
                    </p>
                    <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                      dias
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Secondary Statistics */}
      {!loading && (
        <section aria-label="Métricas secundárias">
          <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
            <AnimatedCard delay={200}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Taxa de Engajamento</span>
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                        {stats?.engagementRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Progress value={stats?.engagementRate || 0} className="h-2.5" />
                      <CardDescription className="text-xs">
                        {stats?.engagementRate >= 70 ? 'Alto engajamento' : stats?.engagementRate >= 40 ? 'Engajamento moderado' : 'Baixo engajamento'}
                      </CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={250}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Conquistas Desbloqueadas</span>
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                    {stats?.achievementsUnlocked || 0}
                  </span>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={300}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Ativos (7 dias)</span>
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                    {stats?.activeLast7Days || 0}
                  </span>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={350}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base font-medium">
                    <span className="text-muted-foreground">Pacientes em Risco</span>
                    <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 ${(stats?.atRiskPatients || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${(stats?.atRiskPatients || 0) > 0 ? 'text-warning' : ''}`}>
                      {stats?.atRiskPatients || 0}
                    </span>
                    {(stats?.atRiskPatients || 0) > 0 && (
                      <Badge variant="secondary" className="text-xs sm:text-sm font-medium bg-warning/10 text-warning">
                        Atenção
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Charts */}
      {!loading && (
        <section aria-label="Gráficos de engajamento">
          <div className="grid gap-4 md:gap-5 md:grid-cols-2">
            {/* Weekly Engagement Trend */}
            <AnimatedCard delay={400}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-medium">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    Tendência de Engajamento (7 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  {chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">
                        Sem dados para exibir
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Os dados de engajamento aparecerão após a primeira atividade
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <XAxis
                          dataKey="dia"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          interval={0}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          width={28}
                        />
                        <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }} />
                        <Bar dataKey="xp" name="XP Distribuído" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, index) => (
                            <Cell key={`xp-${index}`} fill="hsl(var(--primary))" opacity={0.7} />
                          ))}
                        </Bar>
                        <Bar dataKey="quests" name="Missões" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, index) => (
                            <Cell key={`quest-${index}`} fill="hsl(var(--success))" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Popular Achievements */}
            <AnimatedCard delay={450}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                  <CardTitle className="flex items-center gap-2.5 sm:gap-3 text-base sm:text-lg font-medium">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    </div>
                    Conquistas Mais Populares
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                  {popularAchievementsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Award className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">
                        Nenhuma conquista desbloqueada
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        As conquistas aparecerão aqui quando os pacientes começarem a desbloqueá-las
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {popularAchievementsData.map((achievement, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate pr-2" title={achievement.name}>
                              {achievement.name}
                            </span>
                            <span className="text-sm font-bold text-primary">
                              {achievement.count}
                            </span>
                          </div>
                          <Progress
                            value={(achievement.count / maxAchievements) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Alerts Section */}
      {!loading && (stats?.atRiskPatients || 0) > 0 && (
        <section aria-label="Alertas de pacientes em risco">
          <AnimatedCard delay={500}>
            <Card className="rounded-xl border border-warning/20 bg-warning/5">
              <CardHeader className="pb-3 px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
                <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-medium text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Pacientes em Risco
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Pacientes sem atividade há mais de 7 dias
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {stats?.atRiskPatients} {stats?.atRiskPatients === 1 ? 'paciente' : 'pacientes'} sem atividade recente
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Considere entrar em contato para reengajá-los
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => navigate('/admin/gamification?tab=ranking')}
                  >
                    Ver Ranking Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </section>
      )}
    </div>
  );
};

export default GamificationDashboard;
