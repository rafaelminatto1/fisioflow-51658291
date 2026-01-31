import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Award, Flame, TrendingUp, Loader2 } from 'lucide-react';
import { LevelProgressWidget } from './widgets/LevelProgressWidget';
import { RecentAchievementsWidget } from './widgets/RecentAchievementsWidget';
import { DailyQuestsWidget } from './widgets/DailyQuestsWidget';
import { GamificationTriggerService, type LevelCalculationResult } from '@/lib/services/gamificationTriggers';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface GamificationDashboardWidgetProps {
  patientId: string;
  compact?: boolean;
}

interface GamificationData {
  profile: {
    total_points: number;
    level: number;
    current_streak: number;
    last_activity_date: string | null;
  } | null;
  dailyQuests: Array<{
    id: string;
    title: string;
    description: string;
    xp: number;
    completed: boolean;
    icon?: string;
  }>;
  unlockedAchievements: Array<{
    id: string;
    title: string;
    description: string;
    xp_reward: number;
    icon?: string;
    unlocked_at?: string;
  }>;
  levelCalculation: LevelCalculationResult | null;
}

interface AchievementLog {
  id: string;
  unlocked_at: string;
  achievements?: {
    title?: string;
    description?: string;
    xp_reward?: number;
    icon?: string;
  };
}

export function GamificationDashboardWidget({
  patientId,
  compact = false,
}: GamificationDashboardWidgetProps) {
  const [data, setData] = useState<GamificationData>({
    profile: null,
    dailyQuests: [],
    unlockedAchievements: [],
    levelCalculation: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;

    const loadGamificationData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load profile
        const { data: profile, error: profileError } = await supabase
          .from('patient_gamification')
          .select('*')
          .eq('patient_id', patientId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // Calculate level info
        let levelCalculation: LevelCalculationResult | null = null;
        if (profile) {
          levelCalculation = await GamificationTriggerService.calculateLevelAsync(profile.total_points || 0);
        }

        // Load daily quests
        const today = new Date().toISOString().split('T')[0];
        const { data: questsData } = await supabase
          .from('daily_quests')
          .select('quests_data')
          .eq('patient_id', patientId)
          .eq('date', today)
          .maybeSingle();

        const dailyQuests = questsData?.quests_data as Array<{
          id: string;
          title: string;
          description: string;
          xp: number;
          completed: boolean;
          icon?: string;
        }> || [];

        // Load unlocked achievements
        const { data: achievementsData } = await supabase
          .from('achievements_log')
          .select('*, achievements(*)')
          .eq('patient_id', patientId)
          .order('unlocked_at', { ascending: false })
          .limit(10);

        const unlockedAchievements = (achievementsData || []).map((log: AchievementLog) => ({
          id: log.id,
          title: log.achievements?.title || 'Conquista',
          description: log.achievements?.description || '',
          xp_reward: log.achievements?.xp_reward || 0,
          icon: log.achievements?.icon || 'Award',
          unlocked_at: log.unlocked_at,
        }));

        setData({
          profile,
          dailyQuests,
          unlockedAchievements,
          levelCalculation,
        });
      } catch (err) {
        logger.error('Error loading gamification data', err, 'GamificationDashboardWidget');
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadGamificationData();
  }, [patientId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Carregando...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data.profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Centro de Gamificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{error || 'Perfil não encontrado'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const level = data.levelCalculation?.level || data.profile.level || 1;
  const currentXp = data.levelCalculation?.currentLevelXp || 0;
  const xpForNextLevel = data.levelCalculation?.xpForNextLevel || 1000;
  const progressPercentage = data.levelCalculation?.progressPercentage || 0;
  const totalPoints = data.profile.total_points || 0;
  const currentStreak = data.profile.current_streak || 0;
  const completedQuests = data.dailyQuests.filter(q => q.completed).length;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Minha Progressão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LevelProgressWidget
            level={level}
            currentXp={currentXp}
            xpForNextLevel={xpForNextLevel}
            progressPercentage={progressPercentage}
            totalPoints={totalPoints}
            currentStreak={currentStreak}
            compact
          />

          {data.dailyQuests.length > 0 && (
            <DailyQuestsWidget
              quests={data.dailyQuests}
              completedCount={completedQuests}
              totalCount={data.dailyQuests.length}
              compact
            />
          )}

          {data.unlockedAchievements.length > 0 && (
            <RecentAchievementsWidget
              achievements={data.unlockedAchievements.slice(0, 3)}
              maxItems={3}
              compact
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          Centro de Gamificação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="quests" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Missões</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Conquistas</span>
            </TabsTrigger>
            <TabsTrigger value="streak" className="gap-2">
              <Flame className="w-4 h-4" />
              <span className="hidden sm:inline">Sequência</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <LevelProgressWidget
              level={level}
              currentXp={currentXp}
              xpForNextLevel={xpForNextLevel}
              progressPercentage={progressPercentage}
              totalPoints={totalPoints}
              currentStreak={currentStreak}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Nível Atual</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{level}</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sequência</span>
                  <Flame className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">{currentStreak} dias</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">XP Total</span>
                  <Trophy className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Conquistas</span>
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{data.unlockedAchievements.length}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quests" className="mt-4">
            <DailyQuestsWidget
              quests={data.dailyQuests}
              completedCount={completedQuests}
              totalCount={data.dailyQuests.length}
            />
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <RecentAchievementsWidget
              achievements={data.unlockedAchievements}
              maxItems={10}
            />
          </TabsContent>

          <TabsContent value="streak" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Flame className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sequência Atual</p>
                    <p className="text-4xl font-bold">{currentStreak}</p>
                    <p className="text-sm text-muted-foreground">dias consecutivos</p>
                  </div>

                  {currentStreak >= 7 && (
                    <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700/50">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                        🏆 Incrível! {currentStreak} dias de dedicação!
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Prómeta: 3 dias</p>
                      <p className="text-lg font-bold text-orange-600">+50 XP</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Prómeta: 7 dias</p>
                      <p className="text-lg font-bold text-orange-600">+100 XP</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Prómeta: 30 dias</p>
                      <p className="text-lg font-bold text-orange-600">+500 XP</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GamificationDashboardWidget;
