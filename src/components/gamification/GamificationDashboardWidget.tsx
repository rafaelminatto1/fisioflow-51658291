import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Award, TrendingUp, Loader2 } from 'lucide-react';
import { LevelProgressWidget } from './widgets/LevelProgressWidget';
import { RecentAchievementsWidget } from './widgets/RecentAchievementsWidget';
import { DailyQuestsWidget } from './widgets/DailyQuestsWidget';
import { GamificationTriggerService, type LevelCalculationResult } from '@/lib/services/gamificationTriggers';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { gamificationApi } from '@/lib/api/workers-client';

interface GamificationDashboardWidgetProps { patientId: string; compact?: boolean; }
interface GamificationData {
  profile: { total_points: number; level: number; current_streak: number; last_activity_date: string | null; } | null;
  dailyQuests: Array<{ id: string; title: string; description: string; xp: number; completed: boolean; icon?: string; }>;
  unlockedAchievements: Array<{ id: string; title: string; description: string; xp_reward: number; icon?: string; unlocked_at?: string; }>;
  levelCalculation: LevelCalculationResult | null;
}

export function GamificationDashboardWidget({ patientId, compact = false }: GamificationDashboardWidgetProps) {
  const [data, setData] = useState<GamificationData>({ profile: null, dailyQuests: [], unlockedAchievements: [], levelCalculation: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const loadGamificationData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, questsRes, achievementsRes] = await Promise.all([
          gamificationApi.getProfile(patientId),
          gamificationApi.getQuests(patientId),
          gamificationApi.getAchievements(patientId),
        ]);
        const profile = profileRes.data ?? null;
        const levelCalculation = profile ? await GamificationTriggerService.calculateLevelAsync(profile.total_points || 0) : null;
        const dailyQuests = questsRes.data?.quests_data ?? [];
        const unlockedAchievements = (achievementsRes.data?.unlocked ?? []).slice(0, 10).map((log) => {
          const achievement = achievementsRes.data?.all?.find((item) => item.id === log.achievement_id || item.code === log.achievement_title || item.title === log.achievement_title);
          return {
            id: log.id,
            title: achievement?.title || log.achievement_title || 'Conquista',
            description: achievement?.description || '',
            xp_reward: log.xp_reward || achievement?.xp_reward || 0,
            icon: achievement?.icon || 'Award',
            unlocked_at: log.unlocked_at,
          };
        });
        setData({ profile, dailyQuests, unlockedAchievements, levelCalculation });
      } catch (err) {
        logger.error('Error loading gamification data', err, 'GamificationDashboardWidget');
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    void loadGamificationData();
  }, [patientId]);

  if (isLoading) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-600" />Carregando...</CardTitle></CardHeader><CardContent><div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></CardContent></Card>;
  if (error || !data.profile) return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-600" />Centro de Gamificação</CardTitle></CardHeader><CardContent><div className="text-center py-8 text-muted-foreground"><Award className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>{error || 'Perfil não encontrado'}</p></div></CardContent></Card>;

  const level = data.levelCalculation?.level || data.profile.level || 1;
  const currentXp = data.levelCalculation?.currentLevelXp || 0;
  const xpForNextLevel = data.levelCalculation?.xpForNextLevel || 1000;
  const progressPercentage = data.levelCalculation?.progressPercentage || 0;
  const totalPoints = data.profile.total_points || 0;
  const currentStreak = data.profile.current_streak || 0;
  const completedQuests = data.dailyQuests.filter((q) => q.completed).length;

  if (compact) {
    return <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-600" />Minha Progressão</CardTitle></CardHeader><CardContent className="space-y-4"><LevelProgressWidget level={level} currentXp={currentXp} xpForNextLevel={xpForNextLevel} progressPercentage={progressPercentage} totalPoints={totalPoints} currentStreak={currentStreak} compact />{data.dailyQuests.length > 0 && <DailyQuestsWidget quests={data.dailyQuests} completedCount={completedQuests} totalCount={data.dailyQuests.length} compact />}{data.unlockedAchievements.length > 0 && <RecentAchievementsWidget achievements={data.unlockedAchievements.slice(0, 3)} maxItems={3} compact />}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-600" />Centro de Gamificação</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2"><TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">Visão Geral</span></TabsTrigger>
            <TabsTrigger value="quests">Missões</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4"><LevelProgressWidget level={level} currentXp={currentXp} xpForNextLevel={xpForNextLevel} progressPercentage={progressPercentage} totalPoints={totalPoints} currentStreak={currentStreak} /></TabsContent>
          <TabsContent value="quests" className="mt-4"><DailyQuestsWidget quests={data.dailyQuests} completedCount={completedQuests} totalCount={data.dailyQuests.length} /></TabsContent>
          <TabsContent value="achievements" className="mt-4"><RecentAchievementsWidget achievements={data.unlockedAchievements} maxItems={10} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GamificationDashboardWidget;
