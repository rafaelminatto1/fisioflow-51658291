import React, { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CalendarWeekViewHeaderProps {
    currentDate: Date;
    viewType: 'day' | 'week' | 'month';
    onViewChange: (view: 'day' | 'week' | 'month') => void;
    onNavigatePrevious: () => void;
    onNavigateNext: () => void;
    onNavigateToday: () => void;
    onOpenSettings?: () => void;
    className?: string;
}

export const CalendarWeekViewHeader = memo(({
    currentDate,
    viewType,
    onViewChange,
    onNavigatePrevious,
    onNavigateNext,
    onNavigateToday,
    onOpenSettings,
    className
}: CalendarWeekViewHeaderProps) => {
    const viewTypes: { value: 'day' | 'week' | 'month'; label: string }[] = [
        { value: 'day', label: 'Dia' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
    ];

    return (
        <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700", className)}>
            {/* Left: Date Navigation */}
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToday}
                    className="font-medium"
                >
                    Hoje
                </Button>

                <div className="flex items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onNavigatePrevious}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onNavigateNext}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="hidden sm:block">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-gray-500">
                        {format(currentDate, 'EEEE, dd MMMM yyyy', { locale: ptBR })}
                    </p>
                </div>
            </div>

            {/* Center: View Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                {viewTypes.map((view) => (
                    <Button
                        key={view.value}
                        size="sm"
                        variant={viewType === view.value ? 'default' : 'ghost'}
                        onClick={() => onViewChange(view.value)}
                        className={cn(
                            "h-7 text-xs capitalize transition-all",
                            viewType === view.value
                                ? "shadow-sm"
                                : "text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-slate-100"
                        )}
                    >
                        {view.label}
                    </Button>
                ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {onOpenSettings && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenSettings}
                        className="gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Configurações</span>
                    </Button>
                )}
            </div>
        </div>
    );
});

CalendarWeekViewHeader.displayName = 'CalendarWeekViewHeader';
