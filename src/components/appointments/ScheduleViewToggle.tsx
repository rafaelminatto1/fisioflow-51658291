import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, List, Grid3X3 } from 'lucide-react';

export type ScheduleView = 'week' | 'month' | 'day' | 'list';

interface ScheduleViewToggleProps {
  currentView: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  appointmentCounts?: {
    week: number;
    month: number;
    day: number;
    total: number;
  };
}

export const ScheduleViewToggle = ({
  currentView,
  onViewChange,
  appointmentCounts
}: ScheduleViewToggleProps) => {
  const views = [
    {
      key: 'week' as ScheduleView,
      label: 'Semana',
      icon: Grid3X3,
      count: appointmentCounts?.week
    },
    {
      key: 'month' as ScheduleView,
      label: 'Mês',
      icon: Calendar,
      count: appointmentCounts?.month
    },
    {
      key: 'day' as ScheduleView,
      label: 'Dia',
      icon: Clock,
      count: appointmentCounts?.day
    },
    {
      key: 'list' as ScheduleView,
      label: 'Lista',
      icon: List,
      count: appointmentCounts?.total
    }
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-background rounded-lg border border-border">
      {views.map(({ key, label, icon: Icon, count }) => (
        <Button
          key={key}
          variant={currentView === key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(key)}
          className="relative h-8 gap-2"
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
          {count !== undefined && count > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary border-0"
            >
              {count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
};