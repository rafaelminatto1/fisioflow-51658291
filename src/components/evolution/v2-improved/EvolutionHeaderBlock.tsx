/**
 * EvolutionHeaderBlock - Improved V2
 *
 * Enhanced header block with better visual hierarchy,
 * professional design, and improved information architecture.
 */
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Hash, Clock } from 'lucide-react';
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
      return format(new Date(sessionDate), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return sessionDate;
    }
  })();

  const formattedDayOfWeek = (() => {
    try {
      return format(new Date(sessionDate), "EEEE", { locale: ptBR });
    } catch {
      return '';
    }
  })();

  const formattedTime = (() => {
    try {
      return format(new Date(sessionDate), "HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  })();

  return (
    <div className={cn(
      'relative transition-all duration-300 group',
      className
    )}>
      <div className="relative px-2 py-2">
        <div className="flex flex-col gap-3">
          {/* Date Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Date and Time */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/30">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground tracking-tight">
                  {formattedDate}
                </span>
                {formattedDayOfWeek && (
                  <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formattedDayOfWeek} {formattedTime && `· ${formattedTime}`}
                  </span>
                )}
              </div>
            </div>

            {/* Session Number Pill */}
            {sessionNumber && (
              <div className="flex items-center self-start sm:self-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground leading-none">Sessão</span>
                    <span className="text-sm font-semibold text-foreground leading-tight">
                      {sessionNumber}{totalSessions ? `/${totalSessions}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Therapist Section */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted/30">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-sm font-medium text-foreground">
                {therapistName || 'Terapeuta não selecionado'}
              </span>
              {therapistCrefito && (
                <>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {therapistCrefito}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
