import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    Clock,
    Search,
    Sun,
    Sunset,
    Moon,
    MoreVertical,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { cn } from '@/lib/utils';
import { PatientHelpers } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WaitlistHorizontalProps {
    onSchedulePatient?: (patientId: string, patientName: string) => void;
    className?: string;
}

const DAY_LABELS: Record<string, string> = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
};

const TIME_SLOT_CONFIG: Record<string, { label: string; icon: typeof Sun }> = {
    morning: { label: 'Manhã', icon: Sun },
    afternoon: { label: 'Tarde', icon: Sunset },
    evening: { label: 'Noite', icon: Moon },
};

export function WaitlistHorizontal({
    onSchedulePatient,
    className
}: WaitlistHorizontalProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { data: waitlist = [], isLoading: loading } = useWaitlist();

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'high':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'Urgente';
            case 'high':
                return 'Alta';
            default:
                return 'Normal';
        }
    };

    const handleSchedule = (entry: WaitlistEntry) => {
        if (onSchedulePatient && entry.patient) {
            const patientName = PatientHelpers.getName(entry.patient);
            onSchedulePatient(entry.patient_id, patientName);
        }
    };

    // Minimized state when empty
    if (!loading && waitlist.length === 0) {
        return (
            <div className={cn("w-full bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 py-1 px-4 flex justify-between items-center", className)}>
                <span className="text-xs text-slate-400 italic">Lista de espera vazia</span>
            </div>
        );
    }

    return (
        <div className={cn("w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300", className)}>
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50">
                <div
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="p-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                        Lista de Espera
                        <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px]">
                            {waitlist.length}
                        </span>
                    </h3>
                    {isExpanded ?
                        <ChevronUp className="h-3 w-3 text-slate-400" /> :
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    }
                </div>
            </div>

            {isExpanded && (
                <div className="p-0 animate-in slide-in-from-top-2 duration-200">
                    <ScrollArea className="w-full whitespace-nowrap p-4">
                        <div className="flex w-max space-x-4 pb-4">
                            {waitlist.map((entry) => (
                                <div key={entry.id} className="w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:shadow-md transition-all relative group">
                                    {/* Priority Indicator Line */}
                                    <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
                                        entry.priority === 'urgent' ? "bg-red-500" :
                                            entry.priority === 'high' ? "bg-orange-500" : "bg-blue-500"
                                    )} />

                                    <div className="pl-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1" title={entry.patient?.name}>
                                                    {entry.patient?.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider", getPriorityColor(entry.priority))}>
                                                        {getPriorityLabel(entry.priority)}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleSchedule(entry)}>
                                                        Agendar agora
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {entry.preferred_days?.slice(0, 3).map(day => (
                                                <div key={day} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                                                    {DAY_LABELS[day]}
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            className="w-full h-7 text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-slate-200 transition-colors shadow-none"
                                            onClick={() => handleSchedule(entry)}
                                        >
                                            Agendar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
