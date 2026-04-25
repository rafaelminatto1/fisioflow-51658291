import React, { lazy, Suspense } from "react";
import { Gift, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useGamification } from "@/hooks/useGamification";

const LazyGamificationHeader = lazy(() => import("@/components/gamification/GamificationHeader"));
const LazyStreakCalendar = lazy(() => import("@/components/gamification/StreakCalendar"));
const LazyLevelJourneyMap = lazy(() => import("@/components/gamification/LevelJourneyMap"));
const LazyLeaderboard = lazy(() =>
  import("@/components/gamification/Leaderboard").then((m) => ({
    default: m.Leaderboard,
  })),
);
const LazyRewardShop = lazy(() =>
  import("@/components/gamification/RewardShop").then((m) => ({
    default: m.RewardShop,
  })),
);

export const PatientGamificationTab = ({ patientId }: { patientId: string }) => {
  const { profile, isProfileNotFound, isLoading, xpPerLevel, currentXp, streak } =
    useGamification(patientId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isProfileNotFound) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
        <Trophy className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Gamificação não disponível no momento</p>
        <p className="text-xs text-muted-foreground mt-2">Entre em contato com o administrador</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-gradient-to-b from-blue-50 to-white border-blue-200">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>
        <p className="text-lg font-semibold text-slate-700 mb-2">
          Bem-vindo ao Programa de Gamificação!
        </p>
        <p className="text-sm text-slate-500 text-center max-w-md mb-4">
          Participe ativamente das sessões de fisioterapia para acumular pontos, desbloquear
          conquistas e avançar em sua jornada de recuperação.
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Trophy className="h-4 w-4 mr-2" />
          Começar Minha Jornada
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <LazyGamificationHeader
          level={profile.level}
          currentXp={currentXp}
          xpPerLevel={xpPerLevel}
          streak={streak}
        />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Loja de Vantagens
            </h3>
            <Suspense fallback={<LoadingSkeleton type="card" />}>
              <LazyRewardShop />
            </Suspense>
          </div>

          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <LazyLevelJourneyMap currentLevel={profile.level} />
          </Suspense>
        </div>

        <div className="space-y-8">
          <Suspense fallback={<LoadingSkeleton type="card" />}>
            <LazyLeaderboard />
          </Suspense>

          <Suspense fallback={<LoadingSkeleton type="card" />}>
            <LazyStreakCalendar
              todayActivity={false}
              activeDates={profile.last_activity_date ? [profile.last_activity_date] : []}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
