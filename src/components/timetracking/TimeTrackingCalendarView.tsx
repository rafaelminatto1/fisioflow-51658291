/**
 * TimeTrackingCalendarView - Visualização em calendário das entradas de tempo
 * Grid semanal com entradas agrupadas por dia
 */

import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { groupByDay, formatDuration } from '@/lib/timetracking/timeCalculator';
import type { TimeEntry } from '@/types/timetracking';

interface TimeTrackingCalendarViewProps {
  entries: TimeEntry[];
  onUpdate?: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  /** Semana inicial (default: semana atual) */
  initialWeekStart?: Date;
}

export function TimeTrackingCalendarView({
  entries,
  initialWeekStart = startOfWeek(new Date(), { locale: ptBR }),
}: TimeTrackingCalendarViewProps) {
  const [weekStart, setWeekStart] = React.useState(initialWeekStart);
  const weekEnd = endOfWeek(weekStart, { locale: ptBR });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dailyBreakdown = groupByDay(entries);
  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    dailyBreakdown.forEach((d) => map.set(d.date, d.entries));
    return map;
  }, [dailyBreakdown]);

  const goPrevWeek = () => setWeekStart((d) => subWeeks(d, 1));
  const goNextWeek = () => setWeekStart((d) => addWeeks(d, 1));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { locale: ptBR }));

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goPrevWeek} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNextWeek} aria-label="Próxima semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Hoje
          </Button>
        </div>
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(weekStart, "d 'de' MMM", { locale: ptBR })} – {format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDate.get(dateKey) ?? [];
          const totalSeconds = dayEntries.reduce((s, e) => s + e.duration_seconds, 0);
          const isToday = isSameDay(day, today);

          return (
            <Card key={dateKey} className={isToday ? 'ring-2 ring-primary/50' : ''}>
              <CardContent className="p-3">
                <div className="text-center mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1.5 min-h-[80px]">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Sem entradas</p>
                  ) : (
                    dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded border bg-muted/30 px-2 py-1.5 text-xs"
                      >
                        <p className="font-medium truncate" title={entry.description}>
                          {entry.description || '—'}
                        </p>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDuration(entry.duration_seconds)}
                          </span>
                          {entry.is_billable && (
                            <Badge variant="secondary" className="text-[10px] px-1">
                              Faturável
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {dayEntries.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t text-center">
                    Total: {formatDuration(totalSeconds)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
