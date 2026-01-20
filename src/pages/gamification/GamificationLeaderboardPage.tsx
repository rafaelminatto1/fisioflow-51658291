import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Crown, Medal, Award, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';
import GamificationHeader from '@/components/gamification/GamificationHeader';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  patient_id: string;
  patient_name: string;
  current_level: number;
  total_xp: number;
  current_streak: number;
  title?: string;
}

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
const RANK_BG = ['bg-yellow-100 text-yellow-700', 'bg-gray-100 text-gray-600', 'bg-amber-100 text-amber-700'];

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
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

export default function GamificationLeaderboardPage() {
  const { user } = useAuth();
  const {
    profile,
    xpPerLevel
  } = useGamification(user?.id || '');

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('all');

  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['gamification-leaderboard', period],
    queryFn: async () => {
      let query = supabase
        .from('patient_gamification')
        .select(`
          patient_id,
          total_points,
          level,
          current_streak,
          last_activity_date
        `);

      // Apply period filter (simplified - in production you'd filter by date)
      if (period === 'weekly') {
        // Would filter by last 7 days
        query = query.order('current_streak', { ascending: false });
      } else if (period === 'monthly') {
        // Would filter by last 30 days
        query = query.order('current_streak', { ascending: false });
      } else {
        query = query.order('total_points', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      const patientIds = (data || []).map(d => d.patient_id);
      if (patientIds.length === 0) return [];

      // Fetch patient names
      const { data: patients } = await supabase
        .from('patients')
        .select('id, full_name')
        .in('id', patientIds);

      const patientMap = new Map((patients || []).map(p => [p.id, p.full_name]));

      return (data || []).map(entry => ({
        patient_id: entry.patient_id,
        patient_name: patientMap.get(entry.patient_id) || 'Paciente',
        current_level: entry.level,
        total_xp: entry.total_points,
        current_streak: entry.current_streak,
      })) as LeaderboardEntry[];
    },
  });

  // Filter by search
  const filteredLeaderboard = leaderboard.filter(entry =>
    entry.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Find current user's rank
  const currentUserRank = leaderboard.findIndex(e => e.patient_id === user?.id) + 1;
  const currentUserEntry = leaderboard.find(e => e.patient_id === user?.id);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                Ranking
              </h1>
              <p className="text-muted-foreground mt-1">
                Veja como você se destaca entre os demais pacientes
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

          {/* Current User Summary */}
          {currentUserEntry && currentUserRank > 0 && (
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Sua posição</p>
                      <p className="text-3xl font-bold">#{currentUserRank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Seus pontos</p>
                    <p className="text-2xl font-bold">{currentUserEntry.total_xp} XP</p>
                    <p className="text-blue-100 text-sm">Nível {currentUserEntry.current_level}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Controls */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Period Filter */}
              <Tabs value={period} onValueChange={(v: any) => setPeriod(v)} className="w-auto">
                <TabsList>
                  <TabsTrigger value="weekly">Semana</TabsTrigger>
                  <TabsTrigger value="monthly">Mês</TabsTrigger>
                  <TabsTrigger value="all">Total</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>

          {/* Leaderboard */}
          <Card className="overflow-hidden">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  {filteredLeaderboard.map((entry, index) => {
                    const isCurrentUser = entry.patient_id === user?.id;
                    const rank = index + 1;
                    const RankIcon = rank <= 3 ? RANK_ICONS[rank - 1] : null;

                    return (
                      <motion.div
                        key={entry.patient_id}
                        variants={item}
                        className={`
                          flex items-center gap-4 p-4 transition-colors
                          ${isCurrentUser ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-slate-50'}
                        `}
                      >
                        {/* Rank */}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                          ${rank <= 3 ? RANK_BG[rank - 1] : 'bg-slate-100 text-slate-500'}
                        `}>
                          {rank <= 3 ? (
                            <RankIcon className="w-5 h-5" />
                          ) : (
                            <span>#{rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-primary font-bold shrink-0">
                          {entry.patient_name?.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${isCurrentUser && 'text-primary font-bold'}`}>
                              {entry.patient_name}
                            </p>
                            {isCurrentUser && (
                              <Badge className="bg-primary text-white text-xs">Você</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Nível {entry.current_level}
                            {entry.current_streak > 0 && ` • ${entry.current_streak} dias seguidos`}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="text-right shrink-0">
                          <span className={`text-lg font-bold ${isCurrentUser ? 'text-primary' : 'text-slate-700'}`}>
                            {entry.total_xp}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">XP</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {!isLoading && filteredLeaderboard.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                </div>
              )}
            </div>
          </Card>

          {/* Podium - Top 3 */}
          {leaderboard.length >= 3 && !isLoading && (
            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <h3 className="font-semibold mb-4 text-center text-lg">Top 3 do Mês</h3>
              <div className="flex items-end justify-center gap-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                    {leaderboard[1]?.patient_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium text-sm truncate max-w-[80px]">{leaderboard[1]?.patient_name}</p>
                  <Badge variant="secondary" className="mt-1 bg-gray-200 text-gray-700">
                    2º lugar
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{leaderboard[1]?.total_xp} XP</p>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2 shadow-lg">
                      {leaderboard[0]?.patient_name?.charAt(0).toUpperCase()}
                    </div>
                    <Crown className="w-6 h-6 text-yellow-500 absolute -top-4 left-1/2 -translate-x-1/2" />
                  </div>
                  <p className="font-medium truncate max-w-[100px]">{leaderboard[0]?.patient_name}</p>
                  <Badge className="mt-1 bg-yellow-500 text-white">
                    1º lugar
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{leaderboard[0]?.total_xp} XP</p>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
                    {leaderboard[2]?.patient_name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-medium text-sm truncate max-w-[80px]">{leaderboard[2]?.patient_name}</p>
                  <Badge variant="secondary" className="mt-1 bg-amber-200 text-amber-700">
                    3º lugar
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{leaderboard[2]?.total_xp} XP</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
