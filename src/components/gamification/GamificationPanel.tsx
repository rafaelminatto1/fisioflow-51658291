import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Progress } from '@/components/shared/ui/progress';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Zap, Flame, Trophy, Target, ArrowRight } from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';
import { useGamificationNotifications } from '@/hooks/useGamificationNotifications';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { QuestList } from './QuestList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';

interface GamificationPanelProps {
  patientId: string;
}

export function GamificationPanel({ patientId }: GamificationPanelProps) {
  const {
    profile,
    allAchievements,
    unlockedAchievements,
    dailyQuests,
    isLoading,
    currentLevel,
    xpProgress,
    xpPerLevel,
    currentXp,
    totalPoints,
  } = useGamification(patientId);

  const { unreadCount } = useGamificationNotifications(patientId);
  const [questsOpen, setQuestsOpen] = useState(false);

  // Quick stats calculation
  const totalAchievements = allAchievements.length;
  const unlockedCount = unlockedAchievements.length;
  const completionPercent = totalAchievements > 0
    ? Math.round((unlockedCount / totalAchievements) * 100)
    : 0;

  const completedDailyQuests = dailyQuests.filter(q => q.completed).length;
  const totalDailyQuests = dailyQuests.length;
  const questPercent = totalDailyQuests > 0
    ? Math.round((completedDailyQuests / totalDailyQuests) * 100)
    : 0;

  if (isLoading) {
    return <GamificationPanelSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Seu Progresso</CardTitle>
              <CardDescription>Complete atividades e ganhe recompensas</CardDescription>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">Nível {currentLevel}</span>
              </div>
              <span className="text-muted-foreground">
                {currentXp} / {xpPerLevel} XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-lg font-bold">{unlockedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                de {totalAchievements} conquistas
              </p>
            </div>

            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Flame className="h-4 w-4" />
                <span className="text-lg font-bold">{profile?.current_streak || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">dias de streak</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-lg font-bold">{completedDailyQuests}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                de {totalDailyQuests} quests hoje
              </p>
            </div>
          </div>

          {/* Total Points */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pontos Totais</p>
                <p className="text-xs text-muted-foreground">Use na loja de recompensas</p>
              </div>
            </div>
            <span className="text-xl font-bold text-yellow-500">
              {totalPoints.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Dialog open={questsOpen} onOpenChange={setQuestsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 w-full">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Quests Diárias</span>
              </div>
              <Progress value={questPercent} className="h-2 mt-1" />
              <span className="text-xs text-muted-foreground">
                {completedDailyQuests}/{totalDailyQuests} completadas
              </span>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Quests Diárias</DialogTitle>
            </DialogHeader>
            <QuestList patientId={patientId} category="daily" />
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-start gap-2"
          onClick={() => window.location.href = '/gamification'}
        >
          <div className="flex items-center gap-2 w-full">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Conquistas</span>
          </div>
          <Progress value={completionPercent} className="h-2 mt-1" />
          <span className="text-xs text-muted-foreground">
            {unlockedCount}/{totalAchievements} desbloqueadas
          </span>
          <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

function GamificationPanelSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
