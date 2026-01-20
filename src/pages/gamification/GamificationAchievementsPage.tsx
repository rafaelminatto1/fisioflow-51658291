import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useGamification, Achievement } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { Award, Search, Lock, CheckCircle2, Sparkles, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import GamificationHeader from '@/components/gamification/GamificationHeader';
import AchievementModal from '@/components/gamification/AchievementModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function GamificationAchievementsPage() {
  const { user } = useAuth();
  const {
    profile,
    unlockedAchievements,
    allAchievements,
    xpPerLevel
  } = useGamification(user?.id || '');

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'sessions' | 'exercises' | 'streaks' | 'social'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Filter achievements
  const filteredAchievements = allAchievements.filter(achievement => {
    const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);

    // Status filter
    if (filterStatus === 'unlocked' && !isUnlocked) return false;
    if (filterStatus === 'locked' && isUnlocked) return false;

    // Category filter
    if (filterCategory !== 'all' && achievement.category !== filterCategory) return false;

    // Search filter
    if (search && !achievement.title.toLowerCase().includes(search.toLowerCase()) &&
      !achievement.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const categoryColors: Record<string, string> = {
    sessions: 'bg-blue-500',
    exercises: 'bg-green-500',
    streaks: 'bg-orange-500',
    social: 'bg-purple-500',
    special: 'bg-yellow-500',
  };

  const categoryLabels: Record<string, string> = {
    sessions: 'Sessões',
    exercises: 'Exercícios',
    streaks: 'Sequências',
    social: 'Social',
    special: 'Especial',
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-500" />
                Minhas Conquistas
              </h1>
              <p className="text-muted-foreground mt-1">
                {unlockedAchievements.length} de {allAchievements.length} conquistas desbloqueadas
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <GamificationHeader
            level={profile?.level || 1}
            currentXp={profile?.current_xp || 0}
            xpPerLevel={xpPerLevel}
            streak={profile?.current_streak || 0}
          />

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conquistas..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="unlocked">Desbloqueadas</TabsTrigger>
                  <TabsTrigger value="locked">Bloqueadas</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Category Filter */}
              <Tabs value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="sessions">Sessões</TabsTrigger>
                  <TabsTrigger value="exercises">Exercícios</TabsTrigger>
                  <TabsTrigger value="streaks">Sequências</TabsTrigger>
                  <TabsTrigger value="social">Social</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>

          {/* Achievements Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAchievements.map((achievement) => {
              const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
              const unlockedData = unlockedAchievements.find(ua => ua.achievement_id === achievement.id);

              return (
                <motion.div
                  key={achievement.id}
                  variants={item}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAchievement(achievement)}
                  className={`
                    relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer
                    ${isUnlocked
                      ? 'bg-gradient-to-br from-purple-50 to-white border-purple-200 shadow-md hover:shadow-lg'
                      : 'bg-gray-50 border-gray-200 opacity-70'
                    }
                  `}
                >
                  {/* Shimmer effect for unlocked achievements */}
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/20 to-transparent animate-shimmer" />
                  )}

                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0
                        ${isUnlocked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}
                      `}>
                        {isUnlocked ? (
                          <Sparkles className="w-8 h-8" />
                        ) : (
                          <Lock className="w-8 h-8" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-bold truncate ${isUnlocked ? 'text-purple-900' : 'text-gray-600'}`}>
                            {achievement.title}
                          </h3>
                          {isUnlocked && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {achievement.description}
                        </p>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`
                              text-xs
                              ${categoryColors[achievement.category] || 'bg-gray-500'}
                              text-white
                            `}
                          >
                            {categoryLabels[achievement.category] || achievement.category}
                          </Badge>

                          {achievement.xp_reward && (
                            <Badge variant="outline" className="text-xs">
                              +{achievement.xp_reward} XP
                            </Badge>
                          )}
                        </div>

                        {isUnlocked && unlockedData?.unlocked_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Desbloqueado em {new Date(unlockedData.unlocked_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-muted-foreground text-lg">
                Nenhuma conquista encontrada
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Tente ajustar os filtros ou a busca
              </p>
            </div>
          )}
        </div>

        {/* Achievement Detail Modal */}
        <AchievementModal
          isOpen={!!selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          achievement={selectedAchievement}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </MainLayout>
  );
}
