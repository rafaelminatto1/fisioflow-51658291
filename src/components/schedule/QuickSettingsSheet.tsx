import React, { useState, useEffect, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/web/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/shared/ui/tabs';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { Slider } from '@/components/shared/ui/slider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Clock, Users, Calendar, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

interface ScheduleConfig {
    businessHours: {
        weekdays: { start: string; end: string };
        saturday: { start: string; end: string };
        sunday: { start: string; end: string };
    };
    slotDuration: number; // minutes
    maxCapacity: number;
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
    slotDuration: 30,
    maxCapacity: 4,
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

export const QuickSettingsSheet = memo(({ open, onOpenChange }: QuickSettingsSheetProps) => {
    const { profile } = useAuth();
    const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
    const [hasChanges, setHasChanges] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load settings from database on mount
    useEffect(() => {
        if (open && profile?.organization_id) {
            loadSettings();
        }
    }, [open, profile?.organization_id]);

    const loadSettings = useCallback(async () => {
        if (!profile?.organization_id) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.organization_id)
                .single();

            if (error) throw error;

            if (data?.settings?.schedule) {
                setConfig(data.settings.schedule);
                logger.info('Schedule settings loaded', { organizationId: profile.organization_id }, 'QuickSettingsSheet');
            }
        } catch (error) {
            logger.error('Failed to load schedule settings', error, 'QuickSettingsSheet');
        } finally {
            setIsLoading(false);
        }
    }, [profile?.organization_id]);

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

    const handleSlotDurationChange = (value: number[]) => {
        setConfig(prev => ({ ...prev, slotDuration: value[0] }));
        setHasChanges(true);
        setSaved(false);
    };

    const handleMaxCapacityChange = (value: number[]) => {
        setConfig(prev => ({ ...prev, maxCapacity: value[0] }));
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
        if (!profile?.organization_id) {
            toast({
                title: 'Erro',
                description: 'Usuário não autenticado',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    settings: {
                        ...await getCurrentSettings(),
                        schedule: config,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.organization_id);

            if (error) throw error;

            setHasChanges(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);

            toast({
                title: 'Configurações salvas',
                description: 'As configurações da agenda foram atualizadas.',
            });

            logger.info('Schedule settings saved', { organizationId: profile.organization_id }, 'QuickSettingsSheet');
        } catch (error) {
            logger.error('Failed to save schedule settings', error, 'QuickSettingsSheet');
            toast({
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar as configurações.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getCurrentSettings = async () => {
        const { data } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', profile?.organization_id)
            .single();
        return data?.settings || {};
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
                        Ajuste horários, capacidade e dias de trabalho
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="hours" className="mt-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="hours" className="gap-1.5">
                            <Clock className="w-4 h-4" />
                            Horários
                        </TabsTrigger>
                        <TabsTrigger value="capacity" className="gap-1.5">
                            <Users className="w-4 h-4" />
                            Capacidade
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

                            {/* Slot Duration */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">
                                    Duração do Slot (minutos)
                                </Label>
                                <div className="px-1">
                                    <Slider
                                        value={[config.slotDuration]}
                                        onValueChange={handleSlotDurationChange}
                                        min={15}
                                        max={120}
                                        step={15}
                                        className="py-4"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>15 min</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                                            {config.slotDuration} min
                                        </span>
                                        <span>120 min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Capacity Tab */}
                    <TabsContent value="capacity" className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">
                                    Capacidade Máxima por Horário
                                </Label>
                                <div className="px-1">
                                    <Slider
                                        value={[config.maxCapacity]}
                                        onValueChange={handleMaxCapacityChange}
                                        min={1}
                                        max={10}
                                        step={1}
                                        className="py-4"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>1 paciente</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                                            {config.maxCapacity} pacientes
                                        </span>
                                        <span>10 pacientes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                                <p className="text-sm font-medium">Preview do Indicador</p>
                                <div className="flex items-center gap-3">
                                    {[1, 2, 3, 4].map((count) => (
                                        <div
                                            key={count}
                                            className={cn(
                                                "flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium",
                                                count >= config.maxCapacity
                                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700"
                                                    : count >= config.maxCapacity * 0.75
                                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                                                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
                                            )}
                                        >
                                            <Users className="w-3 h-3" />
                                            <span>{count}/{config.maxCapacity}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Este indicador aparece no calendário mostrando ocupação em tempo real
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Days Tab */}
                    <TabsContent value="days" className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
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
                        disabled={!hasChanges || isSaving}
                    >
                        Resetar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={cn(
                            "flex-1 gap-2",
                            saved && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        {isSaving ? (
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
