import React, { useMemo, useState, useRef, useCallback } from 'react';
import { format, isSameDay, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { SwipeableAppointmentCard } from './SwipeableAppointmentCard';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/types/appointment';

interface AppointmentListViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  onAppointmentClick: (appointment: Appointment) => void;
  onRefresh?: () => Promise<void>;
}

export const AppointmentListView: React.FC<AppointmentListViewProps> = ({
  appointments,
  selectedDate,
  onAppointmentClick,
  onRefresh
}) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && startY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, Math.min(currentY - startY.current, 120));
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80 && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        toast({
          title: "Atualizado!",
          description: "Lista de agendamentos atualizada",
        });
      } catch {
        toast({
          title: "Erro ao atualizar",
          description: "Tente novamente",
          variant: "destructive"
        });
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  };

  // Swipe action handlers - memoized to prevent re-renders
  const handleConfirm = useCallback((_id: string) => {
    toast({
      title: "Agendamento confirmado",
      description: "O paciente será notificado",
    });
  }, [toast]);

  const handleCancel = useCallback((_id: string) => {
    toast({
      title: "Agendamento cancelado",
      description: "O paciente será notificado",
      variant: "destructive"
    });
  }, [toast]);

  const handleCall = useCallback((_id: string) => {
    toast({
      title: "Iniciando ligação...",
    });
  }, [toast]);

  const handleWhatsApp = useCallback((_id: string) => {
    toast({
      title: "Abrindo WhatsApp...",
    });
  }, [toast]);

  // Wrapper handler for appointment click - memoized to prevent inline function creation
  const handleAppointmentClickWrapper = useCallback((appointment: Appointment) => {
    onAppointmentClick(appointment);
  }, [onAppointmentClick]);

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

  const getDateLabel = useMemo(() => {
    if (isToday(selectedDate)) return 'Hoje';
    if (isTomorrow(selectedDate)) return 'Amanhã';
    if (isYesterday(selectedDate)) return 'Ontem';
    return format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  }, [selectedDate]);

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
          <h2 className="text-xl font-bold mb-1">{getDateLabel}</h2>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        
        <EmptyState
          icon={Calendar}
          title="Nenhum agendamento"
          description={`Não há agendamentos para ${getDateLabel.toLowerCase()}`}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center py-2 transition-all duration-200"
          style={{ 
            height: pullDistance,
            opacity: pullDistance / 80
          }}
        >
          <RefreshCw 
            className={`h-6 w-6 text-primary ${pullDistance > 80 || isRefreshing ? 'animate-spin' : ''}`}
          />
        </div>
      )}

      {/* Header com data e estatísticas */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm border-b p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{getDateLabel}</h2>
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
              <SwipeableAppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={handleAppointmentClickWrapper}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
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
              <SwipeableAppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={handleAppointmentClickWrapper}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
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
              <SwipeableAppointmentCard
                key={apt.id}
                appointment={apt}
                onClick={handleAppointmentClickWrapper}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
