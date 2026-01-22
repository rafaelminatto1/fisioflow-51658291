import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Progress } from '@/components/shared/ui/progress';
import { Button } from '@/components/shared/ui/button';
import { Skeleton } from '@/components/shared/ui/skeleton';
import {
  Zap,
  Flame,
  Trophy,
  Target,
  Award,
  Crown,
  TrendingUp,
  Star,
  Sparkles,
  Medal
} from 'lucide-react';
import { useGamification } from '@/hooks/useGamification';
import { useGamificationSound, useSoundEnabled } from '@/hooks/useGamificationSound';
import { cn } from '@/lib/utils';
import {
  calculatePatientReputation,
  getRankLabel,
  getRankGradient,
  getRankBorderColor,
  getNextLevelTitle
} from '@/lib/gamification/reputation';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';

interface GamificationBadgesProps {
  patientId: string;
  showRanking?: boolean;
  variant?: 'compact' | 'full';
  locale?: 'pt' | 'en';
}

/**
 * Componente de Badges de Gamificação
 *
 * Mostra nível, streak, conquistas e ranking do paciente
 */
export function GamificationBadges({
  patientId,
  showRanking = true,
  variant = 'full',
  locale = 'pt'
}: GamificationBadgesProps) {
  const {
    profile,
    allAchievements,
    unlockedAchievements,
    isLoading,
    currentLevel,
    xpProgress,
    xpPerLevel,
    currentXp,
    totalPoints
  } = useGamification(patientId);

  const { soundEnabled, toggleSound } = useSoundEnabled();
  const { playClick } = useGamificationSound();
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (isLoading || !profile) {
    return <GamificationBadgesSkeleton variant={variant} />;
  }

  // Calcular reputação
  const reputation = calculatePatientReputation(currentLevel, unlockedAchievements);
  const nextTitle = getNextLevelTitle(currentLevel);
  const levelTitle = reputation.levelTitle;

  // Stats
  const totalAchievements = allAchievements.length;
  const unlockedCount = unlockedAchievements.length;
  const streak = profile.current_streak || 0;
  const longestStreak = profile.longest_streak || 0;

  // Icones
  const RankIcon = reputation.rank === 'legendary' ? Crown :
                  reputation.rank === 'master' ? Star :
                  reputation.rank === 'experienced' ? Award :
                  reputation.rank === 'beginner' ? Sparkles :
                  Trophy;

  // Toggle som
  const handleToggleSound = () => {
    playClick();
    toggleSound();
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Level Badge */}
        <Badge
          variant="secondary"
          className={cn(
            "gap-1.5 px-3 py-1.5 text-sm font-semibold",
            levelTitle.color
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Nível {currentLevel}</span>
        </Badge>

        {/* Streak Badge */}
        {streak > 0 && (
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-500"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{streak} dias</span>
          </Badge>
        )}

        {/* Achievements Badge */}
        {unlockedCount > 0 && (
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 text-sm font-semibold text-yellow-500"
          >
            <Medal className="h-3.5 w-3.5" />
            <span>{unlockedCount}</span>
          </Badge>
        )}

        {/* Title Badge */}
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 px-3 py-1.5 text-sm font-semibold",
            reputation.rankColor.replace('bg-', 'text-'),
            getRankBorderColor(reputation.rank)
          )}
        >
          <RankIcon className="h-3.5 w-3.5" />
          <span>{reputation.primaryTitle}</span>
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card
        className={cn(
          "relative overflow-hidden",
          getRankGradient(reputation.rank)
        )}
      >
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          reputation.rankColor
        )} />

        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">{levelTitle.icon}</span>
                {levelTitle.title}
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    getRankBorderColor(reputation.rank)
                  )}
                >
                  {getRankLabel(reputation.rank, locale)}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {levelTitle.description}
              </p>
            </div>

            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleSound}
            >
              {soundEnabled ? (
                <Zap className="h-4 w-4 text-yellow-500" />
              ) : (
                <Zap className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className={cn("h-4 w-4", levelTitle.color)} />
                <span className="font-semibold">Nível {currentLevel}</span>
              </div>
              <span className="text-muted-foreground">
                {currentXp} / {xpPerLevel} XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-3" />
            {nextTitle && (
              <p className="text-xs text-muted-foreground">
                Próximo título: <strong>{nextTitle.icon} {nextTitle.title}</strong> em {nextTitle.level - currentLevel} níveis
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Streak */}
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-500">{streak}</p>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt' ? 'dias streak' : 'day streak'}
              </p>
              {longestStreak > streak && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  recorde: {longestStreak}
                </p>
              )}
            </div>

            {/* Achievements */}
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
              <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-yellow-500">{unlockedCount}</p>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt' ? 'conquistas' : 'achievements'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {totalAchievements} totais
              </p>
            </div>

            {/* Total Points */}
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
              <Target className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-500">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt' ? 'pontos totais' : 'total points'}
              </p>
            </div>
          </div>

          {/* Achievement Titles */}
          {reputation.achievementTitles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {locale === 'pt' ? 'Títulos Especiais' : 'Special Titles'}
              </p>
              <div className="flex flex-wrap gap-2">
                {reputation.achievementTitles.map((title) => (
                  <Badge
                    key={title.code}
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-2.5 py-1",
                      title.color,
                      "border-current/30"
                    )}
                  >
                    <span>{title.icon}</span>
                    <span className="text-xs font-medium">{title.title}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* View Details Button */}
          {showRanking && (
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {locale === 'pt' ? 'Ver Ranking Completo' : 'View Full Ranking'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {locale === 'pt' ? 'Seu Progresso Detalhado' : 'Your Detailed Progress'}
                  </DialogTitle>
                  <DialogDescription>
                    {locale === 'pt'
                      ? 'Veja suas estatísticas e conquistas em detalhes'
                      : 'View your stats and achievements in detail'}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="achievements" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="achievements">
                      {locale === 'pt' ? 'Conquistas' : 'Achievements'}
                    </TabsTrigger>
                    <TabsTrigger value="titles">
                      {locale === 'pt' ? 'Títulos' : 'Titles'}
                    </TabsTrigger>
                    <TabsTrigger value="stats">
                      {locale === 'pt' ? 'Estatísticas' : 'Stats'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="achievements" className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {locale === 'pt'
                          ? `Conquistas Desbloqueadas (${unlockedCount}/${totalAchievements})`
                          : `Unlocked Achievements (${unlockedCount}/${totalAchievements})`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unlockedAchievements.map((ua) => (
                          <Badge
                            key={ua.id}
                            variant="secondary"
                            className="gap-1.5 px-2.5 py-1"
                          >
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs">{ua.achievement_title}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="titles" className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Título Principal' : 'Primary Title'}
                        </p>
                        <p className="text-lg font-bold flex items-center gap-2">
                          <span>{levelTitle.icon}</span>
                          {reputation.primaryTitle}
                        </p>
                      </div>

                      {reputation.achievementTitles.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase mb-2">
                            {locale === 'pt' ? 'Títulos Especiais' : 'Special Titles'}
                          </p>
                          <div className="space-y-2">
                            {reputation.achievementTitles.map((title) => (
                              <div
                                key={title.code}
                                className="p-3 rounded-lg bg-muted/50 border border-border"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{title.icon}</span>
                                  <div>
                                    <p className={cn("font-semibold", title.color)}>
                                      {title.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {title.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="stats" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Nível Atual' : 'Current Level'}
                        </p>
                        <p className="text-2xl font-bold">{currentLevel}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'XP Total' : 'Total XP'}
                        </p>
                        <p className="text-2xl font-bold">{currentXp}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Streak Atual' : 'Current Streak'}
                        </p>
                        <p className="text-2xl font-bold text-orange-500">{streak}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Recorde' : 'Record'}
                        </p>
                        <p className="text-2xl font-bold text-orange-500">{longestStreak}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Pontos' : 'Points'}
                        </p>
                        <p className="text-2xl font-bold text-blue-500">{totalPoints.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          {locale === 'pt' ? 'Rank' : 'Rank'}
                        </p>
                        <p className={cn(
                          "text-2xl font-bold",
                          reputation.rankColor.replace('bg-', 'text-')
                        )}>
                          {getRankLabel(reputation.rank, locale)}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Bar (for mobile) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-lg font-bold text-orange-500">{streak}</p>
          <p className="text-[10px] text-muted-foreground">
            {locale === 'pt' ? 'streak' : 'streak'}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-lg font-bold text-yellow-500">{unlockedCount}</p>
          <p className="text-[10px] text-muted-foreground">
            {locale === 'pt' ? 'conquistas' : 'badges'}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/30">
          <p className="text-lg font-bold text-blue-500">{totalPoints.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">
            {locale === 'pt' ? 'pontos' : 'points'}
          </p>
        </div>
      </div>
    </div>
  );
}

function GamificationBadgesSkeleton({ variant }: { variant: 'compact' | 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
