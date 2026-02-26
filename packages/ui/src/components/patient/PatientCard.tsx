import React from 'react';
import { MotionCard } from '../MotionCard';
import { Activity, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PatientCardProps {
  name: string;
  condition?: string;
  status: string;
  lastVisit?: string;
  avatarUrl?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  stats?: {
    sessionsCompleted: number;
    nextAppointment?: string;
  };
  variant?: 'default' | 'compact';
  className?: string;
}

export const PatientCard = React.forwardRef<HTMLDivElement, PatientCardProps>(
  ({ name, condition, status, lastVisit, onClick, actions, stats, variant = 'default', className }, ref) => {
    
    const statusColors: Record<string, string> = {
      'Em Tratamento': 'bg-green-500/10 text-green-700 border-green-200',
      'Alta': 'bg-blue-500/10 text-blue-700 border-blue-200',
      'Inativo': 'bg-gray-500/10 text-gray-700 border-gray-200',
      'Inicial': 'bg-purple-500/10 text-purple-700 border-purple-200',
    };

    const statusStyle = statusColors[status] || 'bg-secondary text-secondary-foreground';

    return (
      <MotionCard
        ref={ref}
        variant="glass"
        hoverEffect={true}
        onClick={onClick}
        className={cn(
          "cursor-pointer group relative overflow-hidden", 
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                {name}
              </h3>
              {condition && (
                <p className="text-sm text-muted-foreground">{condition}</p>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", statusStyle)}>
                  {status}
                </span>
              </div>
            </div>
          </div>
          
          {actions && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>

        {stats && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>{stats.sessionsCompleted} sessões</span>
            </div>
            {stats.nextAppointment && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{stats.nextAppointment}</span>
              </div>
            )}
          </div>
        )}
      </MotionCard>
    );
  }
);

PatientCard.displayName = 'PatientCard';
