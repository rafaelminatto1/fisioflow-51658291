import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Trophy, Star, Flame, Target, Award, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  description?: string;
  created_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  unlocked_at?: string;
}

interface ActivityEvent {
  id: string;
  type: 'xp' | 'achievement' | 'level_up' | 'streak' | 'quest';
  title: string;
  description?: string;
  xp?: number;
  created_at: string;
  icon?: string;
}

interface GamificationHistoryProps {
  transactions?: Transaction[];
  achievements?: Achievement[];
  allActivities?: ActivityEvent[];
  patientName?: string;
}

export function GamificationHistory({
  transactions = [],
  achievements = [],
  allActivities = [],
  patientName = 'Paciente',
}: GamificationHistoryProps) {
  // Combinar todas as atividades em um timeline unificado
  const timeline: ActivityEvent[] = [];

  // Adicionar transações de XP
  transactions.forEach(tx => {
    timeline.push({
      id: `tx-${tx.id}`,
      type: 'xp',
      title: tx.reason === 'manual_award' ? 'Bônus do Terapeuta' : 'Atividade Realizada',
      description: tx.description || 'XP ganho por atividade',
      xp: tx.amount,
      created_at: tx.created_at,
      icon: 'Star',
    });
  });

  // Adicionar conquistas desbloqueadas
  achievements.forEach(a => {
    if (a.unlocked_at) {
      timeline.push({
        id: `ach-${a.id}`,
        type: 'achievement',
        title: `Conquista: ${a.title}`,
        description: a.description,
        xp: a.xp_reward,
        created_at: a.unlocked_at,
        icon: a.icon,
      });
    }
  });

  // Adicionar atividades customizadas
  allActivities.forEach(a => {
    timeline.push(a);
  });

  // Ordenar por data (mais recente primeiro)
  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getActivityIcon = (type: string, iconName?: string) => {
    if (iconName && iconName !== 'Star') {
      // Icone customizado da conquista
      return <Award className="h-4 w-4" />;
    }

    switch (type) {
      case 'xp':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'level_up':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'streak':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'quest':
        return <Target className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-primary" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'xp':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'achievement':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'level_up':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'streak':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'quest':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  // Calcular estatísticas
  const totalXPGained = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const achievementsUnlocked = achievements.filter(a => a.unlocked_at).length;
  const currentStreak = Math.max(
    0,
    ...transactions.map(tx => {
      if (tx.reason === 'streak') return tx.amount;
      return 0;
    })
  );

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground/70" />
          Histórico Completo de {patientName}
        </CardTitle>
      </CardHeader>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="xp">Histórico de XP</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma atividade registrada ainda.</p>
                  <p className="text-sm mt-2">As atividades do paciente aparecerão aqui.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {timeline.map((activity, index) => (
                      <div key={activity.id} className="flex gap-3">
                        {/* Linha conectora */}
                        {index !== timeline.length - 1 && (
                          <div className="absolute left-[19px] top-10 w-0.5 h-full bg-border -z-10" />
                        )}

                        {/* Ícone */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                          getActivityColor(activity.type)
                        )}>
                          {getActivityIcon(activity.type, activity.icon)}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                            {activity.xp && (
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                +{activity.xp} XP
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="xp" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Histórico de Pontos</CardTitle>
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  Total: {totalXPGained} XP
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum ponto ganho ainda.</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-500/10 rounded-md text-yellow-600">
                            <Star className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.reason === 'manual_award' ? 'Bônus do Terapeuta' : 'Atividade Realizada'}</p>
                            <p className="text-xs text-muted-foreground">{tx.description || 'XP ganho por atividade'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-600 text-sm">+{tx.amount} XP</span>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conquistas Desbloqueadas</CardTitle>
                <Badge variant="outline" className="gap-1">
                  <Trophy className="h-3 w-3" />
                  {achievementsUnlocked}/{achievements.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {achievements.filter(a => a.unlocked_at).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma conquista desbloqueada ainda.</p>
                  <p className="text-sm mt-2">Continue praticando para ganhar conquistas!</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {achievements
                      .filter(a => a.unlocked_at)
                      .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
                      .map(achievement => (
                        <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                          <div className="p-2 bg-yellow-500/20 rounded-md text-yellow-600">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{achievement.title}</p>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">+{achievement.xp_reward} XP</Badge>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(achievement.unlocked_at!), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-600">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalXPGained}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">XP Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-full text-orange-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Dias Seguidos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-full text-purple-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{achievementsUnlocked}</p>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">Conquistas</p>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
}

export default GamificationHistory;
