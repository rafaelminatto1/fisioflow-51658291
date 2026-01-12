import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, Users, TrendingUp, Award, Search,
  Flame, Star, Crown, Medal, Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function PatientGamificationPage() {
  const [search, setSearch] = useState('');

  const { data: leaderboard = [], isLoading } = useQuery({
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
        .limit(50);

      if (error) throw error;

      // Fetch patient names
      const patientIds = (data || []).map(d => d.patient_id);

      if (patientIds.length === 0) {
        return (data || []).map(entry => ({
          ...entry,
          patient_name: 'Paciente'
        })) as LeaderboardEntry[];
      }

      const { data: patients } = await supabase
        .from('patients')
        .select('id, name')
        .in('id', patientIds);

      const patientMap = new Map((patients || []).map(p => [p.id, p.name]));

      return (data || []).map(entry => ({
        ...entry,
        patient_name: patientMap.get(entry.patient_id) || 'Paciente'
      })) as LeaderboardEntry[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const { data: levels } = await supabase
        .from('patient_levels')
        .select('total_xp, current_streak');

      const { count: achievementsCount } = await supabase
        .from('achievements_log')
        .select('*', { count: 'exact', head: true });

      const totalXP = (levels || []).reduce((sum, l) => sum + (l.total_xp || 0), 0);
      const avgStreak = levels?.length
        ? Math.round((levels || []).reduce((sum, l) => sum + (l.current_streak || 0), 0) / levels.length)
        : 0;

      return {
        totalParticipants: levels?.length || 0,
        totalXP,
        avgStreak,
        totalAchievements: achievementsCount || 0
      };
    },
  });

  const filteredLeaderboard = leaderboard.filter(entry =>
    entry.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Gamificação & Engajamento
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso e engajamento dos pacientes através de níveis, conquistas e rankings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalParticipants || 0}</p>
                <p className="text-xs text-muted-foreground">Participantes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats?.totalXP || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.avgStreak || 0}</p>
                <p className="text-xs text-muted-foreground">Streak Médio</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAchievements || 0}</p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Ranking de Pacientes
            </h2>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum paciente no ranking ainda</p>
              <p className="text-sm">Os pacientes aparecerão aqui conforme acumulam XP</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaderboard.map((entry, index) => {
                const RankIcon = RANK_ICONS[index] || Star;
                const rankColor = RANK_COLORS[index] || 'text-muted-foreground';
                const isTopThree = index < 3;

                return (
                  <div
                    key={entry.patient_id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${isTopThree
                        ? 'bg-gradient-to-r from-primary/10 to-transparent border border-primary/20'
                        : 'bg-muted/50 hover:bg-muted'
                      }`}
                  >
                    {/* Rank */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isTopThree ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                      {isTopThree ? (
                        <RankIcon className={`h-5 w-5 ${rankColor}`} />
                      ) : (
                        <span className="font-bold text-muted-foreground">{index + 1}</span>
                      )}
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1">
                      <p className="font-semibold">{entry.patient_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Nível {entry.current_level}
                        </Badge>
                        <span>{entry.title}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-bold text-primary">{entry.total_xp.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">XP</p>
                      </div>
                      <div className="flex items-center gap-1 text-orange-500">
                        <Flame className="h-4 w-4" />
                        <span className="font-bold">{entry.current_streak}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
