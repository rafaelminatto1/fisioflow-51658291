import { memo } from 'react';
import { CalendarCheck, Clock, User, TrendingUp } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';

interface ScheduleStatsCardsProps {
  appointments: Appointment[];
  currentDate: Date;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: number;
  variant?: 'default' | 'success' | 'warning';
}

const StatCard = memo(({ icon, value, label, trend, _variant = 'default' }: StatCardProps) => {
  return (
    <div className="stat-card group cursor-default" role="article" aria-label={`${label}: ${value}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-shrink-0 p-1.5 bg-white/10 rounded-lg group-hover:bg-white/15 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg xs:text-xl truncate tabular-nums">
            {value}
          </p>
        </div>
      </div>
      <p className="text-white/70 text-[10px] xs:text-xs truncate font-medium">{label}</p>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-1.5 text-[9px] xs:text-[10px] font-medium",
          trend > 0 ? "text-green-200" : trend < 0 ? "text-red-200" : "text-white/60"
        )}>
          <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
});

StatCard.displayName = 'StatCard';

const ScheduleStatsCards = memo(({ appointments, _currentDate, className }: ScheduleStatsCardsProps) => {
  // Calculate stats for today
  const todayStats = (() => {
    const todayAppointments = appointments.filter(apt => {
      try {
        const aptDate = typeof apt.appointmentDate === 'string'
          ? parseISO(apt.appointmentDate)
          : apt.appointmentDate;
        return isToday(aptDate);
      } catch {
        return false;
      }
    });

    const confirmed = todayAppointments.filter(
      apt => apt.status === 'confirmed' || apt.status === 'agendado'
    ).length;

    const completed = todayAppointments.filter(
      apt => apt.status === 'completed' || apt.status === 'concluido'
    ).length;

    const total = todayAppointments.length;
    const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    // Find next appointment
    const now = new Date();
    const nextAppointment = todayAppointments
      .filter(apt => {
        try {
          const aptDate = typeof apt.appointmentDate === 'string'
            ? parseISO(apt.appointmentDate)
            : apt.appointmentDate;
          const [hours, minutes] = apt.appointmentTime.split(':').map(Number);
          const aptDateTime = new Date(aptDate);
          aptDateTime.setHours(hours, minutes, 0, 0);
          return aptDateTime > now;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))[0];

    return {
      total,
      completed,
      confirmed,
      confirmationRate,
      nextAppointment
    };
  })();

  return (
    <div className={cn(
      "flex items-center gap-2 xs:gap-3 overflow-x-auto pb-1 scrollbar-hide flex-shrink-0",
      className
    )} role="group" aria-label="Estatísticas da agenda">
      {/* Today's Total */}
      <StatCard
        icon={<CalendarCheck className="h-4 w-4 xs:h-5 xs:w-5 text-white" strokeWidth={2.5} />}
        value={`${todayStats.completed}/${todayStats.total}`}
        label="Completados/Hoje"
      />

      {/* Confirmation Rate */}
      <StatCard
        icon={<TrendingUp className="h-4 w-4 xs:h-5 xs:w-5 text-white" strokeWidth={2.5} />}
        value={`${todayStats.confirmationRate}%`}
        label="Taxa de confirmação"
        trend={todayStats.confirmationRate >= 70 ? 5 : -5}
        variant={todayStats.confirmationRate >= 70 ? 'success' : 'warning'}
      />

      {/* Next Appointment */}
      {todayStats.nextAppointment ? (
        <StatCard
          icon={<Clock className="h-4 w-4 xs:h-5 xs:w-5 text-white" strokeWidth={2.5} />}
          value={todayStats.nextAppointment.appointmentTime}
          label={`Próximo: ${todayStats.nextAppointment.patientName.split(' ')[0]}`}
        />
      ) : (
        <StatCard
          icon={<User className="h-4 w-4 xs:h-5 xs:w-5 text-white/70" strokeWidth={2} />}
          value="--:--"
          label="Sem próximos agendamentos"
        />
      )}
    </div>
  );
});

ScheduleStatsCards.displayName = 'ScheduleStatsCards';

export { ScheduleStatsCards };
export type { ScheduleStatsCardsProps };
