import React, { useState, useEffect, memo } from 'react';
import {

    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScheduleSettings, type BusinessHour } from '@/hooks/useScheduleSettings';

interface ScheduleConfig {
    businessHours: {
        weekdays: { start: string; end: string };
        saturday: { start: string; end: string };
        sunday: { start: string; end: string };
    };
    workingDays: {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
    };
}

const defaultConfig: ScheduleConfig = {
    businessHours: {
        weekdays: { start: '07:00', end: '21:00' },
        saturday: { start: '07:00', end: '13:00' },
        sunday: { start: '00:00', end: '00:00' }, // Closed
    },
    workingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
    },
};

const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
    '22:00'
];

interface QuickSettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function configFromBusinessHours(hours: BusinessHour[]): ScheduleConfig {
    const get = (day: number) => hours.find(h => h.day_of_week === day);
    const mon = get(1);
    const sat = get(6);
    const sun = get(0);
    return {
        ...defaultConfig,
        businessHours: {
            weekdays: mon ? { start: mon.open_time, end: mon.close_time } : defaultConfig.businessHours.weekdays,
            saturday: sat ? { start: sat.open_time, end: sat.close_time } : defaultConfig.businessHours.saturday,
            sunday: sun ? { start: sun.open_time, end: sun.close_time } : defaultConfig.businessHours.sunday,
        },
        workingDays: {
            monday: get(1)?.is_open ?? true,
            tuesday: get(2)?.is_open ?? true,
            wednesday: get(3)?.is_open ?? true,
            thursday: get(4)?.is_open ?? true,
            friday: get(5)?.is_open ?? true,
            saturday: get(6)?.is_open ?? true,
            sunday: get(0)?.is_open ?? false,
        },
    };
}

