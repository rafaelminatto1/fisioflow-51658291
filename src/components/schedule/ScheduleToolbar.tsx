/**
 * ScheduleToolbar - Single-row compact toolbar for Schedule page
 * Following Material Design 3 App Bar specs and industry best practices
 * (Google Calendar, Cron, Akiflow, Notion Calendar)
 */

import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAdjustedToday } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { AdvancedFilters } from "./AdvancedFilters";
import type { TherapistSummary } from "@/types/workers";
import { ScheduleConfigIconButton } from "./ScheduleConfigButton";
import { WaitlistManager } from "./WaitlistManager";
import { RecurringManager } from "./RecurringManager";

export interface ScheduleToolbarProps {
  currentDate: Date;
  viewType: "day" | "week" | "month";
  onViewChange: (view: "day" | "week" | "month") => void;
  onDateChange: (date: Date) => void;
  isSelectionMode: boolean;
  onToggleSelection: () => void;
  onCreateAppointment: () => void;
  filters: {
    status: string[];
    types: string[];
    therapists: string[];
  };
  onFiltersChange: (filters: { status: string[]; types: string[]; therapists: string[] }) => void;
  onClearFilters: () => void;
  patientFilter: string;
  onPatientFilterChange: (value: string) => void;
  therapists?: TherapistSummary[];
  onCancelAllToday?: () => void;
}

const VIEW_LABELS = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
} as const;

