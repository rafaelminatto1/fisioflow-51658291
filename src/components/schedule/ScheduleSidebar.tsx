import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';

// Filter types
export interface FilterState {
    therapists: string[];
    rooms: string[];
    services: string[];
}

interface ScheduleSidebarProps {
    upcomingAppointments: Appointment[];
    filters: FilterState;
    onFilterChange: (newFilters: FilterState) => void;
    availableTherapists?: string[];
    availableRooms?: string[];
    availableServices?: string[];
}

export const ScheduleSidebar: React.FC<ScheduleSidebarProps> = ({
    upcomingAppointments,
    filters,
    onFilterChange,
    availableTherapists = ['Dr. Ana', 'Dr. Paulo', 'Dra. Carla'],
    availableRooms = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4'],
    availableServices = ['Fisioterapia', 'Osteopatia', 'Pilates', 'Consulta Inicial'],
}) => {

    const handleCheckboxChange = (category: keyof FilterState, value: string) => {
        const currentValues = filters[category];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        onFilterChange({
            ...filters,
            [category]: newValues
        });
    };

    const isAllSelected = (category: keyof FilterState, allOptions: string[]) => {
        return allOptions.every(opt => filters[category].includes(opt));
    };

    const toggleAll = (category: keyof FilterState, allOptions: string[]) => {
        if (isAllSelected(category, allOptions)) {
            onFilterChange({ ...filters, [category]: [] });
        } else {
            onFilterChange({ ...filters, [category]: allOptions });
        }
    };

    // Helper to determine badge color based on therapist (mock logic for now)
    const getTherapistColor = (name: string) => {
        if (name.includes('Ana')) return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
        if (name.includes('Paulo')) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
        if (name.includes('Carla')) return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
        return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden">
            {/* Upcoming Appointments Panel */}
            <Card className="bg-card border-border/50 shadow-sm flex-shrink-0 max-h-[40%] flex flex-col">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Próximos Agendamentos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden flex-1">
                    <ScrollArea className="h-full">
                        <div className="p-4 pt-0 space-y-3">
                            {upcomingAppointments.length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">
                                    Nenhum agendamento próximo.
                                </div>
                            ) : (
                                upcomingAppointments.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className={cn(
                                            "rounded-lg border p-3 transition-all hover:bg-muted/50 cursor-pointer relative group overflow-hidden",
                                            // Border left color logic based on therapist could go here
                                            "border-l-4 border-l-primary border-y border-r border-border/50"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", getTherapistColor(apt.therapistId || ''))}>
                                                {apt.therapistId || 'Sem Terapeuta'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(typeof apt.date === 'string' && apt.date
                                                    ? (() => {
                                                        // Safety check for date string
                                                        const [y, m, d] = apt.date.split('-').map(Number);
                                                        return new Date(y, m - 1, d, 12, 0, 0);
                                                    })()
                                                    : apt.date || new Date(), 'dd/MM', { locale: ptBR })}
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-medium leading-tight mb-1 truncate" title={apt.patientName}>
                                            {apt.patientName}
                                        </h4>

                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-1">
                                            <span className="flex items-center gap-1">
                                                <Stethoscope className="w-3 h-3" />
                                                {apt.type}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-background">
                                                {format(typeof apt.date === 'string' && apt.date
                                                    ? (() => {
                                                        // Safety check for date string
                                                        const [y, m, d] = apt.date.split('-').map(Number);
                                                        return new Date(y, m - 1, d, 12, 0, 0);
                                                    })()
                                                    : apt.date || new Date(), 'HH:mm')} ({apt.duration}min)
                                            </Badge>
                                            {apt.room && (
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {apt.room}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Filters Panel */}
            <Card className="bg-card border-border/50 shadow-sm flex-1 flex flex-col min-h-0">
                <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FilterIcon className="w-4 h-4 text-primary" />
                            Filtros
                        </CardTitle>
                        {(filters.therapists.length > 0 || filters.rooms.length > 0 || filters.services.length > 0) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                                onClick={() => onFilterChange({ therapists: [], rooms: [], services: [] })}
                            >
                                Limpar
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden flex-1">
                    <ScrollArea className="h-full">
                        <div className="p-4 pt-0 space-y-6">

                            {/* Therapists Filter */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terapeutas</h5>
                                </div>
                                <div className="space-y-2">
                                    {availableTherapists.map(therapist => (
                                        <div key={therapist} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-therapist-${therapist}`}
                                                checked={filters.therapists.includes(therapist)}
                                                onCheckedChange={() => handleCheckboxChange('therapists', therapist)}
                                            />
                                            <label
                                                htmlFor={`filter-therapist-${therapist}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/80 hover:text-foreground transition-colors"
                                            >
                                                {therapist}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Rooms Filter */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Salas</h5>
                                <div className="space-y-2">
                                    {availableRooms.map(room => (
                                        <div key={room} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-room-${room}`}
                                                checked={filters.rooms.includes(room)}
                                                onCheckedChange={() => handleCheckboxChange('rooms', room)}
                                            />
                                            <label
                                                htmlFor={`filter-room-${room}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/80 hover:text-foreground transition-colors"
                                            >
                                                {room}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Services Filter */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serviços</h5>
                                <div className="space-y-2">
                                    {availableServices.map(service => (
                                        <div key={service} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`filter-service-${service}`}
                                                checked={filters.services.includes(service)}
                                                onCheckedChange={() => handleCheckboxChange('services', service)}
                                            />
                                            <label
                                                htmlFor={`filter-service-${service}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground/80 hover:text-foreground transition-colors"
                                            >
                                                {service}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    )
}
