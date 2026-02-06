import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {

  Activity,
  PlayCircle,
  Target,
  Zap,
  Calendar,
  CheckCircle2,
  Lock,
  Flame,
  Star,
} from 'lucide-react';
import { useQuests, DIFFICULTY_LABELS } from '@/hooks/useQuests';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/10 text-green-500 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  hard: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  expert: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const CATEGORY_ICONS = {
  daily: Calendar,
  weekly: Flame,
  special: Star,
};

interface QuestListProps {
  patientId?: string;
  category?: 'daily' | 'weekly' | 'all';
}

export function QuestList({ patientId, category = 'all' }: QuestListProps) {
  const { dailyQuests, weeklyQuests, isLoading, _startQuest, claimReward } = useQuests(patientId);

  const displayQuests = category === 'daily' ? dailyQuests :
                        category === 'weekly' ? weeklyQuests :
                        [...dailyQuests, ...weeklyQuests];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (displayQuests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {category === 'daily' ? 'Nenhuma quest diária ativa no momento' :
             category === 'weekly' ? 'Nenhuma quest semanal ativa no momento' :
             'Nenhuma quest ativa no momento'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Complete exercícios para desbloquear novas quests!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {displayQuests.map((patientQuest) => {
          const quest = patientQuest.quest_definition;
          if (!quest) return null;

          const Icon = CATEGORY_ICONS[quest.category] || Activity;
          const isCompleted = patientQuest.status === 'completed';
          const isExpired = patientQuest.status === 'expired';
          const isInProgress = patientQuest.status === 'in_progress';

          // Calcular progresso
          const progress = patientQuest.progress || {};
          const current = progress.current || 0;
          const target = progress.target || 1;
          const progressPercent = Math.min((current / target) * 100, 100);

          return (
            <Card
              key={patientQuest.id}
              className={cn(
                'transition-all hover:shadow-md',
                isCompleted && 'border-green-500/50 bg-green-500/5',
                isExpired && 'opacity-50'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      quest.category === 'daily' && 'bg-blue-500/10 text-blue-500',
                      quest.category === 'weekly' && 'bg-purple-500/10 text-purple-500',
                      quest.category === 'special' && 'bg-yellow-500/10 text-yellow-500'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{quest.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {quest.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0', DIFFICULTY_COLORS[quest.difficulty])}
                  >
                    {DIFFICULTY_LABELS[quest.difficulty]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress Bar */}
                {target > 1 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {current} / {target}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}

                {/* Rewards */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Zap className="h-4 w-4" />
                    <span className="font-semibold">+{quest.xp_reward} XP</span>
                  </div>
                  {quest.points_reward > 0 && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Target className="h-4 w-4" />
                      <span className="font-semibold">+{quest.points_reward} pts</span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Completa</span>
                      </>
                    ) : isExpired ? (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Expirada</span>
                      </>
                    ) : isInProgress ? (
                      <>
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-500">Em progresso</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Não iniciada</span>
                      </>
                    )}
                  </div>

                  {/* Expires */}
                  {patientQuest.expires_at && !isCompleted && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(patientQuest.expires_at), {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                {isCompleted && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => claimReward(patientQuest.id)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Resgatar Recompensa
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
