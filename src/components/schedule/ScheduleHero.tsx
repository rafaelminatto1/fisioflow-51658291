import { memo } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScheduleStatsCards } from './ScheduleStatsCards';
import type { Appointment } from '@/types/appointment';

interface ScheduleHeroProps {
  currentDate: Date;
  appointments: Appointment[];
  className?: string;
}

const ScheduleHero = memo(({ currentDate, appointments, className }: ScheduleHeroProps) => {
  // Calculate today's stats for subtitle
  const todayStats = (() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    return appointments.filter(apt => {
      try {
        const aptDate = typeof apt.appointmentDate === 'string'
          ? new Date(apt.appointmentDate)
          : apt.appointmentDate;
        return aptDate >= todayStart && aptDate <= todayEnd;
      } catch {
        return false;
      }
    });
  })();

  const formattedMonth = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);
  const hasTodayAppointments = todayStats.length > 0;

  return (
    <section className={cn("schedule-hero", className)}>
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-white/10 opacity-20" aria-hidden="true" />
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
      <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full blur-xl" aria-hidden="true" />

      <div className="schedule-hero-content">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 w-full">
          {/* Title and description */}
          <div className="space-y-2 min-w-0 flex-1 lg:flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm shadow-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Agenda
                </h1>
              </div>
            </div>
            <p className="text-sm xs:text-base text-white/80 flex items-center gap-2 pl-14">
              <CalendarDays className="h-4 w-4 text-white/60" aria-hidden="true" />
              <span className="font-medium">{capitalizedMonth}</span>
              {hasTodayAppointments && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-white/70">
                    {todayStats.length} agendamento{todayStats.length !== 1 ? 's' : ''} hoje
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Stats cards */}
          <ScheduleStatsCards
            appointments={appointments}
            currentDate={currentDate}
          />
        </div>
      </div>
    </section>
  );
});

ScheduleHero.displayName = 'ScheduleHero';

export { ScheduleHero };
export type { ScheduleHeroProps };
