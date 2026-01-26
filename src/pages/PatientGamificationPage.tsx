import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGamification, Achievement } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  Star, Crown, Medal, Award, CheckCircle2,
  Flame,
  Search
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Gamification Components
import GamificationHeader from '@/components/gamification/GamificationHeader';
import StreakCalendar from '@/components/gamification/StreakCalendar';
import LevelJourneyMap from '@/components/gamification/LevelJourneyMap';
import RewardsShop from '@/components/gamification/RewardsShop';
import WeeklyChallenges from '@/components/gamification/WeeklyChallenges';
import LevelUpModal from '@/components/gamification/LevelUpModal';
import AchievementModal from '@/components/gamification/AchievementModal';
import StreakFreezeModal from '@/components/gamification/StreakFreezeModal';

interface LeaderboardEntry {
  patient_id: string;
  patient_name: string;
  current_level: number;
  total_xp: number;
  current_streak: number;
  title: string;
}

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function PatientGamificationPage() {
  const { user } = useAuth();
  const {
    profile,
    dailyQuests,
    completeQuest,
    xpPerLevel,
    unlockedAchievements,
    allAchievements,
    freezeStreak,
    freezeCost
  } = useGamification(user?.id || '');

  const [search, setSearch] = useState('');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly' | 'all'>('all');

  // Modal states
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [lastViewedLevel, setLastViewedLevel] = useState(profile?.level || 1);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  // Trigger Level Up Modal
  useEffect(() => {
    if (profile?.level && profile.level > lastViewedLevel) {
      setIsLevelUpModalOpen(true);
      setLastViewedLevel(profile.level);
    }
  }, [profile?.level]);

  // Handle Achievement Click (newly unlocked)
  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
  };

  // Fetch Leaderboard (optimized)
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_levels')
        .select(`
          patient_id,
          current_level,
          total_xp,
          current_streak,
          title
        `)
        .order('total_xp', { ascending: false })
        .limit(20);

      if (error) throw error;

      const patientIds = (data || []).map(d => d.patient_id);
      if (patientIds.length === 0) return [];

      // Corrigir: usar full_name em vez de name
      const { data: patients } = await supabase
        .from('patients')
        .select('id, full_name')
        .in('id', patientIds);

      const patientMap = new Map((patients || []).map(p => [p.id, p.full_name]));

      return (data || []).map(entry => ({
        ...entry,
        patient_name: patientMap.get(entry.patient_id) || 'Paciente'
      })) as LeaderboardEntry[];
    },
  });

  const filteredLeaderboard = leaderboard.filter(entry =>
    entry.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-md mx-auto md:max-w-6xl p-4 md:p-6 space-y-6">

          {/* 1. Hero / Header Section */}
          <GamificationHeader
            level={profile?.level || 1}
            currentXp={profile?.current_xp || 0}
            xpPerLevel={xpPerLevel}
            streak={profile?.current_streak || 0}
          />

          {/* Quick Actions / Streak Preservation */}
          <div className="flex flex-col md:flex-row gap-4">
            <Card className="flex-1 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none shadow-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
                    Proteja sua Sequência
                  </div>
                  <p className="text-blue-100 text-sm">Use seus pontos para não perder dias se esquecer de treinar.</p>
                </div>
                <Button
                  onClick={() => setShowFreezeModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                >
                  Congelar ({freezeCost?.price} pts)
                </Button>
              </div>
            </Card>
          </div>

          {/* Grid Layout for Tablet/Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Left Column (Main Actions) */}
            <div className="md:col-span-7 space-y-6">

              {/* 2. Daily Quests */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Missões de Hoje</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {dailyQuests?.filter(q => q.completed).length}/{dailyQuests?.length || 0} Completas
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {dailyQuests?.map((quest) => (
                    <motion.div
                      key={quest.id}
                      variants={item}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(var(--primary), 0.02)' }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                                relative overflow-hidden p-4 rounded-xl border transition-all cursor-pointer
                                ${quest.completed
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-white hover:border-primary/50 shadow-sm hover:shadow-md'
                        }
                            `}
                      onClick={() => !quest.completed && completeQuest.mutate({ questId: quest.id })}
                    >
                      {/* Quest Completion Animation BG */}
                      {quest.completed && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="absolute inset-0 bg-green-500/5 origin-left"
                        />
                      )}

                      <div className="relative flex items-center gap-4">
                        <div className={`
                                    h-12 w-12 rounded-full flex items-center justify-center text-xl shrink-0 transition-colors
                                    ${quest.completed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}
                                `}>
                          {quest.completed ? <CheckCircle2 className="w-6 h-6" /> : <Star className="w-5 h-5 fill-current" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold truncate ${quest.completed && 'text-muted-foreground line-through'}`}>
                            {quest.title}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">{quest.description}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <Badge variant="outline" className={`
                                        ${quest.completed ? 'border-green-200 text-green-700 bg-green-50' : 'border-yellow-200 text-yellow-700 bg-yellow-50'}
                                    `}>
                            +{quest.xp} XP
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {(!dailyQuests || dailyQuests.length === 0) && (
                    <div className="text-center p-8 bg-white rounded-xl border border-dashed text-muted-foreground">
                      Nenhuma missão disponível hoje.
                    </div>
                  )}
                </div>
              </motion.div>

              {/* 3. Journey Map */}
              <LevelJourneyMap currentLevel={profile?.level || 1} />

              {/* 3.5. Weekly Challenges */}
              <WeeklyChallenges patientId={user?.id || ''} />

            </div>

            {/* Right Column (Stats & Social) */}
            <div className="md:col-span-5 space-y-6">

              {/* 4. Streak Calendar */}
              <StreakCalendar
                todayActivity={dailyQuests?.some(q => q.completed) || false}
                activeDates={profile?.last_activity_date ? [profile.last_activity_date] : []}
              />

              {/* 5. Achievements Preview */}
              <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-slate-50 to-white border">
                <div className="p-4 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-500" />
                    Conquistas
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {unlockedAchievements?.length || 0}/{allAchievements?.length || 0}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-4 gap-2">
                  {allAchievements.slice(0, 8).map(achievement => {
                    const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
                    return (
                      <div key={achievement.id} className="flex flex-col items-center gap-1 group relative">
                        <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${isUnlocked
                            ? 'bg-purple-100 text-purple-600 shadow-sm group-hover:scale-110'
                            : 'bg-muted text-muted-foreground/30 grayscale'
                          }
                                `}>
                          <Award className="w-6 h-6" />
                        </div>
                        {/* Tooltip-ish */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                          {achievement.title}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:bg-slate-50 border-t rounded-none h-10">
                  Ver todas
                </Button>
              </Card>

              {/* 5.5 Rewards Shop */}
              <RewardsShop
                patientId={user?.id || ''}
                currentPoints={profile?.total_points || 0}
              />

              {/* 6. Leaderboard */}
              <Card className="border-none shadow-sm h-fit">
                <div className="p-4 border-b space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Ranking
                    </h3>
                    <Tabs value={rankingPeriod} onValueChange={(v: any) => setRankingPeriod(v)} className="w-auto">
                      <TabsList className="grid grid-cols-3 h-8 text-[10px]">
                        <TabsTrigger value="weekly">Semana</TabsTrigger>
                        <TabsTrigger value="monthly">Mês</TabsTrigger>
                        <TabsTrigger value="all">Total</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar paciente..."
                      className="w-full pl-8 h-9 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {isLoadingLeaderboard ? (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    filteredLeaderboard.map((entry, index) => {
                      const isCurrentUser = entry.patient_id === user?.id;
                      return (
                        <div
                          key={entry.patient_id}
                          className={`
                            flex items-center gap-3 p-3 transition-colors
                            ${isCurrentUser ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-slate-50'}
                          `}
                        >
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${index < 3 ? 'bg-yellow-100 text-yellow-700 shadow-sm' : 'bg-slate-100 text-slate-500'}
                          `}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm truncate ${isCurrentUser && 'text-primary font-bold'}`}>
                              {entry.patient_name}
                              {isCurrentUser && <span className="ml-2 text-[10px] bg-primary text-white py-0.5 px-1.5 rounded-full uppercase tracking-tighter">Você</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">Nível {entry.current_level}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-600'}`}>{entry.total_xp} XP</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Modals */}
        <LevelUpModal
          isOpen={isLevelUpModalOpen}
          onClose={() => setIsLevelUpModalOpen(false)}
          newLevel={profile?.level || 1}
        />

        <AchievementModal
          isOpen={!!selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          achievement={selectedAchievement}
        />

        <StreakFreezeModal
          isOpen={showFreezeModal}
          onClose={() => setShowFreezeModal(false)}
          currentPoints={profile?.total_points || 0}
          cost={freezeCost?.price || 100}
          onConfirm={() => {
            freezeStreak.mutate();
            setShowFreezeModal(false);
          }}
          isLoading={freezeStreak.isPending}
        />
      </div>
    </MainLayout>
  );
}
