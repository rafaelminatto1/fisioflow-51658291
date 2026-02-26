import React from 'react';
import { MotionCard } from '../MotionCard';
import { cn } from '../../lib/utils';
import { Calendar, User } from 'lucide-react';

export interface EvolutionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string;
  therapistName: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  sessionNumber?: number;
  painLevel?: number;
  onClick?: () => void;
  compact?: boolean;
}

export const EvolutionCard = React.forwardRef<HTMLDivElement, EvolutionCardProps>(
  ({ 
    date, 
    therapistName, 
    subjective, 
    objective, 
    assessment, 
    plan,
    sessionNumber, 
    painLevel,
    onClick, 
    compact = false,
    className, 
    ...props 
  }, ref) => {
    
    return (
      <MotionCard
        ref={ref}
        variant="glass"
        onClick={onClick}
        className={cn(
          "cursor-pointer flex flex-col gap-3 group relative overflow-hidden",
          compact ? "p-3" : "p-4",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{date}</span>
            {sessionNumber && <span className="text-xs opacity-70">• Sessão #{sessionNumber}</span>}
          </div>
          {painLevel !== undefined && (
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              painLevel > 7 ? "bg-red-500/10 text-red-600" :
              painLevel > 3 ? "bg-amber-500/10 text-amber-600" :
              "bg-green-500/10 text-green-600"
            )}>
              Dor: {painLevel}/10
            </div>
          )}
        </div>

        <div className="space-y-2">
          {subjective && (
            <div>
              <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Subjetivo</span>
              <p className="text-sm text-muted-foreground line-clamp-2">{subjective}</p>
            </div>
          )}
          
          {!compact && assessment && (
            <div>
              <span className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Avaliação</span>
              <p className="text-sm text-muted-foreground line-clamp-2">{assessment}</p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground/70">
          <User className="h-3 w-3" />
          <span>{therapistName}</span>
        </div>
      </MotionCard>
    );
  }
);

EvolutionCard.displayName = 'EvolutionCard';
