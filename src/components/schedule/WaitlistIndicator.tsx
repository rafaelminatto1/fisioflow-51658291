import { useWaitlist } from '@/hooks/useWaitlist';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PatientHelpers } from '@/types';
import { cn } from '@/lib/utils';

interface WaitlistIndicatorProps {
    onSchedulePatient?: (patientId: string, patientName: string) => void;
    className?: string;
}

export function WaitlistIndicator({ onSchedulePatient, className }: WaitlistIndicatorProps) {
    const { data: waitlist = [], isLoading } = useWaitlist();

    const handleSchedule = (patientId: string, patientName: string) => {
        onSchedulePatient?.(patientId, patientName);
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 opacity-50", className)}>
                <Clock className="h-3.5 w-3.5 animate-pulse text-slate-400" />
                <span className="text-xs text-slate-500">...</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-8 px-2.5 rounded-lg flex items-center gap-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 transition-all shadow-none group",
                        className
                    )}
                >
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                        Lista de Espera
                    </span>
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                        {waitlist.length}
                    </span>
                    <ChevronDown className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 shadow-xl rounded-xl">
                <div className="px-2 py-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Pacientes em Espera
                    </span>
                </div>
                {waitlist.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500 italic">
                        Nenhum paciente na lista
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {waitlist.map((entry) => (
                            <DropdownMenuItem
                                key={entry.id}
                                onClick={() => {
                                    const name = entry.patient ? PatientHelpers.getName(entry.patient) : 'Paciente';
                                    handleSchedule(entry.patient_id, name);
                                }}
                                className="flex flex-col items-start gap-1 p-2.5 mb-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors border border-transparent hover:border-indigo-100/50 dark:hover:border-indigo-800/30 group"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 truncate max-w-[180px]">
                                        {entry.patient ? PatientHelpers.getName(entry.patient) : 'Paciente'}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tighter",
                                        entry.priority === 'urgent' ? "bg-red-100 text-red-700" :
                                            entry.priority === 'high' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                                    )}>
                                        {entry.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        Clique para agendar
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
