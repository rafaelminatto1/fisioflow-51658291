import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Hash, Separator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvolutionHeaderBlockProps {
  therapistName: string;
  therapistCrefito: string;
  sessionDate: string;
  sessionNumber?: number;
  totalSessions?: number;
  className?: string;
}

export const EvolutionHeaderBlock: React.FC<EvolutionHeaderBlockProps> = ({
  therapistName,
  therapistCrefito,
  sessionDate,
  sessionNumber,
  totalSessions,
  className,
}) => {
  const formattedDate = (() => {
    try {
      return format(new Date(sessionDate), "dd/MM/yy", { locale: ptBR });
    } catch {
      return sessionDate;
    }
  })();

  const fullDate = (() => {
    try {
      return format(new Date(sessionDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return sessionDate;
    }
  })();

  return (
    <div className={cn(
      'relative rounded-lg border border-border/60 bg-gradient-to-r from-primary/5 via-background to-primary/5 p-4',
      className
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Date + Therapist */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>{formattedDate}</span>
            <span className="text-muted-foreground font-normal">({fullDate})</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{therapistName || 'Terapeuta não selecionado'}</span>
            {therapistCrefito && (
              <>
                <span className="text-muted-foreground/50">-</span>
                <span className="text-xs font-mono">{therapistCrefito}</span>
              </>
            )}
          </div>
        </div>

        {/* Session number */}
        {sessionNumber && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium self-start sm:self-center">
            <Hash className="h-3.5 w-3.5" />
            <span>Sessão {sessionNumber}{totalSessions ? `/${totalSessions}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};
