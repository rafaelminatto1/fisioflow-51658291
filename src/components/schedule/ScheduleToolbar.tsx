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
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      {/* Left Group: Brand + Date Navigation */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white hidden xl:block">
            FisioFlow
          </span>
        </Link>

        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'prev' } }))}
            className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Data anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-3 min-w-[140px] text-center">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formattedDateRange.charAt(0).toUpperCase() + formattedDateRange.slice(1)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'next' } }))}
            className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Próxima data"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-today-click'))}
            className="h-8 px-3 rounded-lg ml-1"
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Center Group: View Switcher */}
      <div className="flex items-center">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg" role="group" aria-label="Tipo de visualização">
          {(['day', 'week', 'month'] as const).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                viewType === view
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50"
              )}
              aria-pressed={viewType === view}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Right Group: Actions */}
      <div className="flex items-center gap-2">
        {/* Cancel All Button */}
        {onCancelAllToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelAllToday}
            className="h-9 px-3 rounded-lg border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
            title="Cancelar todos os agendamentos da data exibida"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden lg:inline ml-2">Cancelar todos</span>
          </Button>
        )}

        {/* Settings */}
        <Link to="/schedule/settings">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg"
            title="Configurações da Agenda"
            aria-label="Configurações da Agenda"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </Link>

        {/* Filters */}
        <AdvancedFilters
          filters={filters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
        />

        {/* AI Optimization */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 rounded-lg border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 hidden xl:flex"
          onClick={() => toast({
            title: "IA Analisando...",
            description: "Verificando disponibilidade e padrões de agendamento."
          })}
          aria-label="Otimizar agenda com IA"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span className="hidden 2xl:inline">Otimizar</span>
        </Button>

        {/* Selection Mode Toggle */}
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="icon"
          className={cn(
            "h-9 w-9 rounded-lg",
            isSelectionMode && "bg-primary"
          )}
          onClick={onToggleSelection}
          title="Modo de Seleção (atalho: A)"
          aria-label="Alternar modo de seleção"
        >
          <CheckSquare className="w-4 h-4" />
        </Button>

        {/* New Appointment - Primary CTA */}
        <Button
          onClick={onCreateAppointment}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-md rounded-lg px-4"
          aria-label="Criar novo agendamento"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden lg:inline">Novo Agendamento</span>
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
          <span className="text-sm font-semibold px-2 min-w-[120px] text-center">
            {formattedDateRange.charAt(0).toUpperCase() + formattedDateRange.slice(1)}
          </span>
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
              <Link to="/schedule/settings">
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
        <span className="text-sm font-semibold">
          {formattedDateShort.charAt(0).toUpperCase() + formattedDateShort.slice(1)}
        </span>
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
