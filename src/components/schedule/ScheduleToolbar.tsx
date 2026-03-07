/**
 * ScheduleToolbar - Single-row compact toolbar for Schedule page
 * Following Material Design 3 App Bar specs and industry best practices
 * (Google Calendar, Cron, Akiflow, Notion Calendar)
 */

import React from 'react';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {

  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  CheckSquare,
  Plus,
  Stethoscope,
  Trash2,
  Sparkles,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdvancedFilters } from './AdvancedFilters';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface ScheduleToolbarProps {
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  isSelectionMode: boolean;
  onToggleSelection: () => void;
  onCreateAppointment: () => void;
  filters: {
    status: string[];
    types: string[];
    therapists: string[];
  };
  onFiltersChange: (filters: {
    status: string[];
    types: string[];
    therapists: string[];
  }) => void;
  onClearFilters: () => void;
  onCancelAllToday?: () => void;
}

const VIEW_LABELS = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
} as const;

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  currentDate,
  viewType,
  onViewChange,
  isSelectionMode,
  onToggleSelection,
  onCreateAppointment,
  filters,
  onFiltersChange,
  onClearFilters,
  onCancelAllToday,
}) => {
  const isMobile = useIsMobile();

  // Format current date range based on view type
  const formattedDateRange = React.useMemo(() => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case 'week': {
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, "MMMM 'de' yyyy", { locale: ptBR });
        }
        return `${format(weekStart, 'MMM', { locale: ptBR })} - ${format(weekEnd, "MMM 'de' yyyy", { locale: ptBR })}`;
      }
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      default:
        return '';
    }
  }, [currentDate, viewType]);

  // Format abbreviated date for mobile
  const formattedDateShort = React.useMemo(() => {
    return format(currentDate, 'MMM yyyy', { locale: ptBR });
  }, [currentDate]);

  const _handleNavigate = (direction: 'prev' | 'next') => {
    const daysToAdd = direction === 'next' ? 1 : -1;
    const newDate = new Date(currentDate);

    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + daysToAdd);
        break;
      case 'week':
        addWeeks(newDate, direction === 'next' ? 1 : -1);
        newDate.setDate(newDate.getDate() + (daysToAdd * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    // Note: Parent component should handle state updates via onDateChange callback
    // This is a limitation of current props - we'll address it
    return newDate;
  };

  const _handleToday = () => {
    // Note: Parent component should handle this
    window.dispatchEvent(new CustomEvent('schedule-today-click'));
  };

  // For desktop - show all controls
  const DesktopToolbar = () => (
    <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
      {/* Left Group: Brand + Date Navigation */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link to="/agenda" className="flex items-center gap-3 hover:opacity-80 transition-all group">
          <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <Stethoscope className="w-5 h-5 text-white dark:text-slate-900" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                FisioFlow
            </span>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Professional
            </span>
          </div>
        </Link>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl shadow-inner-border">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'prev' } }))}
                className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                aria-label="Data anterior"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'next' } }))}
                className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                aria-label="Próxima data"
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-today-click'))}
            className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-widest border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Hoje
          </Button>

          <h2 className="ml-4 text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">
            {formattedDateRange}
          </h2>
        </div>
      </div>

      {/* Center Group: View Switcher (Premium) */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden 2xl:block">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50" role="group">
          {(['day', 'week', 'month'] as const).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                viewType === view
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-premium-sm ring-1 ring-slate-200/50 dark:ring-white/10"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
              aria-pressed={viewType === view}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Right Group: Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 mr-2">
            <AdvancedFilters
                filters={filters}
                onChange={onFiltersChange}
                onClear={onClearFilters}
            />
            
            <Link to="/agenda/settings">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                    title="Configurações"
                >
                    <SettingsIcon className="w-4 h-4" />
                </Button>
            </Link>
        </div>

        {/* Selection Mode */}
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl transition-all",
            isSelectionMode ? "bg-blue-600 shadow-lg shadow-blue-500/40 border-blue-500" : "border-slate-200 dark:border-slate-800"
          )}
          onClick={onToggleSelection}
          title="Modo Seleção"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>

        {/* New Appointment - High End CTA */}
        <Button
          onClick={onCreateAppointment}
          className="h-11 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20 gap-2"
        >
          <Plus className="w-4 h-4" />
          Agendar
        </Button>
      </div>
    </div>
  );

  // For tablet - medium density
  const _TabletToolbar = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      {/* Left: Date Nav + View Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'prev' } }))}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[120px]" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'next' } }))}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('schedule-today-click'))}
          className="h-8 px-3"
        >
          Hoje
        </Button>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['day', 'week'] as const).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md",
                viewType === view
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleSelection}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Modo seleção
            </DropdownMenuItem>
            {onCancelAllToday && (
              <DropdownMenuItem onClick={onCancelAllToday} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Cancelar todos
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/agenda/settings">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onCreateAppointment} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // For mobile - minimal
  const MobileToolbar = () => (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'prev' } }))}
          className="h-8 w-8 p-0"
          aria-label="Data anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-[60px]" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'next' } }))}
          className="h-8 w-8 p-0"
          aria-label="Próxima data"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('schedule-today-click'))}
          className="h-7 px-2 text-xs"
          aria-label="Ir para hoje"
        >
          Hoje
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg" role="group" aria-label="Tipo de visualização">
          {(['day', 'week'] as const).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded-md",
                viewType === view
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400"
              )}
              aria-pressed={viewType === view}
              aria-label={`Visualização por ${VIEW_LABELS[view]}`}
            >
              {view === 'day' ? 'D' : 'S'}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className={cn("h-8 w-8", isSelectionMode && "bg-primary text-primary-foreground")}
          onClick={onToggleSelection}
          aria-label="Alternar modo de seleção"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </Button>

        <Button
          onClick={onCreateAppointment}
          className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-8 p-0"
          aria-label="Criar novo agendamento"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return <MobileToolbar />;
  }

  return <DesktopToolbar />;
};

export default ScheduleToolbar;
