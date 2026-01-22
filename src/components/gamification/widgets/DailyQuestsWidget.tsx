import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Progress } from '@/components/shared/ui/progress';
import { Target, CheckCircle2, Circle, Flame, Star } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/web/ui/scroll-area';

interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  icon?: string;
}

interface DailyQuestsWidgetProps {
  quests: Quest[];
  completedCount: number;
  totalCount: number;
  onQuestComplete?: (questId: string) => void;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Star,
  Target,
  Flame,
  Circle,
};

export function DailyQuestsWidget({
  quests,
  completedCount,
  totalCount,
  onQuestComplete,
  compact = false,
}: DailyQuestsWidgetProps) {
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Missões Diárias</span>
          </div>
          <Badge variant={allCompleted ? "default" : "secondary"}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <div className="space-y-1.5 mt-2">
          {quests.slice(0, 3).map((quest) => {
            const Icon = ICON_MAP[quest.icon || 'Star'] || Star;
            return (
              <div
                key={quest.id}
                className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50 transition-colors"
              >
                {quest.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span className={`flex-1 truncate ${quest.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {quest.title}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">+{quest.xp} XP</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={allCompleted ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Missões Diárias
          </CardTitle>
          <Badge variant={allCompleted ? "default" : "secondary"} className="gap-1">
            {allCompleted && <Flame className="w-3 h-3" />}
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          {quests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhuma missão disponível no momento
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {quests.map((quest) => {
                const Icon = ICON_MAP[quest.icon || 'Star'] || Star;
                return (
                  <div
                    key={quest.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      quest.completed
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                        : 'bg-card hover:bg-muted/50 border-border'
                    }`}
                  >
                    <div className="shrink-0">
                      {quest.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold mb-0.5 ${quest.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {quest.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {quest.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        +{quest.xp} XP
                      </Badge>
                      {!quest.completed && onQuestComplete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => onQuestComplete(quest.id)}
                        >
                          Completar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {allCompleted && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white text-center">
            <p className="font-semibold text-sm">🎉 Parabéns! Todas as missões concluídas!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyQuestsWidget;