export const QuickSettingsSheet = memo(({ open, onOpenChange }: QuickSettingsSheetProps) => {
    const { businessHours, upsertBusinessHours } = useScheduleSettings();
    const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open && businessHours && businessHours.length > 0) {
            setConfig(configFromBusinessHours(businessHours));
        }
    }, [open, businessHours]);

    const handleTimeChange = (day: 'weekdays' | 'saturday' | 'sunday', field: 'start' | 'end', value: string) => {
        setConfig(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [day]: {
                    ...prev.businessHours[day],
                    [field]: value
                }
            }
        }));
        setHasChanges(true);
        setSaved(false);
    };

    const handleWorkingDayToggle = (day: keyof ScheduleConfig['workingDays']) => {
        setConfig(prev => ({
            ...prev,
            workingDays: {
                ...prev.workingDays,
                [day]: !prev.workingDays[day]
            }
        }));
        setHasChanges(true);
        setSaved(false);
    };

    const handleSave = async () => {
        const hours: Partial<BusinessHour>[] = [
            { day_of_week: 0, is_open: config.workingDays.sunday, open_time: config.businessHours.sunday.start, close_time: config.businessHours.sunday.end },
            { day_of_week: 1, is_open: config.workingDays.monday, open_time: config.businessHours.weekdays.start, close_time: config.businessHours.weekdays.end },
            { day_of_week: 2, is_open: config.workingDays.tuesday, open_time: config.businessHours.weekdays.start, close_time: config.businessHours.weekdays.end },
            { day_of_week: 3, is_open: config.workingDays.wednesday, open_time: config.businessHours.weekdays.start, close_time: config.businessHours.weekdays.end },
            { day_of_week: 4, is_open: config.workingDays.thursday, open_time: config.businessHours.weekdays.start, close_time: config.businessHours.weekdays.end },
            { day_of_week: 5, is_open: config.workingDays.friday, open_time: config.businessHours.weekdays.start, close_time: config.businessHours.weekdays.end },
            { day_of_week: 6, is_open: config.workingDays.saturday, open_time: config.businessHours.saturday.start, close_time: config.businessHours.saturday.end },
        ];
        try {
            await upsertBusinessHours.mutateAsync(hours);
            setHasChanges(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            // Erro já exibido pelo useScheduleSettings (toast)
        }
    };

    const handleReset = () => {
        setConfig(defaultConfig);
        setHasChanges(true);
        setSaved(false);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Configurações da Agenda</SheetTitle>
                    <SheetDescription>
                        Ajuste horários e dias de trabalho
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="hours" className="mt-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="hours" className="gap-1.5">
                            <Clock className="w-4 h-4" />
                            Horários
                        </TabsTrigger>
                        <TabsTrigger value="days" className="gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Dias
                        </TabsTrigger>
                    </TabsList>

                    {/* Hours Tab */}
                    <TabsContent value="hours" className="space-y-6">
                        <div className="space-y-4">
                            {/* Weekdays */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Badge variant="outline" className="font-normal">Seg-Sex</Badge>
                                    Horário de Funcionamento
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="weekday-start" className="text-xs text-slate-500">
                                            Abertura
                                        </Label>
                                        <select
                                            id="weekday-start"
                                            value={config.businessHours.weekdays.start}
                                            onChange={(e) => handleTimeChange('weekdays', 'start', e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                        >
                                            {timeSlots.map(slot => (
                                                <option key={`start-${slot}`} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="weekday-end" className="text-xs text-slate-500">
                                            Fechamento
                                        </Label>
                                        <select
                                            id="weekday-end"
                                            value={config.businessHours.weekdays.end}
                                            onChange={(e) => handleTimeChange('weekdays', 'end', e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                        >
                                            {timeSlots.map(slot => (
                                                <option key={`end-${slot}`} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Saturday */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Badge variant="outline" className="font-normal">Sábado</Badge>
                                    Horário de Funcionamento
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="saturday-start" className="text-xs text-slate-500">
                                            Abertura
                                        </Label>
                                        <select
                                            id="saturday-start"
                                            value={config.businessHours.saturday.start}
                                            onChange={(e) => handleTimeChange('saturday', 'start', e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                        >
                                            {timeSlots.map(slot => (
                                                <option key={`sat-start-${slot}`} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="saturday-end" className="text-xs text-slate-500">
                                            Fechamento
                                        </Label>
                                        <select
                                            id="saturday-end"
                                            value={config.businessHours.saturday.end}
                                            onChange={(e) => handleTimeChange('saturday', 'end', e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                        >
                                            {timeSlots.map(slot => (
                                                <option key={`sat-end-${slot}`} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </TabsContent>

                    {/* Days Tab */}
                    <TabsContent value="days" className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500 dark:text-gray-500">
                                Selecione os dias da semana em que a clínica funciona
                            </p>

                            {[
                                { key: 'monday' as const, label: 'Segunda-feira' },
                                { key: 'tuesday' as const, label: 'Terça-feira' },
                                { key: 'wednesday' as const, label: 'Quarta-feira' },
                                { key: 'thursday' as const, label: 'Quinta-feira' },
                                { key: 'friday' as const, label: 'Sexta-feira' },
                                { key: 'saturday' as const, label: 'Sábado' },
                                { key: 'sunday' as const, label: 'Domingo' },
                            ].map(({ key, label }) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Label htmlFor={`day-${key}`} className="cursor-pointer font-medium">
                                        {label}
                                    </Label>
                                    <Switch
                                        id={`day-${key}`}
                                        checked={config.workingDays[key]}
                                        onCheckedChange={() => handleWorkingDayToggle(key)}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Dias ativos: {Object.values(config.workingDays).filter(Boolean).length}/7
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                {Object.values(config.workingDays).filter(Boolean).length === 7
                                    ? "Todos os dias da semana estão ativos"
                                    : `${Object.values(config.workingDays).filter(Boolean).length} dias de trabalho por semana`}
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex gap-2 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1"
                        disabled={!hasChanges || upsertBusinessHours.isPending}
                    >
                        Resetar
                    </Button>
                    <Button
                        onClick={() => void handleSave()}
                        disabled={!hasChanges || upsertBusinessHours.isPending}
                        className={cn(
                            "flex-1 gap-2",
                            saved && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        {upsertBusinessHours.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Salvando...
                            </>
                        ) : saved ? (
                            <>
                                <Check className="w-4 h-4" />
                                Salvo!
                            </>
                        ) : (
                            'Salvar Alterações'
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
});

QuickSettingsSheet.displayName = 'QuickSettingsSheet';
