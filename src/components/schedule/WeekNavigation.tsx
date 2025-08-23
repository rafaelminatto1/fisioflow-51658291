import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Home } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeekNavigationProps {
  currentWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  totalAppointments: number;
}

export const WeekNavigation: React.FC<WeekNavigationProps> = ({
  currentWeek,
  onPreviousWeek,
  onNextWeek,
  onToday,
  totalAppointments
}) => {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onPreviousWeek}
              className="bg-background border-border hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onToday}
              className="bg-background border-border hover:bg-muted flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Hoje
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onNextWeek}
              className="bg-background border-border hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-center flex-1 mx-4">
            <div className="flex items-center justify-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <p className="text-lg font-semibold text-foreground">
                {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(addDays(weekStart, 5), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalAppointments} agendamento{totalAppointments !== 1 ? 's' : ''} esta semana
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {format(new Date(), 'EEE, dd/MM', { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'HH:mm')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};