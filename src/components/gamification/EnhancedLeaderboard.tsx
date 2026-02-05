import { useQuery } from '@tanstack/react-query';
import { db, collection, query as firestoreQuery, orderBy, limit, getDocs, QueryDocumentSnapshot } from '@/integrations/firebase/app';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Trophy,
  Medal,
  Crown,
  User,
  Loader2,
  Search,
  TrendingUp,
  Flame,
  Star,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import type { LeaderboardEntry } from '@/types/gamification';

/**
 * Tipos de filtros do leaderboard
 */
type LeaderboardPeriod = 'week' | 'month' | 'all';
type LeaderboardCategory = 'level' | 'xp' | 'streak' | 'achievements';
type LeaderboardSort = 'level' | 'total_xp' | 'current_streak' | 'achievements_count';

interface EnhancedLeaderboardProps {
  currentPatientId: string;
  locale?: 'pt' | 'en';
}

/**
 * Componente Leaderboard Melhorado
 *
 * Exibe rankings globais e por categoria com filtros
 */
export function EnhancedLeaderboard({
  currentPatientId,
  locale = 'pt'
}: EnhancedLeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [searchQuery, setSearchQuery] = useState('');

  // Buscar dados do leaderboard
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['enhanced-leaderboard', period, category],
    queryFn: async () => {
      // Query Firebase Firestore for leaderboard data
      const gamificationRef = collection(db, 'patient_gamification');
      const q = firestoreQuery(gamificationRef, orderBy('total_points', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);

      let entries: LeaderboardEntry[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        entries.push({
          patient_id: doc.id,
          display_name: data.display_name || 'Paciente',
          level: data.level || 1,
          total_xp: data.total_points || 0,
          current_streak: data.current_streak || 0,
          achievements_count: data.achievements_count || 0,
          rank: 0 // Will be set after sorting
        } as LeaderboardEntry);
      });

      // Ordenar baseado na categoria selecionada
      const sortField: LeaderboardSort = category === 'level' ? 'level' :
                                        category === 'xp' ? 'total_xp' :
                                        category === 'streak' ? 'current_streak' :
                                        'achievements_count';

      entries = entries.sort((a, b) => b[sortField] - a[sortField]);

      // Adicionar rank
      entries = entries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return entries;
    },
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Filtrar por busca
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery) return leaderboard;

    const searchLower = searchQuery.toLowerCase();
    return leaderboard.filter(entry =>
      entry.display_name.toLowerCase().includes(searchLower)
    );
  }, [leaderboard, searchQuery]);

  // Entrada do usuário atual
  const currentUserEntry = useMemo(() => {
    return leaderboard.find(e => e.patient_id === currentPatientId);
  }, [leaderboard, currentPatientId]);

  const isTop3 = currentUserEntry && currentUserEntry.rank <= 3;

  // Traduções
  const t = {
    title: locale === 'pt' ? 'Ranking Global' : 'Global Ranking',
    subtitle: locale === 'pt'
      ? 'Veja como você está se saindo em comparação com outros pacientes'
      : 'See how you compare to other patients',
    yourPosition: locale === 'pt' ? 'Sua Posição' : 'Your Position',
    pointsToTop: locale === 'pt'
      ? 'Continue assim! Você está a apenas'
      : 'Keep it up! You are only',
    pointsAway: locale === 'pt'
      ? 'pontos do topo!'
      : 'points from the top!',
    noRanking: locale === 'pt'
      ? 'Ranking ainda não disponível. Ganhe pontos para participar!'
      : 'Ranking not yet available. Earn points to participate!',
    searchPlaceholder: locale === 'pt'
      ? 'Buscar paciente...'
      : 'Search patient...',
    tabs: {
      all: locale === 'pt' ? 'Todos' : 'All',
      week: locale === 'pt' ? 'Semana' : 'Week',
      month: locale === 'pt' ? 'Mês' : 'Month'
    },
    categories: {
      xp: locale === 'pt' ? 'Por XP' : 'By XP',
      level: locale === 'pt' ? 'Por Nível' : 'By Level',
      streak: locale === 'pt' ? 'Por Streak' : 'By Streak',
      achievements: locale === 'pt' ? 'Por Conquistas' : 'By Achievements'
    },
    stats: {
      level: locale === 'pt' ? 'Nível' : 'Level',
      points: locale === 'pt' ? 'Pontos' : 'Points',
      streak: locale === 'pt' ? 'Dias' : 'Days',
      achievements: locale === 'pt' ? 'Conquistas' : 'Badges'
    },
    rank: locale === 'pt' ? 'Você' : 'You'
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-500 fill-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-700 fill-amber-700" />;
      default:
        return <span className="text-muted-foreground font-bold w-6 text-center">{rank}</span>;
    }
  };

  const getRowStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20";
    if (rank === 1) return "bg-yellow-500/5 border-yellow-500/20";
    if (rank === 2) return "bg-gray-400/5 border-gray-400/20";
    if (rank === 3) return "bg-amber-700/5 border-amber-700/20";
    return "hover:bg-muted/50";
  };

  const getCategoryIcon = (cat: LeaderboardCategory) => {
    switch (cat) {
      case 'xp':
        return <Star className="h-4 w-4" />;
      case 'level':
        return <TrendingUp className="h-4 w-4" />;
      case 'streak':
        return <Flame className="h-4 w-4" />;
      case 'achievements':
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getPeriodIcon = (per: LeaderboardPeriod) => {
    switch (per) {
      case 'week':
      case 'month':
        return <Calendar className="h-4 w-4" />;
      case 'all':
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getDisplayValue = (entry: LeaderboardEntry, cat: LeaderboardCategory) => {
    switch (cat) {
      case 'xp':
        return entry.total_xp.toLocaleString();
      case 'level':
        return entry.level;
      case 'streak':
        return entry.current_streak;
      case 'achievements':
        return entry.achievements_count || 0;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent animate-fade-in">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              {t.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t.subtitle}
            </p>
          </div>

          {/* Current User Position */}
          {currentUserEntry && (
            <div className="text-right bg-primary/5 p-3 rounded-lg border border-primary/10 min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-primary/70">{t.yourPosition}</p>
              <p className="text-2xl font-black text-primary">#{currentUserEntry.rank}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="week" className="gap-2">
              {getPeriodIcon('week')}
              {t.tabs.week}
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-2">
              {getPeriodIcon('month')}
              {t.tabs.month}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              {getPeriodIcon('all')}
              {t.tabs.all}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(Object.keys(t.categories) as LeaderboardCategory[]).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
              className="gap-2"
            >
              {getCategoryIcon(cat)}
              {t.categories[cat]}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {/* Motivation Message */}
        {!isTop3 && currentUserEntry && filteredLeaderboard.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-lg">
            <p className="text-sm font-medium">
              🌟 {t.pointsToTop} <strong>
                {getDisplayValue(filteredLeaderboard[0], category) - getDisplayValue(currentUserEntry, category)}
              </strong> {t.pointsAway}
            </p>
          </div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-2">
          {filteredLeaderboard.map((entry) => {
            const isCurrentUser = entry.patient_id === currentPatientId;

            return (
              <div
                key={entry.patient_id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  getRowStyle(entry.rank, isCurrentUser)
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border",
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", isCurrentUser && "text-primary font-bold")}>
                        {entry.display_name} {isCurrentUser && `(${t.rank})`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-4 px-1 py-0 text-[9px] border-primary/20">
                          {t.stats.level} {entry.level}
                        </Badge>
                        <span>•</span>
                        <span>{entry.current_streak} {locale === 'pt' ? 'dias' : 'days'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <span className="font-bold block">
                    {getDisplayValue(entry, category)}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {t.stats[category]}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredLeaderboard.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              {searchQuery
                ? locale === 'pt'
                  ? 'Nenhum paciente encontrado.'
                  : 'No patients found.'
                : t.noRanking
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
