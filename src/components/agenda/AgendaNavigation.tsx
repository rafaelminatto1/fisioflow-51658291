import React from 'react';
import { ChevronLeft, ChevronRight, Home, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgenda } from '@/hooks/useAgenda';
import { formatDate } from '@/utils/agendaUtils';
import { cn } from '@/lib/utils';

interface AgendaNavigationProps {
  className?: string;
}

export function AgendaNavigation({ className }: AgendaNavigationProps) {
  const {
    currentWeek,
    weekRange,
    isCurrentWeek,
    isLoading,
    goToPreviousWeek,
    goToNextWeek,
    goToToday,
    filters,
    clearFilters,
    weeklyData
  } = useAgenda();

  const formatWeekRange = () => {
    const startFormatted = weekRange.start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    const endFormatted = weekRange.end.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${startFormatted} - ${endFormatted}`;
  };

  const hasActiveFilters = Object.keys(filters).length > 0;
  const appointmentCount = weeklyData?.appointments?.length || 0;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Agenda Semanal
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Limpar Filtros
              </Button>
            )}
            
            <Badge variant="secondary" className="text-xs">
              {appointmentCount} agendamentos
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex flex-col items-center gap-1">
            <div className="text-sm font-medium">
              {formatWeekRange()}
            </div>
            {isCurrentWeek && (
              <Badge variant="default" className="text-xs">
                Semana Atual
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={isCurrentWeek ? "secondary" : "outline"}
            size="sm"
            onClick={goToToday}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            <Home className="h-3 w-3" />
            Hoje
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const date = prompt('Digite uma data (DD/MM/AAAA):');
              if (date) {
                try {
                  const [day, month, year] = date.split('/');
                  const targetDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                  );
                  if (!isNaN(targetDate.getTime())) {
                    // goToWeek would be called here
                    console.log('Navigate to:', targetDate);
                  }
                } catch (error) {
                  alert('Data inválida');
                }
              }
            }}
            className="flex items-center gap-1"
          >
            <Calendar className="h-3 w-3" />
            Ir para Data
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-2">
            <div className="text-sm text-muted-foreground">
              Carregando agenda...
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>Atalhos: Ctrl + ← / → para navegar</div>
          <div>Ctrl + Home para ir para hoje</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying agenda statistics
export function AgendaStats({ className }: { className?: string }) {
  const { weekRange, weeklyData } = useAgenda();
  
  const stats = React.useMemo(() => {
    if (!weeklyData?.appointments) {
      return {
        total: 0,
        scheduled: 0,
        completed: 0,
        missed: 0,
        cancelled: 0
      };
    }

    return weeklyData.appointments.reduce((acc, appointment) => {
      acc.total++;
      switch (appointment.status) {
        case 'scheduled':
          acc.scheduled++;
          break;
        case 'completed':
          acc.completed++;
          break;
        case 'missed':
          acc.missed++;
          break;
        case 'cancelled':
          acc.cancelled++;
          break;
      }
      return acc;
    }, {
      total: 0,
      scheduled: 0,
      completed: 0,
      missed: 0,
      cancelled: 0
    });
  }, [weeklyData]);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Estatísticas da Semana
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agendados:</span>
            <span className="font-medium text-blue-600">{stats.scheduled}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Concluídos:</span>
            <span className="font-medium text-green-600">{stats.completed}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Faltas:</span>
            <span className="font-medium text-red-600">{stats.missed}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}