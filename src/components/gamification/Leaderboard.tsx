import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown, TrendingUp, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getFirebaseFunctions } from '@/integrations/firebase/app';
import { httpsCallable } from 'firebase/functions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  patientId: string;
  level: number;
  xp: number;
  streak: number;
  isCurrentUser: boolean;
}

export function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const functions = getFirebaseFunctions();
      const getLeaderboardFn = httpsCallable(functions, 'getLeaderboard');
      const result = await getLeaderboardFn();
      return result.data as { leaderboard: LeaderboardEntry[] };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-slate-400 fill-slate-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
      default: return <span className="text-lg font-bold text-slate-400 w-6 text-center">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Ranking da Clínica</CardTitle>
            <CardDescription>Veja quem está liderando a jornada de saúde</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data?.leaderboard.map((user) => (
            <div 
              key={user.patientId}
              className={cn(
                "flex items-center justify-between p-4 transition-colors",
                user.isCurrentUser ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(user.rank)}
                </div>
                
                <Avatar className={cn(
                  "h-10 w-10 border-2",
                  user.rank === 1 ? "border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]" : "border-transparent"
                )}>
                  <AvatarFallback className="bg-slate-100 font-bold text-slate-500">
                    {user.isCurrentUser ? "EU" : `P${user.rank}`}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col">
                  <span className={cn(
                    "font-bold text-sm",
                    user.isCurrentUser ? "text-primary" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {user.isCurrentUser ? "Você" : `Paciente #${user.patientId.slice(0, 4)}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">Nível {user.level}</Badge>
                    {user.streak >= 3 && (
                      <div className="flex items-center gap-0.5 text-orange-500 text-[10px] font-bold">
                        <Flame className="w-3 h-3 fill-orange-500" />
                        {user.streak}d
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {user.xp.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">XP Total</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
