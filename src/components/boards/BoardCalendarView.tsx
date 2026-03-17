import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Tarefa } from '@/types/tarefas';
import 'react-day-picker/dist/style.css';

interface BoardCalendarViewProps {
  tarefas: Tarefa[];
  onViewTask: (tarefa: Tarefa) => void;
}

export function BoardCalendarView({ tarefas, onViewTask }: BoardCalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const tasksWithDueDate = tarefas.filter(t => !!t.data_vencimento);

  const getDayTasks = (day: Date) =>
    tasksWithDueDate.filter(t => isSameDay(new Date(t.data_vencimento!), day));

  const dayTasksMap = tasksWithDueDate.reduce((acc, t) => {
    const dateKey = t.data_vencimento!.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Tarefa[]>);

  const selectedDayTasks = selectedDay ? getDayTasks(selectedDay) : [];

  const modifiers = {
    hasTasks: Object.keys(dayTasksMap).map(d => new Date(d + 'T12:00:00')),
  };

  const modifiersStyles = {
    hasTasks: { fontWeight: 700 },
  };

  return (
    <div className="flex gap-6 flex-col md:flex-row">
      {/* Calendar */}
      <div className="flex-shrink-0">
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          locale={ptBR}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const dateKey = format(day.date, 'yyyy-MM-dd');
              const count = dayTasksMap[dateKey]?.length ?? 0;
              return (
                <button {...props} className={cn(props.className, 'relative')}>
                  <span>{day.date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            },
          }}
          className="border rounded-xl p-3 bg-card shadow-sm"
        />
      </div>

      {/* Tasks for selected day */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
          {selectedDay
            ? `Tarefas em ${format(selectedDay, "d 'de' MMMM", { locale: ptBR })}`
            : 'Selecione um dia'
          }
        </h3>

        {selectedDayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {selectedDay ? 'Nenhuma tarefa com vencimento neste dia.' : ''}
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayTasks.map(tarefa => (
              <div
                key={tarefa.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onViewTask(tarefa)}
              >
                <div className={cn(
                  'w-1.5 h-10 rounded-full flex-shrink-0',
                  tarefa.prioridade === 'URGENTE' ? 'bg-red-500' :
                  tarefa.prioridade === 'ALTA' ? 'bg-orange-500' :
                  tarefa.prioridade === 'MEDIA' ? 'bg-yellow-500' : 'bg-green-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tarefa.titulo}</p>
                  {tarefa.descricao && (
                    <p className="text-xs text-muted-foreground truncate">{tarefa.descricao}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">{tarefa.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
