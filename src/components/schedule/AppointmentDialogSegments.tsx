import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    CalendarIcon,
    User,
    AlertTriangle,
    Check,
    CreditCard,
    Zap,
    Repeat,
    Bell,
    Copy,
    Wand2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { type AppointmentType, type AppointmentStatus, type AppointmentFormData } from '@/types/appointment';
import { type Patient } from '@/types';
import {
    APPOINTMENT_TYPES,
    APPOINTMENT_STATUSES,
    STATUS_LABELS,
    STATUS_COLORS
} from '@/constants/appointments';
import { Checkbox } from '@/components/ui/checkbox';
import { EquipmentSelector, type SelectedEquipment } from './EquipmentSelector';
import { AppointmentReminder, type AppointmentReminderData } from './AppointmentReminder';
import { usePatientPackages, type PatientPackage } from '@/hooks/usePackages';

export const PatientSelectionSection = ({
    patients,
    isLoading,
    disabled,
    onCreateNew
}: {
    patients: Patient[],
    isLoading: boolean,
    disabled: boolean,
    onCreateNew: (name: string) => void
}) => {
    const { watch, setValue, formState: { errors } } = useFormContext<AppointmentFormData>();

    return (
        <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Paciente *
            </Label>
            <PatientCombobox
                patients={patients}
                value={watch('patient_id')}
                onValueChange={(value) => setValue('patient_id', value)}
                onCreateNew={onCreateNew}
                disabled={disabled || isLoading}
            />
            {errors.patient_id && (
                <p className="text-xs text-destructive">{(errors.patient_id as { message?: string })?.message}</p>
            )}
        </div>
    );
};

