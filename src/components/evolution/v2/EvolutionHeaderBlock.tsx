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
      'relative overflow-hidden rounded-xl border border-border/50',
      'bg-gradient-to-br from-card via-card to-muted/20',
      'shadow-sm transition-all duration-300 hover:shadow-md',
      className
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Top accent line with gradient */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Date Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Date and Time */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Calendar className="h-4 w-4 text-primary" />
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
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 shadow-sm">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground leading-none">Sessão</span>
                    <span className="text-sm font-bold text-primary leading-tight">
                      {sessionNumber}{totalSessions ? `/${totalSessions}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Therapist Section */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-muted/50 to-muted border border-border">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-sm font-medium text-foreground">
                {therapistName || 'Terapeuta não selecionado'}
              </span>
              {therapistCrefito && (
                <>
                  <span className="hidden sm:inline text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
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
