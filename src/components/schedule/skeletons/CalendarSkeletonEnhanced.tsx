/**
 * Calendar Skeleton Enhanced - Skeletons animados e temáticos para calendário
 *
 * Skeletons melhorados com:
 * - Animações de pulso suave
 * - Tema de fisioterapia
 * - Feedback visual mais rico
 * - Acessibilidade melhorada
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface CalendarSkeletonProps {
  viewType?: 'day' | 'week' | 'month' | 'list';
  className?: string;
  count?: number; // Número de slots/dias a mostrar
}

// Componente de loading animado (tema fisioterapia)
const PulseLoader = memo(() => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-primary/20 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary animate-bounce">
              {/* Ícone de carregamento simples */}
              <div className="w-4 h-0.5 bg-white/50 rounded-full mx-auto mt-3" />
              <div className="w-2 h-2 bg-white/50 rounded-full mx-auto mt-0.5" />
            </div>
          </div>
        </div>
        {/* Ondas de carregamento */}
        <div className="absolute -inset-2 flex items-center justify-center">
          <div className="w-20 h-20 border-2 border-primary/20 rounded-full animate-[spin_3s_linear_infinite]">
            <div className="w-2 h-2 bg-primary/30 rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
            <div className="w-2 h-2 bg-primary/30 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
});

PulseLoader.displayName = 'PulseLoader';

// Skeleton de slot individual
const SlotSkeleton = memo(({ className }: { className?: string }) => {
  return (
    <div className={cn('rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse', className)}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="w-24 h-4 rounded-md bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="w-16 h-4 rounded-md bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
});

SlotSkeleton.displayName = 'SlotSkeleton';

// Skeleton de card de agendamento
const AppointmentCardSkeleton = memo(() => {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 w-3/4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse mb-2" />
            <div className="h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="mb-4">
          <div className="h-12 w-32 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
});

AppointmentCardSkeleton.displayName = 'AppointmentCardSkeleton';

// Skeleton para view de dia
const DayViewSkeleton = memo(() => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 14 }).map((_, i) => (
        <SlotSkeleton key={i} />
      ))}
    </div>
  );
});

DayViewSkeleton.displayName = 'DayViewSkeleton';

// Skeleton para view de semana
const WeekViewSkeleton = memo(() => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, dayIndex) => (
        <div key={dayIndex} className="space-y-2">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="text-sm font-semibold text-slate-400">Dia {dayIndex + 1}</div>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="py-2 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SlotSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

WeekViewSkeleton.displayName = 'WeekViewSkeleton';

// Skeleton para view de mês
const MonthViewSkeleton = memo(() => {
  return (
    <div className="space-y-4">
      {/* Skeleton do header do mês */}
      <div className="flex items-center justify-between p-4 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="h-6 w-32 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-10 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Skeleton dos dias do mês */}
      <div className="grid grid-cols-7 gap-2 px-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square">
            <div className="h-full w-full rounded-lg bg-slate-50 dark:bg-slate-900/50 p-2">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

MonthViewSkeleton.displayName = 'MonthViewSkeleton';

const CalendarSkeletonEnhanced = memo(({
  viewType = 'day',
  className,
  count = 10
}: CalendarSkeletonProps) => {
  return (
    <div className={cn('py-4', className)} aria-live="polite" aria-busy="true">
      {(() => {
        switch (viewType) {
          case 'day':
            return <DayViewSkeleton />;
          case 'week':
            return <WeekViewSkeleton />;
          case 'month':
            return <MonthViewSkeleton />;
          case 'list':
            return (
              <div className="space-y-3">
                {Array.from({ length: count }).map((_, i) => (
                  <AppointmentCardSkeleton key={i} />
                ))}
              </div>
            );
          default:
            return <DayViewSkeleton />;
        }
      })()}
    </div>
  );
});

CalendarSkeletonEnhanced.displayName = 'CalendarSkeletonEnhanced';

export { CalendarSkeletonEnhanced, PulseLoader };
