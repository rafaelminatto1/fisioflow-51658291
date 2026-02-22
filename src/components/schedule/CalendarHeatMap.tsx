/**
 * CalendarHeatMap - Mapa de calor da agenda
 *
 * Visualiza a ocupação de slots com cores baseadas em disponibilidade
 * - Verde: Disponível
 * - Amarelo: Média ocupação
 * - Laranja: Alta ocupação
 * - Vermelho: Cheio/Bloqueado
 */

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@/types/appointment';

interface HeatMapSlot {
  date: Date;
  time: string;
  availability: 'available' | 'low' | 'medium' | 'high' | 'full' | 'blocked';
  appointment?: Appointment;
  capacity?: number;
  currentCount?: number;
}

interface CalendarHeatMapProps {
  appointments: Appointment[];
  startDate: Date;
  endDate: Date;
  timeSlots: string[];
  onSlotClick?: (date: Date, time: string) => void;
  className?: string;
  showLabels?: boolean;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const CalendarHeatMap = memo(({
  appointments,
  startDate,
  endDate,
  timeSlots,
  onSlotClick,
  className,
  showLabels = true
}: CalendarHeatMapProps) => {
  // Calcular disponibilidade por slot
  const heatMapData = useMemo(() => {
    const days = eachDayOfInterval(startDate, endDate, { weekStartsOn: 1 });
    const result: HeatMapSlot[] = [];

    for (const day of days) {
      const dayAppointments = appointments.filter(apt => {
        const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
        return isSameDay(aptDate, day);
      });

      // Criar mapa de slots do dia
      const daySlotMap = new Map<string, { count: number; capacity: number; appointment?: Appointment }>();

      for (const apt of dayAppointments) {
        if (!apt.time) continue;

        const aptStart = timeToMinutes(apt.time);
        const duration = apt.duration || 60;
        const aptEnd = aptStart + duration;

        // Encontrar slots que o agendamento ocupa
        for (const slot of timeSlots) {
          const slotStart = timeToMinutes(slot);

          // Se slot está dentro do período do agendamento
          if (slotStart >= aptStart && slotStart < aptEnd) {
            const existing = daySlotMap.get(slot) || { count: 0, capacity: 4 };
            existing.count = Math.min(existing.count + 1, existing.capacity);
            existing.appointment = apt;
            daySlotMap.set(slot, existing);
          }
        }
      }
    }

      // Determinar disponibilidade de cada slot
      for (const slot of timeSlots) {
        const slotInfo = daySlotMap.get(slot);

        if (slotInfo) {
          const occupancy = slotInfo.count / slotInfo.capacity;

          if (occupancy >= 1) {
            result.push({
              date: day,
              time: slot,
              availability: 'full',
              appointment: slotInfo.appointment,
              capacity: slotInfo.capacity,
              currentCount: slotInfo.count
            });
          } else if (occupancy >= 0.75) {
            result.push({
              date: day,
              time: slot,
              availability: 'high',
              appointment: slotInfo.appointment,
              capacity: slotInfo.capacity,
              currentCount: slotInfo.count
            });
          } else if (occupancy >= 0.5) {
            result.push({
              date: day,
              time: slot,
              availability: 'medium',
              appointment: slotInfo.appointment,
              capacity: slotInfo.capacity,
              currentCount: slotInfo.count
            });
          } else if (occupancy > 0) {
            result.push({
              date: day,
              time: slot,
              availability: 'low',
              appointment: slotInfo.appointment,
              capacity: slotInfo.capacity,
              currentCount: slotInfo.count
            });
          } else {
            result.push({
              date: day,
              time: slot,
              availability: 'available',
              capacity: slotInfo.capacity,
              currentCount: 0
            });
          }
        }
      }
    }

    return result;
  }, [appointments, startDate, endDate, timeSlots]);

  // Estilos baseados na disponibilidade
  const getSlotStyles = (availability: HeatMapSlot['availability']) => {
    switch (availability) {
      case 'available':
        return 'bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800';
      case 'low':
        return 'bg-lime-100 dark:bg-lime-900/30 hover:bg-lime-200 dark:hover:bg-lime-900/50 border-lime-200 dark:border-lime-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 border-orange-200 dark:border-orange-800';
      case 'full':
        return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 cursor-not-allowed';
      case 'blocked':
        return 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-50';
      default:
        return 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
    }
  };

  const getSlotTextColor = (availability: HeatMapSlot['availability']) => {
    switch (availability) {
      case 'available':
        return 'text-emerald-800 dark:text-emerald-300';
      case 'low':
        return 'text-lime-800 dark:text-lime-300';
      case 'medium':
        return 'text-yellow-800 dark:text-yellow-300';
      case 'high':
        return 'text-orange-800 dark:text-orange-300';
      case 'full':
        return 'text-red-800 dark:text-red-300';
      case 'blocked':
        return 'text-slate-600 dark:text-slate-400';
      default:
        return 'text-slate-700 dark:text-slate-300';
    }
  };

  const getSlotIcon = (availability: HeatMapSlot['availability']) => {
    if (availability === 'full') return '×';
    if (availability === 'blocked') return '—';
    return '';
  };

  // Agrupar slots por dia
  const daysMap = new Map<string, HeatMapSlot[]>();
  for (const slot of heatMapData) {
    const dayKey = format(slot.date, 'yyyy-MM-dd');
    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, []);
    }
    daysMap.get(dayKey)!.push(slot);
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Legenda do mapa de calor */}
      {showLabels && (
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4 px-4 py-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Ocupação:</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-emerald-500 border-2 border-emerald-600" />
              <span className="text-slate-600 dark:text-slate-400">Disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-lime-500 border-2 border-lime-600" />
              <span className="text-slate-600 dark:text-slate-400">Baixa</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500 border-2 border-yellow-600" />
              <span className="text-slate-600 dark:text-slate-400">Média</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500 border-2 border-orange-600" />
              <span className="text-slate-600 dark:text-slate-400">Alta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-600" />
              <span className="text-slate-600 dark:text-slate-400">Cheio</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid de slots com mapa de calor */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header com dias */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <div className="w-16 shrink-0"></div>
            {Array.from(daysMap.entries()).map(([dayKey]) => {
              const date = new Date(dayKey);
              return (
                <div key={dayKey} className="w-20 shrink-0 text-center py-2 px-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 first:border-l">
                  <div className="text-[11px] leading-tight">
                    {format(date, 'EEE', { locale: ptBR })}
                  </div>
                  <div className="text-[13px] font-bold">
                    {format(date, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linhas de slots */}
          {Array.from(daysMap.entries()).map(([dayKey, slots]) => (
            <div key={dayKey} className="flex border-b border-slate-100 dark:border-slate-900 last:border-b-0">
              {/* Dia da semana */}
              <div className="w-16 shrink-0 flex items-center justify-center py-2 px-1 text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                {format(slots[0]?.date, 'EEE', { locale: ptBR })}
              </div>

              {/* Slots de horário */}
              <div className="flex">
                {slots.map((slot, index) => {
                  const canClick = slot.availability === 'available' && onSlotClick;
                  const slotIcon = getSlotIcon(slot.availability);

                  return (
                    <button
                      key={`${dayKey}-${index}`}
                      onClick={() => canClick && onSlotClick(slot.date, slot.time)}
                      disabled={!canClick}
                      className={cn(
                        'w-20 h-12 shrink-0 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all duration-150',
                        getSlotStyles(slot.availability),
                        canClick && 'hover:scale-105 active:scale-95 hover:z-10',
                        !canClick && 'opacity-50'
                      )}
                      title={canClick ? `${slot.time} - ${slot.currentCount}/${slot.capacity} ocupados` : `${slot.time} - ${slot.availability}`}
                      aria-label={canClick ? `Agendar às ${slot.time}` : slot.availability === 'full' ? `Horário ${slot.time} cheio` : slot.availability === 'blocked' ? `Horário ${slot.time} bloqueado` : ''}
                    >
                      <span className={cn('text-sm font-medium', getSlotTextColor(slot.availability))}>
                        {slotIcon ? (
                          <span className="text-lg">{slotIcon}</span>
                        ) : (
                          slot.time.substring(0, 5)
                        )}
                      </span>

                      {/* Tooltip com detalhes */}
                      {slot.availability !== 'available' && slot.availability !== 'blocked' && slot.appointment && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mb-1 w-32 p-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          <div className="font-semibold mb-1">{slot.appointment.patientName}</div>
                          <div className="text-slate-300 dark:text-slate-600">
                            {slot.appointment.type}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

CalendarHeatMap.displayName = 'CalendarHeatMap';

export { CalendarHeatMap };
