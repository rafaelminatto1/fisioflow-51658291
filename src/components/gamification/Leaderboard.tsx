import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  patient_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  display_name: string;
  rank: number;
}

interface LeaderboardProps {
  currentPatientId: string;
}

export function Leaderboard({ currentPatientId }: LeaderboardProps) {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      // Call the secure RPC function
      const { data, error } = await supabase.rpc('get_leaderboard', { limit_count: 50 });
      if (error) throw error;
      return data as LeaderboardEntry[];
    },
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400 fill-gray-400" />;
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

  const currentUserEntry = leaderboard.find(e => e.patient_id === currentPatientId);
  const isTop3 = currentUserEntry && currentUserEntry.rank <= 3;

  return (
    <Card className="border-none shadow-none bg-transparent animate-fade-in">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking Global
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja como você está se saindo em comparação com outros pacientes.
            </p>
          </div>
          {currentUserEntry && (
            <div className="text-right bg-primary/5 p-2 rounded-lg border border-primary/10">
              <p className="text-[10px] uppercase font-bold text-primary/70">Sua Posição</p>
              <p className="text-xl font-black text-primary">#{currentUserEntry.rank}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {!isTop3 && currentUserEntry && (
          <div className="mb-4 p-3 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-lg">
            <p className="text-xs font-medium">
              🌟 Continue assim! Você está a apenas <strong>{leaderboard[0].total_points - currentUserEntry.total_points} pontos</strong> do topo!
            </p>
          </div>
        )}
        <div className="space-y-2">
          {leaderboard.map((entry) => {
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
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border",
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", isCurrentUser && "text-primary font-bold")}>
                        {entry.display_name} {isCurrentUser && "(Você)"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-4 px-1 py-0 text-[9px] border-primary/20">
                          Nível {entry.level}
                        </Badge>
                        <span>•</span>
                        <span>{entry.current_streak} dias seguidos</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold block">{entry.total_points.toLocaleString()}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">Pontos</span>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              Ranking ainda não disponível. Ganhe pontos para participar!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
