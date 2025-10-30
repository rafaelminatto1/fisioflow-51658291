import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  Flame, 
  Target, 
  Award,
  TrendingUp,
  Zap,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
}

interface PatientGamificationProps {
  patientId: string;
}

export function PatientGamification({ patientId }: PatientGamificationProps) {
  const [level, setLevel] = useState(3);
  const [xp, setXp] = useState(750);
  const [streak, setStreak] = useState(5);
  const [totalPoints, setTotalPoints] = useState(1250);
  
  const xpToNextLevel = 1000;
  const xpProgress = (xp / xpToNextLevel) * 100;

  const achievements: Achievement[] = [
    {
      id: '1',
      title: '🔥 Sequência de Fogo',
      description: 'Complete exercícios por 7 dias seguidos',
      icon: Flame,
      color: 'text-orange-500',
      progress: 5,
      maxProgress: 7,
      completed: false
    },
    {
      id: '2',
      title: '🎯 Precisão Total',
      description: 'Complete 20 exercícios com perfeição',
      icon: Target,
      color: 'text-blue-500',
      progress: 20,
      maxProgress: 20,
      completed: true
    },
    {
      id: '3',
      title: '⚡ Superação',
      description: 'Melhore sua pontuação de dor em 50%',
      icon: Zap,
      color: 'text-yellow-500',
      progress: 30,
      maxProgress: 50,
      completed: false
    },
    {
      id: '4',
      title: '❤️ Dedicação',
      description: 'Participe de 30 sessões',
      icon: Heart,
      color: 'text-red-500',
      progress: 18,
      maxProgress: 30,
      completed: false
    }
  ];

  const recentRewards = [
    { title: '+50 XP', description: 'Exercícios completados', time: '2h atrás' },
    { title: '+100 XP', description: 'Sessão de fisioterapia', time: '1 dia atrás' },
    { title: '+25 XP', description: 'Check-in diário', time: '2 dias atrás' },
  ];

  return (
    <div className="space-y-6">
      {/* Level and Progress Card */}
      <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-primary rounded-xl shadow-medical">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">Nível {level}</p>
                <p className="text-sm text-muted-foreground">Fisioterapeuta em Treinamento</p>
              </div>
            </div>
            <Badge className="text-lg px-4 py-2 bg-gradient-primary">
              {totalPoints} pontos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso para Nível {level + 1}</span>
              <span className="font-bold">{xp} / {xpToNextLevel} XP</span>
            </div>
            <Progress value={xpProgress} className="h-3" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-xs text-muted-foreground">Dias de sequência</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Conquistas</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-xl">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">89%</p>
              <p className="text-xs text-muted-foreground">Melhora</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Conquistas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <Card 
                key={achievement.id}
                className={cn(
                  "transition-all hover:shadow-lg",
                  achievement.completed && "border-2 border-primary/50 bg-primary/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-3 rounded-lg",
                      achievement.completed ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn("h-6 w-6", achievement.color)} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        {achievement.completed && (
                          <Badge variant="default" className="bg-green-500">
                            Completo!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                      {!achievement.completed && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progresso</span>
                            <span className="font-medium">
                              {achievement.progress} / {achievement.maxProgress}
                            </span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.maxProgress) * 100}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Recompensas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRewards.map((reward, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{reward.title}</p>
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{reward.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Motivational Banner */}
      <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-background border-2 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-full">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">Continue assim! 🎉</h4>
              <p className="text-muted-foreground">
                Você está a apenas <strong>250 XP</strong> de atingir o Nível {level + 1}!
                Complete seus exercícios diários para manter a sequência.
              </p>
            </div>
            <Button className="shadow-lg">
              Ver Exercícios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