export const DateTimeSection = ({
    disabled,
    timeSlots,
    isCalendarOpen,
    setIsCalendarOpen,
    getCapacityForTime,
    conflictCount,
    onAutoSchedule
}: {
    disabled: boolean,
    timeSlots: string[],
    isCalendarOpen: boolean,
    setIsCalendarOpen: (open: boolean) => void,
    getCapacityForTime: (day: number, time: string) => number,
    conflictCount: number,
    onAutoSchedule?: () => void
}) => {
    const { watch, setValue, formState: { errors } } = useFormContext<AppointmentFormData>();
    const watchedDateStr = watch('appointment_date');
    const watchedTime = watch('appointment_time');
    const watchedDuration = watch('duration');

    const watchedDate = watchedDateStr ? (typeof watchedDateStr === 'string' ? parseISO(watchedDateStr) : watchedDateStr as Date) : null;

    const maxCapacity = watchedDate && watchedTime ? getCapacityForTime(watchedDate.getDay(), watchedTime) : 0;
    const availableSlots = maxCapacity - conflictCount;
    const exceedsCapacity = conflictCount >= maxCapacity;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Data *</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal h-9 sm:h-10 text-xs sm:text-sm",
                                    !watchedDate && "text-muted-foreground",
                                    errors.appointment_date && "border-destructive text-destructive"
                                )}
                                disabled={disabled}
                            >
                                <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {watchedDate ? format(watchedDate, 'dd/MM', { locale: ptBR }) : "Data"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={watchedDate || undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        setValue('appointment_date', format(date, 'yyyy-MM-dd'));
                                    }
                                    setIsCalendarOpen(false);
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.appointment_date && (
                        <p className="text-[10px] text-destructive font-medium">{(errors.appointment_date as { message?: string })?.message}</p>
                    )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 relative">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm font-medium">Horário *</Label>
                        {onAutoSchedule && !disabled && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 -mt-1 -mr-1 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={onAutoSchedule}
                                title="Sugerir melhor horário"
                            >
                                <Wand2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    <Select
                        value={watchedTime}
                        onValueChange={(value) => setValue('appointment_time', value)}
                        disabled={disabled}
                    >
                        <SelectTrigger className={cn(
                            "h-9 sm:h-10 text-xs sm:text-sm",
                            errors.appointment_time && "border-destructive text-destructive"
                        )}>
                            <SelectValue placeholder="Hora" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {timeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.appointment_time && (
                        <p className="text-[10px] text-destructive font-medium">{(errors.appointment_time as { message?: string })?.message}</p>
                    )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 col-span-2 sm:col-span-1">
                    <Label className="text-xs sm:text-sm font-medium">Duração</Label>
                    <Select
                        value={watchedDuration?.toString()}
                        onValueChange={(value) => setValue('duration', parseInt(value))}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">1 hora</SelectItem>
                            <SelectItem value="90">1h30</SelectItem>
                            <SelectItem value="120">2 horas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {watchedDate && watchedTime && (
                <div className={cn(
                    "flex items-center justify-between p-2 sm:p-2.5 border rounded-lg text-xs sm:text-sm transition-all",
                    exceedsCapacity
                        ? "border-red-500/30 bg-red-500/5"
                        : conflictCount > 0
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-emerald-500/30 bg-emerald-500/5"
                )}>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {exceedsCapacity ? (
                            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                        ) : (
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                        )}
                        <span className={cn(
                            "font-medium",
                            exceedsCapacity ? "text-red-700" : conflictCount > 0 ? "text-amber-700" : "text-emerald-700"
                        )}>
                            {exceedsCapacity
                                ? "Horário lotado!"
                                : availableSlots === maxCapacity
                                    ? "Horário livre"
                                    : `${availableSlots} ${availableSlots !== 1 ? 'vagas disponíveis' : 'vaga disponível'}`
                            }
                        </span>
                    </div>
                    <Badge variant="outline" className={cn(
                        "text-[10px] sm:text-xs h-5 sm:h-6",
                        exceedsCapacity ? "border-red-500/50" : "border-muted"
                    )}>
                        {conflictCount}/{maxCapacity}
                    </Badge>
                </div>
            )}
        </div>
    );
};

export const TypeAndStatusSection = ({ disabled }: { disabled: boolean }) => {
    const { watch, setValue, formState: { errors } } = useFormContext<AppointmentFormData>();

    return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Tipo *</Label>
                <Select
                    value={watch('type')}
                    onValueChange={(value) => setValue('type', value as AppointmentType)}
                    disabled={disabled}
                >
                    <SelectTrigger className={cn(
                        "h-9 sm:h-10 text-xs sm:text-sm",
                        errors.type && "border-destructive text-destructive"
                    )}>
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        {APPOINTMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.type && (
                    <p className="text-[10px] text-destructive font-medium">{(errors.type as { message?: string })?.message}</p>
                )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Status *</Label>
                <Select
                    value={watch('status')}
                    onValueChange={(value) => setValue('status', value as AppointmentStatus)}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {APPOINTMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[status])} />
                                    {STATUS_LABELS[status]}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export const PaymentTab = ({
    disabled,
    watchPaymentStatus,
    watchPaymentMethod,
    watchPaymentAmount,
    patientId
}: {
    disabled: boolean,
    watchPaymentStatus: string,
    watchPaymentMethod: string,
    watchPaymentAmount: number,
    patientId?: string
}) => {
    const { register, setValue, watch } = useFormContext<AppointmentFormData>();
    const { data: patientPackages, isLoading: isLoadingPackages } = usePatientPackages(patientId);

    const activePackages = patientPackages?.filter(p => p.status === 'active' && (p.sessions_remaining || 0) > 0) || [];

    const paymentOptions = [
        { value: 'pending', label: 'Pendente', icon: '⏳', color: 'border-amber-500/30 bg-amber-500/5' },
        { value: 'paid_single', label: 'Avulso', icon: '💵', color: 'border-emerald-500/30 bg-emerald-500/5' },
        { value: 'paid_package', label: 'Pacote', icon: '📦', color: 'border-blue-500/30 bg-blue-500/5' },
    ];

    const paymentMethods = [
        { value: 'pix', label: 'PIX', icon: '📲' },
        { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
        { value: 'debito', label: 'Débito', icon: '💳' },
        { value: 'credito', label: 'Crédito', icon: '💳' },
    ];

    return (
        <div className="mt-0 space-y-2.5 sm:space-y-3">
            <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                    Tipo de Pagamento
                </Label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {paymentOptions.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            variant={watchPaymentStatus === option.value ? 'default' : 'outline'}
                            className={cn(
                                "h-14 sm:h-16 flex-col gap-0.5 sm:gap-1 transition-all",
                                watchPaymentStatus === option.value
                                    ? "ring-2 ring-primary ring-offset-1 sm:ring-offset-2 shadow-md"
                                    : option.color
                            )}
                            disabled={disabled}
                            onClick={() => {
                                setValue('payment_status', option.value);
                                if (option.value === 'paid_single') {
                                    setValue('payment_amount', 180);
                                    setValue('session_package_id', null);
                                }
                                if (option.value === 'paid_package') {
                                    setValue('payment_amount', 170); // Valor de referência
                                    // Se houver apenas um pacote ativo, seleciona automaticamente
                                    if (activePackages.length === 1) {
                                        setValue('session_package_id', activePackages[0].id);
                                    }
                                } else {
                                    setValue('session_package_id', null);
                                }
                            }}
                        >
                            <span className="text-lg">{option.icon}</span>
                            <span className="text-[10px] sm:text-xs font-semibold">{option.label}</span>
                        </Button>
                    ))}
                </div>
            </div>

            {watchPaymentStatus === 'paid_package' && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-xs sm:text-sm font-medium flex items-center justify-between">
                        <span>Pacote do Paciente</span>
                        {isLoadingPackages && <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>}
                    </Label>

                    {patientId ? (
                        activePackages.length > 0 ? (
                            <div className="space-y-1">
                                <Select
                                    value={watch('session_package_id') || ''}
                                    onValueChange={(val) => setValue('session_package_id', val)}
                                    disabled={disabled}
                                >
                                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm border-blue-200 bg-blue-50/50">
                                        <SelectValue placeholder="Selecione o pacote para debitar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activePackages.map(pkg => (
                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                {pkg.package?.name} ({pkg.sessions_remaining} sessões rest.)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {(() => {
                                    const selectedId = watch('session_package_id');
                                    const selectedPkg = activePackages.find(p => p.id === selectedId);
                                    if (selectedPkg && (selectedPkg.sessions_remaining || 0) <= 1) {
                                        return (
                                            <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-100 text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                <span className="text-[10px] sm:text-xs font-medium">
                                                    Atenção: Última sessão deste pacote! Ofereça renovação.
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        ) : (
                            <div className="p-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md flex flex-col gap-1">
                                <span className="font-medium flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Nenhum pacote ativo encontrado
                                </span>
                                <span>Este paciente não possui pacotes com saldo. Selecione "Avulso" ou cadastre uma nova venda de pacote.</span>
                            </div>
                        )
                    ) : (
                        <div className="p-2 text-xs text-muted-foreground bg-muted/30 rounded-md">
                            Selecione um paciente para ver seus pacotes.
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Valor da Sessão (R$)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('payment_amount', { valueAsNumber: true })}
                        className="flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={disabled || watchPaymentStatus === 'pending'}
                    />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                    💡 Pacote: R$ 170/sessão • Avulso: R$ 180/sessão
                </p>
            </div>

            {(watchPaymentStatus === 'paid_single' || watchPaymentStatus === 'paid_package') && (
                <div className="space-y-2 bg-gradient-to-r from-emerald-500/5 to-transparent p-3 sm:p-4 rounded-lg border border-emerald-500/20">
                    <Label className="text-xs sm:text-sm font-medium">Forma de Pagamento</Label>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                        {paymentMethods.map((method) => (
                            <Button
                                key={method.value}
                                type="button"
                                variant={watchPaymentMethod === method.value ? 'default' : 'outline'}
                                size="sm"
                                className={cn(
                                    "h-10 sm:h-12 flex-col gap-0 sm:gap-0.5 transition-all text-[8px] sm:text-[10px]",
                                    watchPaymentMethod === method.value && "ring-1 ring-primary shadow-sm"
                                )}
                                onClick={() => setValue('payment_method', method.value)}
                                disabled={disabled}
                            >
                                <span className="text-sm sm:text-base">{method.icon}</span>
                                {method.label}
                            </Button>
                        ))}
                    </div>

                    {watchPaymentMethod === 'credito' && (
                        <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                            <Label className="text-xs sm:text-sm">Parcelas (até 6x sem juros)</Label>
                            <Select
                                value={watch('installments')?.toString()}
                                onValueChange={(value) => setValue('installments', parseInt(value))}
                                disabled={disabled}
                            >
                                <SelectTrigger className="h-9 sm:h-10 text-sm">
                                    <SelectValue placeholder="Parcelas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map((num) => (
                                        <SelectItem key={num} value={num.toString()}>
                                            {num}x de R$ {(watchPaymentAmount / num).toFixed(2)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const OptionsTab = ({
    disabled,
    currentMode,
    selectedEquipments,
    setSelectedEquipments,
    _isRecurringCalendarOpen,
    setIsRecurringCalendarOpen,
    reminders,
    setReminders,
    onDuplicate
}: {
    disabled: boolean,
    currentMode: string,
    selectedEquipments: SelectedEquipment[],
    setSelectedEquipments: (equipments: SelectedEquipment[]) => void,
    _isRecurringCalendarOpen: boolean,
    setIsRecurringCalendarOpen: (open: boolean) => void,
    reminders: AppointmentReminderData[],
    setReminders: (reminders: AppointmentReminderData[]) => void,
    onDuplicate?: () => void
}) => {
    const { watch, setValue, formState: { errors } } = useFormContext<AppointmentFormData>();
    const isRecurring = watch('is_recurring');
    const recurringUntilStr = watch('recurring_until');

    const recurringUntil = recurringUntilStr ? (typeof recurringUntilStr === 'string' ? parseISO(recurringUntilStr) : recurringUntilStr as Date) : null;

    return (
        <div className="mt-0 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Equipamentos
                </Label>
                <EquipmentSelector
                    selectedEquipments={selectedEquipments}
                    onSelectionChange={setSelectedEquipments}
                    disabled={disabled}
                />
            </div>

            <div className="space-y-2 bg-gradient-to-r from-blue-500/5 to-transparent p-3 sm:p-4 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Checkbox
                        id="is_recurring"
                        checked={!!isRecurring}
                        onCheckedChange={(checked) => setValue('is_recurring', checked as boolean)}
                        disabled={disabled}
                        className="h-4 w-4"
                    />
                    <div className="flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5 text-blue-600" />
                        <Label htmlFor="is_recurring" className="text-xs sm:text-sm font-medium cursor-pointer">
                            Agendamento Recorrente
                        </Label>
                    </div>
                </div>

                {isRecurring && (
                    <div className="space-y-1.5 pl-6 sm:pl-7">
                        <Label className="text-[10px] sm:text-xs text-muted-foreground">Repetir semanalmente até</Label>
                        <Button
                            type="button"
                            variant="outline"
                            className={cn("w-full justify-start h-9 sm:h-10 text-xs sm:text-sm", !recurringUntil && "text-muted-foreground")}
                            disabled={disabled}
                            onClick={() => setIsRecurringCalendarOpen(true)}
                        >
                            <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {recurringUntil ? format(recurringUntil, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione a data final"}
                        </Button>
                        {errors.recurring_until && <p className="text-xs text-destructive">{(errors.recurring_until as { message?: string })?.message}</p>}
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    Lembretes
                </Label>
                <AppointmentReminder
                    reminders={reminders}
                    onRemindersChange={setReminders}
                    disabled={disabled}
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Sala</Label>
                <Select
                    value={watch('room') || ''}
                    onValueChange={(value) => setValue('room', value)}
                    disabled={disabled}
                >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Selecione a sala" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sala-1">🚪 Sala 01</SelectItem>
                        <SelectItem value="sala-2">🚪 Sala 02</SelectItem>
                        <SelectItem value="sala-3">🚪 Sala 03</SelectItem>
                        <SelectItem value="pilates">🧘 Sala Pilates</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {currentMode === 'edit' && onDuplicate && (
                <div className="pt-2 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                        onClick={onDuplicate}
                    >
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Duplicar Agendamento
                    </Button>
                </div>
            )}
        </div>
    );
};
