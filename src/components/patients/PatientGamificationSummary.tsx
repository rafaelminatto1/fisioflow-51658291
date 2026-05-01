import { useGamification } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame, Star, TrendingUp } from "lucide-react";

interface PatientGamificationSummaryProps {
  patientId: string;
}

export function PatientGamificationSummary({ patientId }: PatientGamificationSummaryProps) {
  const {
    profile,
    isLoading,
    isProfileNotFound,
    currentLevel,
    currentXp,
    xpPerLevel,
    progressPercentage,
    totalPoints,
  } = useGamification(patientId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (isProfileNotFound || !profile) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4" />
        <span>Gamificação não iniciada</span>
      </div>
    );
  }

  const streak = profile.current_streak ?? 0;
  const adherence = totalPoints > 0 ? Math.min(100, Math.round((totalPoints / (currentLevel * 100)) * 100)) : 0;

  return (
    <div className="rounded-lg border bg-gradient-to-br from-blue-50/50 to-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
          <Trophy className="h-4 w-4" />
          <span>Nível {currentLevel}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {streak > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Flame className="h-3.5 w-3.5" />
              {streak} dias
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            {totalPoints.toLocaleString("pt-BR")} XP
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentXp} / {xpPerLevel} XP para nível {currentLevel + 1}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>

      {adherence > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          <span>Aderência estimada: <span className="font-medium text-green-700">{adherence}%</span></span>
        </div>
      )}
    </div>
  );
}
