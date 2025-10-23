import React, { useMemo } from 'react';
import { format, isSameDay, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, TrendingUp } from 'lucide-react';
import { AppointmentCard } from './AppointmentCard';
import { EmptyState } from '@/components/ui';
import type { Appointment } from '@/types/appointment';

interface AppointmentListViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  onAppointmentClick: (appointment: Appointment) => void;
}

export const AppointmentListView: React.FC<AppointmentListViewProps> = ({
  appointments,
  selectedDate,
  onAppointmentClick
}) => {
  // Filtra e agrupa agendamentos por horário
  const sortedAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        const aptDate = typeof apt.date === 'string' ? new Date(apt.date) : apt.date;
        return isSameDay(aptDate, selectedDate);
      })
      .sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [appointments, selectedDate]);

  // Agrupa por período do dia
  const groupedAppointments = useMemo(() => {
    const groups = {
      morning: [] as Appointment[],
      afternoon: [] as Appointment[],
      evening: [] as Appointment[]
    };

    sortedAppointments.forEach(apt => {
      const hour = parseInt(apt.time?.split(':')[0] || '0');
      if (hour < 12) {
        groups.morning.push(apt);
      } else if (hour < 18) {
        groups.afternoon.push(apt);
      } else {
        groups.evening.push(apt);
      }
    });

    return groups;
  }, [sortedAppointments]);

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hoje';
    if (isTomorrow(selectedDate)) return 'Amanhã';
    if (isYesterday(selectedDate)) return 'Ontem';
    return format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const stats = useMemo(() => {
    const total = sortedAppointments.length;
    const confirmed = sortedAppointments.filter(apt => apt.status === 'confirmado').length;
    const completed = sortedAppointments.filter(apt => apt.status === 'concluido').length;
    
    return { total, confirmed, completed };
  }, [sortedAppointments]);

  if (sortedAppointments.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-1">{getDateLabel()}</h2>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        
        <EmptyState
          icon={Calendar}
          title="Nenhum agendamento"
          description={`Não há agendamentos para ${getDateLabel().toLowerCase()}`}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header com data e estatísticas */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm border-b p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{getDateLabel()}</h2>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">{stats.total}</span>
          </div>
        </div>
        
        {/* Mini stats */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-1.5 font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {stats.confirmed} confirmados
          </div>
          <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg px-3 py-1.5 font-medium">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            {stats.completed} concluídos
          </div>
        </div>
      </div>

      {/* Lista de agendamentos agrupados */}
      <div className="p-4 sm:p-6 space-y-6">
        {groupedAppointments.morning.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                🌅 Manhã
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            
            {groupedAppointments.morning.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => onAppointmentClick(apt)}
                variant="compact"
              />
            ))}
          </div>
        )}

        {groupedAppointments.afternoon.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                ☀️ Tarde
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            
            {groupedAppointments.afternoon.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => onAppointmentClick(apt)}
                variant="compact"
              />
            ))}
          </div>
        )}

        {groupedAppointments.evening.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                🌙 Noite
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            
            {groupedAppointments.evening.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={() => onAppointmentClick(apt)}
                variant="compact"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
