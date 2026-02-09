import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointmentDates?: Date[]; // Datas que têm agendamentos
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onDateSelect,
  appointmentDates = []
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Preenche os dias para começar no domingo
  const firstDayOfWeek = monthStart.getDay();
  const previousMonthDays = Array(firstDayOfWeek).fill(null);

  const allDays = [...previousMonthDays, ...daysInMonth];

  const hasAppointment = (date: Date | null) => {
    if (!date) return false;
    return appointmentDates.some(aptDate => isSameDay(aptDate, date));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="bg-card rounded-2xl shadow-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="h-8 w-8"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h3 className="text-base font-bold">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasApt = hasAppointment(day);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              data-selected={isSelected}
              aria-label={format(day, 'd MMMM yyyy', { locale: ptBR })}
              className={cn(
                'aspect-square rounded-lg text-sm font-medium transition-all duration-200',
                'hover:scale-110 active:scale-95',
                'relative',
                isSelected && 'bg-primary text-primary-foreground shadow-lg scale-110',
                !isSelected && isTodayDate && 'bg-primary/20 text-primary font-bold',
                !isSelected && !isTodayDate && isCurrentMonth && 'hover:bg-muted',
                !isCurrentMonth && 'text-muted-foreground/40'
              )}
            >
              {format(day, 'd')}
              
              {/* Indicador de agendamento */}
              {hasApt && !isSelected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Com agendamentos</span>
        </div>
      </div>
    </div>
  );
};
