import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    Clock,
    Calendar,
    Phone,
    Search,
    ExternalLink,
    Sun,
    Sunset,
    Moon,
    ChevronRight,
    MoreVertical
} from 'lucide-react';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { PatientHelpers } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WaitlistSidebarProps {
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

export function WaitlistSidebar({
    onSchedulePatient,
    className
}: WaitlistSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: waitlist = [], isLoading: loading } = useWaitlist();

    const filteredWaitlist = waitlist.filter((entry) => {
        if (!searchQuery) return true;
        return (
            entry.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.patient?.phone?.includes(searchQuery)
        );
    });

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

    return (
        <div className={cn("flex flex-col h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 w-80", className)}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                        <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-none">Lista de Espera</h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">{waitlist.length} aguardando</p>
                    </div>
                </div>
                <Link to="/waitlist">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <Input
                        placeholder="Buscar paciente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />
                </div>
            </div>

            {/* List Content */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-3">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Carregando lista...</p>
                    </div>
                ) : filteredWaitlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3">
                            <Clock className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Lista vazia</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[180px]">
                            {searchQuery ? 'Nenhum paciente encontrado para esta busca.' : 'Não há pacientes na lista de espera no momento.'}
                        </p>
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        {filteredWaitlist.map((entry) => (
                            <div key={entry.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-default">
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
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-3 h-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleSchedule(entry)}>
                                                    Agendar agora
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    Ver detalhes
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Preferences chips */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {entry.preferred_days?.slice(0, 3).map(day => (
                                            <div key={day} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-500 rounded-md">
                                                {DAY_LABELS[day]}
                                            </div>
                                        ))}
                                        {entry.preferred_periods?.map(period => {
                                            const config = TIME_SLOT_CONFIG[period];
                                            const Icon = config?.icon || Clock;
                                            return (
                                                <div key={period} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-500 rounded-md flex items-center gap-1">
                                                    <Icon className="w-3 h-3" />
                                                    {config?.label}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        className="w-full h-7 text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-slate-200 transition-colors shadow-none"
                                        onClick={() => handleSchedule(entry)}
                                    >
                                        Agendar Paciente
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
