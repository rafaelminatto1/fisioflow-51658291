import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths, 
  subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Appointment, EnhancedAppointment } from '@/types';
import { EnhancedAppointment as ExtendedAppointment } from '@/types/appointment';

interface MonthlyCalendarViewProps {
  appointments: (Appointment | EnhancedAppointment | ExtendedAppointment)[];
  currentDate?: Date;
  onDateClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment | EnhancedAppointment | ExtendedAppointment) => void;
  onMonthChange?: (date: Date) => void;
  showWeekends?: boolean;
  className?: string;
}

export const MonthlyCalendarView = ({
  appointments,
  currentDate,
  onDateClick,
  onAppointmentClick,
  onMonthChange,
  showWeekends = true,
  className
}: MonthlyCalendarViewProps) => {
  const [internalCurrentMonth, setInternalCurrentMonth] = useState(currentDate || new Date());
  const currentMonth = currentDate || internalCurrentMonth;

  // Generate calendar days including previous/next month days for complete weeks
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group appointments by date for efficient lookup
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, (Appointment | EnhancedAppointment | ExtendedAppointment)[]>();
    
    appointments.forEach(appointment => {
      const dateKey = format(appointment.date, 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(appointment);
    });

    // Sort appointments by time for each date
    grouped.forEach(dayAppointments => {
      dayAppointments.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
    });

    return grouped;
  }, [appointments]);

  const getAppointmentsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return appointmentsByDate.get(dateKey) || [];
  };

  const getTypeColor = (appointment: Appointment | EnhancedAppointment | ExtendedAppointment) => {
    // Use appointment color if available (EnhancedAppointment)
    if ('color' in appointment && appointment.color) {
      return {
        backgroundColor: `${appointment.color}20`,
        borderColor: appointment.color,
        color: appointment.color
      };
    }
    
    // Fallback to type-based colors
    const colorMap = {
      'Consulta Inicial': { bg: 'bg-emerald-500/20', text: 'text-emerald-700', border: 'border-emerald-200' },
      'Fisioterapia': { bg: 'bg-blue-500/20', text: 'text-blue-700', border: 'border-blue-200' },
      'Reavaliação': { bg: 'bg-purple-500/20', text: 'text-purple-700', border: 'border-purple-200' },
      'Consulta de Retorno': { bg: 'bg-amber-500/20', text: 'text-amber-700', border: 'border-amber-200' },
    };
    
    const colors = colorMap[appointment.type as keyof typeof colorMap];
    return colors ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-muted text-muted-foreground border-border';
  };

  const previousMonth = () => {
    const newDate = subMonths(currentMonth, 1);
    if (onMonthChange) {
      onMonthChange(newDate);
    } else {
      setInternalCurrentMonth(newDate);
    }
  };
  
  const nextMonth = () => {
    const newDate = addMonths(currentMonth, 1);
    if (onMonthChange) {
      onMonthChange(newDate);
    } else {
      setInternalCurrentMonth(newDate);
    }
  };
  
  const goToToday = () => {
    const today = new Date();
    if (onMonthChange) {
      onMonthChange(today);
    } else {
      setInternalCurrentMonth(today);
    }
  };

  // Calculate statistics
  const currentMonthAppointments = appointments.filter(apt => 
    isSameMonth(apt.date, currentMonth)
  );
  
  const stats = {
    total: currentMonthAppointments.length,
    confirmed: currentMonthAppointments.filter(apt => apt.status === 'Confirmed' || apt.status === 'Confirmado').length,
    pending: currentMonthAppointments.filter(apt => apt.status === 'Pending' || apt.status === 'Pendente').length,
    cancelled: currentMonthAppointments.filter(apt => apt.status === 'Cancelled' || apt.status === 'Cancelado').length
  };

  // Render appointment pill
  const renderAppointmentPill = (appointment: Appointment | EnhancedAppointment | ExtendedAppointment, index: number) => {
    const colorStyle = getTypeColor(appointment);
    const isEnhanced = 'therapistName' in appointment;
    
    return (
      <div
        key={appointment.id}
        className={cn(
          'flex items-center gap-1 p-1 rounded text-xs cursor-pointer hover:bg-black/10 transition-colors border-l-4',
          typeof colorStyle === 'string' ? colorStyle : ''
        )}
        style={typeof colorStyle === 'object' ? {
          backgroundColor: colorStyle.backgroundColor,
          borderLeftColor: colorStyle.borderColor,
          color: colorStyle.color
        } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onAppointmentClick(appointment);
        }}
      >
        <Clock className="w-3 h-3 flex-shrink-0" />
        <div className="truncate">
          <div className="font-medium text-[10px]">{appointment.time}</div>
          <div className="text-[10px] opacity-80">{appointment.patientName}</div>
          {isEnhanced && (appointment as EnhancedAppointment).therapistName && (
            <div className="text-[9px] opacity-70 flex items-center gap-1">
              <User className="w-2 h-2" />
              {(appointment as EnhancedAppointment).therapistName}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {showWeekends 
              ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))
              : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))
            }
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays
              .filter(day => showWeekends || (day.getDay() !== 0 && day.getDay() !== 6))
              .map((day) => {
                const dayAppointments = getAppointmentsForDate(day);
                const isDayToday = isToday(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const appointmentCount = dayAppointments.length;
                const maxVisibleAppointments = 2;

                return (
                  <Card
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[120px] cursor-pointer transition-all duration-200 hover:shadow-md',
                      !isCurrentMonth && 'opacity-40',
                      isDayToday && 'ring-2 ring-primary'
                    )}
                    onClick={() => onDateClick(day)}
                  >
                    <CardContent className="p-2 h-full flex flex-col">
                      {/* Day number */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          'text-sm font-medium',
                          isDayToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs'
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {appointmentCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {appointmentCount}
                          </Badge>
                        )}
                      </div>

                      {/* Appointments */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayAppointments
                          .slice(0, maxVisibleAppointments)
                          .map((appointment, index) => renderAppointmentPill(appointment, index))}
                        
                        {appointmentCount > maxVisibleAppointments && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{appointmentCount - maxVisibleAppointments} mais
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="p-4 border border-border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Total de agendamentos: {stats.total}
            </span>
            <span className="text-muted-foreground">
              Confirmados: {stats.confirmed}
            </span>
            <span className="text-muted-foreground">
              Pendentes: {stats.pending}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-xs">Confirmado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs">Pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs">Cancelado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};