const VIEW_OPTIONS = (
  Object.entries(VIEW_LABELS) as Array<
    [ScheduleToolbarProps["viewType"], (typeof VIEW_LABELS)[keyof typeof VIEW_LABELS]]
  >
).map(([value, label]) => ({ value, label }));

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  currentDate,
  viewType,
  onViewChange,
  onDateChange,
  isSelectionMode,
  onToggleSelection,
  onCreateAppointment,
  filters,
  onFiltersChange,
  onClearFilters,
  patientFilter,
  onPatientFilterChange,
  therapists,
  onCancelAllToday: _onCancelAllToday,
}) => {
  const isMobile = useIsMobile();

  const handleNavigate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      if (viewType === "day") newDate.setDate(newDate.getDate() - 1);
      else if (viewType === "week") newDate.setDate(newDate.getDate() - 7);
      else if (viewType === "month") newDate.setMonth(newDate.getMonth() - 1);
    } else {
      if (viewType === "day") newDate.setDate(newDate.getDate() + 1);
      else if (viewType === "week") newDate.setDate(newDate.getDate() + 7);
      else if (viewType === "month") newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  // Format current date range based on view type
  const formattedDateRange = React.useMemo(() => {
    switch (viewType) {
      case "day":
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case "week": {
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return format(weekStart, "MMMM 'de' yyyy", { locale: ptBR });
        }
        return `${format(weekStart, "MMM", { locale: ptBR })} - ${format(weekEnd, "MMM 'de' yyyy", { locale: ptBR })}`;
      }
      case "month":
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      default:
        return "";
    }
  }, [currentDate, viewType]);

  const renderViewSwitcher = ({
    activeClassName,
    idleClassName,
    containerClassName,
    buttonClassName,
  }: {
    activeClassName: string;
    idleClassName: string;
    containerClassName: string;
    buttonClassName: string;
  }) => (
    <div className={containerClassName}>
      {VIEW_OPTIONS.map((view) => {
        const isActive = viewType === view.value;

        return (
          <Button
            key={view.value}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(view.value)}
            className={cn(buttonClassName, isActive ? activeClassName : idleClassName)}
          >
            {view.label}
          </Button>
        );
      })}
    </div>
  );

  // Desktop — 3 zonas: navegação (esq) · seletor de visão (centro) · ações (dir)
  const DesktopToolbar = () => (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      {/* Esquerda: navegação de data */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(getAdjustedToday())}
          className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm"
        >
          Hoje
        </Button>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("prev")}
            className="h-8 w-8 p-0 rounded-md hover:bg-muted/80 transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("next")}
            className="h-8 w-8 p-0 rounded-md hover:bg-muted/80 transition-colors"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <SmartDatePicker
          date={currentDate}
          onChange={(date) => date && onDateChange(date)}
          className="h-9 px-2 border-none bg-transparent hover:bg-muted/50 font-bold text-sm tracking-tight min-w-[150px] capitalize transition-colors"
          placeholder={formattedDateRange}
          enableManualInput={false}
        />
      </div>

      {/* Centro: seletor de visão */}
      <div className="flex flex-1 justify-center">
        {renderViewSwitcher({
          activeClassName: "bg-primary text-primary-foreground shadow-sm",
          idleClassName: "text-muted-foreground hover:text-foreground hover:bg-background/50",
          containerClassName:
            "flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50",
          buttonClassName:
            "h-7 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all",
        })}
      </div>

      {/* Direita: busca + ações */}
      <div className="flex items-center gap-1.5">
        <div className="relative w-[200px] hidden xl:block">
          <Input
            value={patientFilter}
            onChange={(event) => onPatientFilterChange(event.target.value)}
            placeholder="Buscar paciente"
            aria-label="Buscar paciente"
            className="h-9 pr-9 bg-muted/30 focus-visible:bg-background transition-colors"
          />
          {patientFilter ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPatientFilterChange("")}
              aria-label="Limpar busca de paciente"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>

        <AdvancedFilters
          filters={filters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          therapists={therapists}
        />

        <ScheduleConfigIconButton className="h-9 w-9 rounded-lg border border-border/50 bg-background/50 text-muted-foreground hover:bg-muted hover:text-primary transition-colors shadow-sm" />

        <RecurringManager />
        <WaitlistManager />

        <Button
          onClick={onCreateAppointment}
          className="h-9 px-4 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-lg font-bold text-[11px] uppercase tracking-widest ml-1 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Agendar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              aria-label="Mais opções"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 p-2 rounded-2xl shadow-xl border border-border"
          >
            <DropdownMenuItem className="rounded-xl gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Otimizar Agenda (AI)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl gap-2 font-medium"
              onClick={onToggleSelection}
            >
              <CheckSquare className="w-4 h-4 text-primary" />
              {isSelectionMode ? "Sair do modo seleção" : "Seleção em massa"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Mobile — versão compacta
  const MobileToolbar = () => (
    <div className="flex flex-col gap-4 px-4 py-4 bg-background border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange(getAdjustedToday())}
            className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest"
          >
            Hoje
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("prev")}
            aria-label="Período anterior"
            className="h-9 w-9 rounded-xl border border-border"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <SmartDatePicker
            date={currentDate}
            onChange={(date) => date && onDateChange(date)}
            className="h-9 min-w-[120px] border-none bg-transparent font-black text-sm px-1 capitalize"
            placeholder={format(currentDate, "MMM yyyy", { locale: ptBR })}
            enableManualInput={false}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("next")}
            className="h-9 w-9 rounded-xl border border-border"
            aria-label="Próximo período (Mobile)"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <ScheduleConfigIconButton className="h-9 w-9 rounded-xl border border-border" />
          <Button
            onClick={onCreateAppointment}
            size="icon"
            className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {renderViewSwitcher({
          activeClassName: "bg-primary text-primary-foreground shadow-sm",
          idleClassName:
            "bg-background text-muted-foreground border border-border hover:text-foreground",
          containerClassName: "flex items-center gap-1.5 whitespace-nowrap",
          buttonClassName: "h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest",
        })}
        <div className="ml-auto">
          <AdvancedFilters filters={filters} onChange={onFiltersChange} onClear={onClearFilters} />
        </div>
      </div>
    </div>
  );

  return isMobile ? <MobileToolbar /> : <DesktopToolbar />;
};
