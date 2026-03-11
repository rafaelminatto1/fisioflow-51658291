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
import { SmartDatePicker } from '@/components/ui/smart-date-picker';

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

          <SmartDatePicker
            date={currentDate}
            onChange={(date) => {
              if (date) {
                window.dispatchEvent(new CustomEvent('schedule-date-change', { detail: date }));
              }
            }}
            className="h-10 min-w-[220px] border-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-black text-lg"
            placeholder={formattedDateRange}
          />
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

      {/* Right Group: Global Actions & Filters */}
      <div className="flex items-center gap-3">
        {/* Selection Actions */}
        {isSelectionMode && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-2xl border border-amber-100 dark:border-amber-900/30 animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mr-2">
              Modo Seleção
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelAllToday}
              className="h-8 gap-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancelar Selecionados
            </Button>
          </div>
        )}

        {/* Create Button */}
        <Button
          onClick={onCreateAppointment}
          className="h-10 px-5 gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl shadow-slate-900/10 transition-all hover:scale-105 active:scale-95 font-bold text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Utility Actions */}
        <div className="flex items-center gap-1">
          <AdvancedFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClear={onClearFilters}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSelection}
            className={cn(
              "h-10 w-10 rounded-xl transition-all",
              isSelectionMode ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title={isSelectionMode ? "Desativar seleção" : "Ativar seleção em massa"}
          >
            <CheckSquare className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Configurações da Agenda"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl">
              <DropdownMenuItem className="rounded-xl gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Otimizar Agenda (AI)
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl gap-2 font-medium">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Confirmar todos por WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  // For mobile - compact simplified view
  const MobileToolbar = () => (
    <div className="flex flex-col gap-4 px-4 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'prev' } }))}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <SmartDatePicker
            date={currentDate}
            onChange={(date) => {
              if (date) {
                window.dispatchEvent(new CustomEvent('schedule-date-change', { detail: date }));
              }
            }}
            className="h-10 min-w-[140px] border-none bg-transparent font-black text-base px-0"
            placeholder={format(currentDate, 'MMM yyyy', { locale: ptBR })}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('schedule-navigate', { detail: { direction: 'next' } }))}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Button
          onClick={onCreateAppointment}
          size="icon"
          className="h-12 w-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['day', 'week', 'month'] as const).map((view) => (
          <Button
            key={view}
            variant={viewType === view ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange(view)}
            className={cn(
              "h-9 px-5 rounded-xl font-bold text-[10px] uppercase tracking-widest",
              viewType === view ? "bg-slate-900 dark:bg-white" : "border-slate-200 text-slate-500"
            )}
          >
            {VIEW_LABELS[view]}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <AdvancedFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClear={onClearFilters}
          />
        </div>
      </div>
    </div>
  );

  return isMobile ? <MobileToolbar /> : <DesktopToolbar />;
};
