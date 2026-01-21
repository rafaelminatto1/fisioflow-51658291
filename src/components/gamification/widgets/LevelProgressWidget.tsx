import { Card, CardContent } from '@/components/shared/ui/card';
import { Progress } from '@/components/shared/ui/progress';
import { Trophy, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils';

interface LevelProgressWidgetProps {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
  totalPoints: number;
  currentStreak?: number;
  compact?: boolean;
  isLoading?: boolean;
}

export function LevelProgressWidget({
  level,
  currentXp,
  xpForNextLevel,
  progressPercentage,
  totalPoints,
  currentStreak = 0,
  compact = false,
  isLoading = false,
}: LevelProgressWidgetProps) {
  if (isLoading) {
    return (
      <Card className={cn(
        "bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20",
        compact && "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"
      )}>
        <CardContent className={cn(
          "p-4",
          compact && "p-3"
        )}>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <div className="relative shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background shadow-sm">
            {level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold">Nível {level}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(currentXp)}/{Math.round(xpForNextLevel)} XP
            </span>
          </div>
          <Progress value={Math.min(100, Math.max(0, progressPercentage))} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Level Badge */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Trophy className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full flex items-center justify-center text-sm font-bold border-2 border-primary shadow-md">
              {level}
            </div>
          </div>

          {/* Level Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-lg">Nível {level}</h3>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="w-3 h-3" />
                  {Math.round(totalPoints).toLocaleString()} XP
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round(currentXp).toLocaleString()} / {Math.round(xpForNextLevel).toLocaleString()} XP para o próximo nível
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress
                value={Math.min(100, Math.max(0, progressPercentage))}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground text-right">
                {Math.min(100, Math.max(0, progressPercentage)).toFixed(1)}% completo
              </p>
            </div>

            {/* Streak Info */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                    {currentStreak} dias
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">sequência atual</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Level Preview */}
        <div className="mt-4 pt-4 border-t border-primary/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Próximo nível
            </span>
            <span className="font-medium">
              {Math.max(0, Math.round(xpForNextLevel - currentXp)).toLocaleString()} XP restantes
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LevelProgressWidget;
