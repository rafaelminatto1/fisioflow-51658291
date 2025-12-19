import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PatientGoal } from '@/types/evolution';
import { cn } from '@/lib/utils';

interface GoalCountdownProps {
  goal: PatientGoal;
  compact?: boolean;
  onClick?: () => void;
}

export const GoalCountdown: React.FC<GoalCountdownProps> = ({
  goal,
  compact = false,
  onClick,
}) => {
  const calculateDaysRemaining = () => {
    if (!goal.target_date) return null;
    return differenceInDays(new Date(goal.target_date), new Date());
  };

  const daysRemaining = calculateDaysRemaining();

  const getStatusConfig = () => {
    if (goal.status === 'concluido') {
      return {
        color: 'bg-green-500/10 text-green-600 border-green-500/30',
        icon: CheckCircle2,
        label: 'Concluído',
      };
    }

    if (daysRemaining === null) {
      return {
        color: 'bg-muted text-muted-foreground border-border',
        icon: Target,
        label: 'Sem prazo',
      };
    }

    if (daysRemaining < 0) {
      return {
        color: 'bg-red-500/10 text-red-600 border-red-500/30',
        icon: AlertTriangle,
        label: 'Vencido',
      };
    }

    if (daysRemaining <= 7) {
      return {
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        icon: Clock,
        label: `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`,
      };
    }

    if (daysRemaining <= 30) {
      return {
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        icon: Clock,
        label: `${daysRemaining} dias`,
      };
    }

    return {
      color: 'bg-muted text-foreground border-border',
      icon: Target,
      label: `${daysRemaining} dias`,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getPriorityColor = () => {
    switch (goal.priority) {
      case 'critica':
        return 'bg-red-500 text-white';
      case 'alta':
        return 'bg-amber-500 text-white';
      case 'media':
        return 'bg-blue-500 text-white';
      case 'baixa':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = () => {
    switch (goal.priority) {
      case 'critica':
        return 'Crítica';
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Média';
      case 'baixa':
        return 'Baixa';
      default:
        return goal.priority;
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors',
          config.color
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs truncate">{goal.goal_title}</p>
            {goal.target_value && (
              <p className="text-[10px] opacity-70 flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                Meta: {goal.target_value}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 shrink-0', config.color)}
          >
            <Icon className="h-2.5 w-2.5 mr-0.5" />
            {config.label}
          </Badge>
        </div>
        {goal.status === 'em_andamento' && (
          <Progress value={goal.current_progress} className="h-1 mt-2" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all',
        config.color
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold">{goal.goal_title}</h4>
          {goal.goal_description && (
            <p className="text-sm opacity-80 mt-1">{goal.goal_description}</p>
          )}
        </div>
        <Badge className={cn('text-xs', getPriorityColor())}>{getPriorityLabel()}</Badge>
      </div>

      {goal.status === 'em_andamento' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Progresso</span>
            <span className="font-semibold">{goal.current_progress}%</span>
          </div>
          <Progress value={goal.current_progress} className="h-2" />
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-current/10">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{config.label}</span>
        </div>

        {goal.target_date && (
          <span className="text-xs opacity-70">
            {format(new Date(goal.target_date), "dd 'de' MMM", { locale: ptBR })}
          </span>
        )}

        {goal.target_value && (
          <Badge variant="outline" className="text-xs">
            Meta: {goal.target_value}
          </Badge>
        )}
      </div>
    </div>
  );
};
