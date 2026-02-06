import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {

  Trophy, Flame, Star, Users, TrendingUp, AlertTriangle,
  Award, Activity, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps, AreaChart, Area } from 'recharts';
import { useGamificationAdmin } from '@/hooks/useGamificationAdmin';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';

// Custom Tooltip Component
const CustomChartTooltip = React.memo(({ active, payload, label }: TooltipProps<unknown, unknown>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-md animate-in fade-in-0 zoom-in-95 duration-200">
        <p className="text-sm font-medium mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: unknown, index: number) => (
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
  const [period, setPeriod] = useState<string>("30");
  
  const {
    stats,
    statsLoading,
    engagementData,
    engagementLoading,
    _atRiskPatients,
    popularAchievements,
  } = useGamificationAdmin(parseInt(period));

  const loading = statsLoading || engagementLoading;

  // Process engagement data for chart
  const chartData = useMemo(() => {
    if (!engagementData || engagementData.length === 0) return [];

    // Filter/Slice based on period for smoother rendering if too many points
    const dataToDisplay = engagementData; 

    return dataToDisplay.map(d => ({
      dia: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDate: new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
      xp: d.xpAwarded,
      quests: d.questsCompleted,
    }));
  }, [engagementData]);

  // Popular achievements for chart
  const popularAchievementsData = useMemo(() => {
    if (!popularAchievements || popularAchievements.length === 0) return [];

    return popularAchievements.slice(0, 5).map(a => ({
      name: a.title.length > 25 ? a.title.substring(0, 25) + '...' : a.title,
      fullName: a.title,
      count: a.unlockedCount,
    }));
  }, [popularAchievements]);

  const maxAchievements = useMemo(() => {
    return Math.max(...popularAchievementsData.map(a => a.count), 1);
  }, [popularAchievementsData]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-sm text-muted-foreground">Métricas de engajamento e performance.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Statistics Cards */}
      {loading ? (
        <LoadingSkeleton type="stats" rows={4} />
      ) : (
        <section aria-label="Métricas principais de gamificação">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <AnimatedCard delay={0}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    Pacientes Ativos
                    <Users className="h-4 w-4 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats?.activeLast30Days || 0}</span>
                    <span className="text-xs text-muted-foreground">de {stats?.totalPatients || 0}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Taxa de engajamento: <span className="font-medium text-primary">{stats?.engagementRate?.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={50}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    XP Distribuído
                    <Star className="h-4 w-4 text-yellow-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats?.totalXpAwarded?.toLocaleString() || 0}</span>
                    <span className="text-xs text-muted-foreground">pontos</span>
                  </div>
                  <Progress value={75} className="h-1 mt-3 bg-yellow-500/20 [&>div]:bg-yellow-500" />
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={100}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-orange-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    Nível Médio
                    <Trophy className="h-4 w-4 text-orange-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats?.averageLevel?.toFixed(1) || 0}</span>
                    <span className="text-xs text-muted-foreground">nível</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>Crescimento constante</span>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            <AnimatedCard delay={150}>
              <Card className="rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    Streak Médio
                    <Flame className="h-4 w-4 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats?.averageStreak?.toFixed(1) || 0}</span>
                    <span className="text-xs text-muted-foreground">dias</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Consistência dos pacientes
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
          <div className="grid gap-4 md:gap-5 md:grid-cols-3">
            {/* Engagement Trend */}
            <AnimatedCard delay={200} className="md:col-span-2">
              <Card className="rounded-xl border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Atividade Recente
                  </CardTitle>
                  <CardDescription>
                    XP ganho e missões completadas nos últimos {period} dias
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="dia" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        minTickGap={30}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}`} 
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="xp" 
                        name="XP Ganho"
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorXp)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="quests" 
                        name="Missões"
                        stroke="hsl(var(--success))" 
                        fill="transparent" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Popular Achievements */}
            <AnimatedCard delay={300}>
              <Card className="rounded-xl border border-border/50 shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4 text-yellow-500" />
                    Top Conquistas
                  </CardTitle>
                  <CardDescription>
                    As conquistas mais desbloqueadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {popularAchievementsData.map((achievement, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate" title={achievement.fullName}>
                            {achievement.name}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {achievement.count}
                          </span>
                        </div>
                        <Progress
                          value={(achievement.count / maxAchievements) * 100}
                          className={cn(
                            "h-2",
                            index === 0 && "[&>div]:bg-yellow-500",
                            index === 1 && "[&>div]:bg-gray-400",
                            index === 2 && "[&>div]:bg-orange-600",
                            index > 2 && "[&>div]:bg-primary/50"
                          )}
                        />
                      </div>
                    ))}
                    {popularAchievementsData.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        Nenhuma conquista registrada ainda.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </div>
        </section>
      )}

      {/* Alerts Section */}
      {!loading && (stats?.atRiskPatients || 0) > 0 && (
        <section aria-label="Alertas de pacientes em risco">
          <AnimatedCard delay={400}>
            <Card className="rounded-xl border-l-4 border-l-warning bg-warning/5 border-t border-r border-b border-warning/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-warning/20 rounded-full text-warning shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Atenção Necessária</h4>
                    <p className="text-sm text-muted-foreground">
                      {stats?.atRiskPatients} pacientes não interagem com a plataforma há mais de 7 dias.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-warning/30 text-warning hover:bg-warning/10 hover:text-warning-foreground"
                  onClick={() => navigate('/admin/gamification?tab=ranking')}
                >
                  Ver Lista
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </section>
      )}
    </div>
  );
};

export default GamificationDashboard;
