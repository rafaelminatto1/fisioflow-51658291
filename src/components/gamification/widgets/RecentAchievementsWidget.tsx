import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Award, Star, Trophy, Medal, Target, Flame, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/web/ui/scroll-area';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  xp_reward: number;
  unlocked_at?: string;
}

interface RecentAchievementsWidgetProps {
  achievements: Achievement[];
  maxItems?: number;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Award,
  Star,
  Trophy,
  Medal,
  Target,
  Flame,
  Zap,
  Sparkles,
};

export function RecentAchievementsWidget({
  achievements,
  maxItems = 5,
  compact = false,
}: RecentAchievementsWidgetProps) {
  const displayAchievements = achievements.slice(0, maxItems);

  if (compact) {
    return (
      <div className="space-y-2">
        {displayAchievements.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conquista ainda</p>
          </div>
        ) : (
          displayAchievements.map((achievement) => {
            const Icon = ICON_MAP[achievement.icon || 'Award'] || Award;
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800/30"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{achievement.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  +{achievement.xp_reward}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Conquistas Recentes
          {achievements.length > 0 && (
            <Badge variant="secondary">{achievements.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {displayAchievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-semibold mb-1">Nenhuma conquista ainda</h4>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Complete sessões e missões para desbloquear conquistas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayAchievements.map((achievement, index) => {
                const Icon = ICON_MAP[achievement.icon || 'Award'] || Award;
                return (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800/30 transition-all hover:shadow-md"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{achievement.title}</h4>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          +{achievement.xp_reward} XP
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {achievement.description}
                      </p>
                      {achievement.unlocked_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default RecentAchievementsWidget;
