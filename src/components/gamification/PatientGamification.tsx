import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Star,
  Flame,
  Target,
  Award,
  TrendingUp,
  Zap,
  Plus,
  Loader2,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGamification, type Achievement } from '@/hooks/useGamification';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import * as Icons from 'lucide-react';
import { JourneyMap } from './JourneyMap';
import { DailyQuests } from './DailyQuests';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PatientGamificationProps {
  patientId: string;
}

export function PatientGamification({ patientId }: PatientGamificationProps) {
  const {
    profile,
    allAchievements,
    unlockedAchievements,
    isLoading,
    xpProgress,
    xpPerLevel,
    currentLevel,
    currentXp,
    awardXp,
    recentTransactions,
    dailyQuests,
    completeQuest,
    totalSessions
  } = useGamification(patientId);

  const [isGivingXp, setIsGivingXp] = useState(false);

  // Helper to dynamically get icon component
  const getIcon = (iconName: string, defaultIcon: React.ComponentType) => {
    // @ts-expect-error - dynamic icon access from Icons
    const IconComponent = Icons[iconName] || defaultIcon;
    return IconComponent;
  };

  const handleManualAward = async () => {
    setIsGivingXp(true);
    try {
      await awardXp.mutateAsync({
        amount: 50,
        reason: 'manual_award',
        description: 'Recompensa manual do terapeuta'
      });
    } catch {
      // Toast handled in hook
    } finally {
      setIsGivingXp(false);
    }
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const unlocked = unlockedAchievements.find(ua => ua.achievement_id === achievement.id);
    const Icon = getIcon(achievement.icon, Star);

    return (
      <Card
        key={achievement.id}
        className={cn(
          "transition-all duration-300 hover:scale-[1.02]",
          unlocked
            ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md"
            : "border-border/60 bg-muted/20 opacity-80"
        )}
      >
        <CardContent className="p-4 flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl shadow-sm transition-colors",
            unlocked
              ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-1 ring-primary/20"
              : "bg-muted text-muted-foreground grayscale"
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className={cn("font-semibold", !unlocked && "text-muted-foreground")}>
                {achievement.title}
              </h4>
              {unlocked ? (
                <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-green-500/20 text-[10px] px-2">
                  Completo
                </Badge>
              ) : (
                <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3 mr-1" />
                  {achievement.xp_reward} XP
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-snug">
              {achievement.description}
            </p>
            {unlocked && (
              <p className="text-[10px] text-muted-foreground pt-1 flex items-center">
                <Icons.CheckCheck className="h-3 w-3 mr-1 text-primary" />
                Desbloqueado {unlocked.unlocked_at && formatDistanceToNow(new Date(unlocked.unlocked_at), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Level and Progress Card */}
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-primary/5 via-background to-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <CardHeader>
          <CardTitle className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur opacity-40 animate-pulse" />
                <div className="p-4 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-800/20 rounded-full border border-yellow-200 dark:border-yellow-700/50 shadow-inner relative">
                  <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-background">
                  {currentLevel}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                    Nível {currentLevel}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {currentLevel < 5 ? 'Iniciante' : currentLevel < 10 ? 'Intermediário' : 'Especialista'} em Reabilitação
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-primary/20">
                Total: {profile?.total_points || 0} pts
              </Badge>
              {/* Only show manual award for therapists - assuming parent controls visibility or we check role here. 
                  For now, we just show it as a feature. */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-8 text-xs border-dashed border-primary/40 hover:border-primary/60 hover:bg-primary/5"
                onClick={handleManualAward}
                disabled={isGivingXp}
              >
                {isGivingXp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Dar 50 XP
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Progresso Nível {currentLevel + 1}</span>
              <span>{Math.round(currentXp)} / {xpPerLevel} XP</span>
            </div>
            <div className="h-4 w-full bg-secondary/50 rounded-full overflow-hidden p-1 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out shadow-sm relative group"
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground pt-1">
              Faltam <span className="font-bold text-primary">{Math.max(0, xpPerLevel - currentXp)} XP</span> para o próximo nível
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-orange-100 dark:bg-orange-900/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{profile?.current_streak || 0}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Dias Seguidos</p>
            </div>
            <div className="text-center p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 dark:bg-blue-900/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{unlockedAchievements.length}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Conquistas</p>
            </div>
            <div className="text-center p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-100 dark:bg-green-900/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{Math.floor((profile?.total_points || 0) / 100)}%</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Engajamento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Quests Section */}
      <div className="h-[400px]">
        <DailyQuests
          quests={dailyQuests}
          onComplete={(id) => completeQuest.mutate({ questId: id })}
        />
      </div>

      {/* Journey Map Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 px-1">
          <Icons.Map className="h-5 w-5 text-primary" />
          Sua Jornada
        </h3>
        <JourneyMap totalSessions={totalSessions} currentLevel={currentLevel} />
      </div>

      {/* Achievements Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 px-1">
          <Award className="h-5 w-5 text-primary" />
          Conquistas
        </h3>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="all" className="rounded-full px-4 text-xs sm:text-sm">Todas</TabsTrigger>
            <TabsTrigger value="streak" className="rounded-full px-4 text-xs sm:text-sm">Consistência</TabsTrigger>
            <TabsTrigger value="milestone" className="rounded-full px-4 text-xs sm:text-sm">Marcos</TabsTrigger>
            <TabsTrigger value="timing" className="rounded-full px-4 text-xs sm:text-sm">Horários</TabsTrigger>
            <TabsTrigger value="recovery" className="rounded-full px-4 text-xs sm:text-sm">Saúde</TabsTrigger>
            <TabsTrigger value="level" className="rounded-full px-4 text-xs sm:text-sm">Níveis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAchievements.map(renderAchievementCard)}
              {allAchievements.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                   Nenhuma conquista disponível.
                </div>
              )}
            </div>
          </TabsContent>

          {['streak', 'milestone', 'timing', 'recovery', 'level'].map(tab => {
             const filtered = allAchievements.filter(a => a.category === tab);
             return (
              <TabsContent key={tab} value={tab} className="mt-4 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {filtered.map(renderAchievementCard)}
                   {filtered.length === 0 && (
                      <div className="col-span-full text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                          Nenhuma conquista nesta categoria ainda.
                      </div>
                   )}
                 </div>
              </TabsContent>
             );
          })}
        </Tabs>
      </div>

      {/* Recent Rewards / History */}
      {recentTransactions && recentTransactions.length > 0 && (
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-0 pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icons.History className="h-5 w-5 text-muted-foreground/70" />
              Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg text-sm hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{tx.reason === 'manual_award' ? 'Bônus do Terapeuta' : 'Atividade Realizada'}</p>
                      <p className="text-xs text-muted-foreground">{tx.description || 'XP ganho por atividade'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-green-600 dark:text-green-400 block">+{tx.amount} XP</span>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: ptBR })}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivational Banner */}
      {(xpPerLevel - currentXp) <= 200 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-1 shadow-lg animate-pulse-slow">
          <div className="bg-background/95 backdrop-blur-md rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Quase lá!</h4>
                <p className="text-xs text-muted-foreground">Faltam apenas {xpPerLevel - currentXp} XP para subir de nível.</p>
              </div>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md">
              Treinar Agora
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
