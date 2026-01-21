import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Progress } from '@/components/shared/ui/progress';
import { Target, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Goal {
  id: string;
  goal_title: string;
  goal_description?: string;
  target_date?: string;
  target_value?: string;
  status: 'em_andamento' | 'concluido' | 'cancelado';
  completed_at?: string;
}

interface GoalsTrackerProps {
  goals: Goal[];
}

export const GoalsTracker: React.FC<GoalsTrackerProps> = ({ goals }) => {
  const calculateProgress = (goal: Goal) => {
    if (goal.status === 'concluido') return 100;
    if (goal.status === 'cancelado') return 0;
    
    if (!goal.target_date) return 50;
    
    const start = new Date(goal.target_date);
    const now = new Date();
    const total = differenceInDays(start, now);
    
    if (total <= 0) return 100;
    
    return Math.max(0, Math.min(100, 100 - (total / 30) * 100));
  };

  const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const days = differenceInDays(new Date(targetDate), new Date());
    return days;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'default';
      case 'em_andamento': return 'secondary';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const activeGoals = goals.filter(g => g.status === 'em_andamento');
  const completedGoals = goals.filter(g => g.status === 'concluido');

  if (goals.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-secondary" />
            Objetivos do Tratamento
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{activeGoals.length} ativos</Badge>
            <Badge variant="outline">{completedGoals.length} concluídos</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const daysRemaining = getDaysRemaining(goal.target_date);
              
              return (
                <div
                  key={goal.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-all bg-card"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base flex items-center gap-2">
                          {goal.status === 'concluido' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {goal.goal_title}
                        </h4>
                        {goal.goal_description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {goal.goal_description}
                          </p>
                        )}
                      </div>
                      <Badge variant={getStatusColor(goal.status) as 'default' | 'secondary' | 'outline' | 'destructive'}>
                        {goal.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {goal.status === 'em_andamento' && (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-semibold">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        {daysRemaining !== null && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {daysRemaining > 0 ? (
                              <span className="text-muted-foreground">
                                Faltam <strong className="text-foreground">{daysRemaining}</strong> dias
                              </span>
                            ) : daysRemaining === 0 ? (
                              <span className="text-secondary font-medium">Meta hoje!</span>
                            ) : (
                              <span className="text-destructive">
                                Atrasado {Math.abs(daysRemaining)} dias
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    
                    {goal.target_value && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Meta: <strong className="text-foreground">{goal.target_value}</strong>
                        </span>
                      </div>
                    )}
                    
                    {goal.target_date && (
                      <div className="text-xs text-muted-foreground">
                        📅 Prazo: {format(new Date(goal.target_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
