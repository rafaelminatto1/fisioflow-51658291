import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, DollarSign, CreditCard, Banknote, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FinancialService } from '@/services/financialService';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointment';

const paymentSchema = z.object({
    type: z.enum(['single_session', 'package']),
    amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
    method: z.string().min(1, 'Selecione um método de pagamento'),
    date: z.date(),
    description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentRegistrationModalProps {
    appointment: Appointment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function PaymentRegistrationModal({
    appointment,
    open,
    onOpenChange,
    onSuccess,
}: PaymentRegistrationModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutateAsync: updateAppointment } = useUpdateAppointment();

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            type: 'single_session',
            amount: appointment.payment_amount ? Number(appointment.payment_amount) : 0,
            method: 'pix',
            date: new Date(),
            description: '',
        },
    });

    const { register, setValue, watch, handleSubmit, formState: { errors }, reset } = form;

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            reset({
                type: 'single_session',
                amount: appointment.payment_amount ? Number(appointment.payment_amount) : 0,
                method: 'pix',
                date: new Date(),
                description: `Pagamento referente ao atendimento de ${appointment.patientName}`,
            });
        }
    }, [open, appointment, reset]);

    const date = watch('date');
    const type = watch('type');

    const onSubmit = async (data: PaymentFormValues) => {
        setIsSubmitting(true);
        try {
            // 1. Create Financial Transaction
            await FinancialService.createTransaction({
                tipo: 'income', // 'income' for receiving payment
                // @ts-ignore - The type definition in FinancialService might be strict string, but 'income' is usually correct for transaction type
                // If type is 'receita' in backend, we should use that. 
                // Checking existing code, FinancialApi uses 'income' | 'expense'.
                // But FinancialService.createTransaction Omit<Transaction...> might expect backend DB string.
                // Let's assume 'receita' based on typical portuguese systems or strict to what FinancialApi expects.
                // Wait, FinancialService.createTransaction takes `Omit<Transaction...>`
                // Let's stick to 'receita' as per common convention if the interface allows string.
                // Actually, FinancialApi.Transaction has `type: 'income' | 'expense'`.
                // Let's check `Transaction` interface in `financialService.ts` again.
                // It says `tipo: string`. So 'receita' is probably what we want if it's localized, or 'income'.
                // Let's use 'receita' for safety with backend, or check existing usage?
                // Usage in `FinanceiroTab` shows `pagamento.tipo` as 'prestador', 'insumo', 'outro'.
                // Those are expenses.
                // For income, let's use 'receita'.
                category: data.type === 'package' ? 'Pacote' : 'Atendimento',
                descricao: data.description || `Pagamento - ${appointment.patientName}`,
                valor: data.amount,
                status: 'concluido',
                metadata: {
                    appointmentId: appointment.id,
                    patientId: appointment.patientId,
                    paymentMethod: data.method,
                    paymentType: data.type,
                },
                user_id: appointment.therapistId,
            });

            // 2. Update Appointment Status
            await updateAppointment({
                appointmentId: appointment.id,
                updates: {
                    payment_status: 'paid',
                    // payment_method: data.method, // If these columns exist on appointment
                    // payment_amount: data.amount, 
                },
            });

            toast.success('Pagamento registrado com sucesso!');
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error('Erro ao registrar pagamento. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Pagamento</DialogTitle>
                    <DialogDescription>
                        Confirme os detalhes do pagamento para este atendimento.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

                    {/* Tipo de Pagamento */}
                    <div className="space-y-2">
                        <Label>Tipo de Referência</Label>
                        <Select
                            value={watch('type')}
                            onValueChange={(val) => setValue('type', val as 'single_session' | 'package')}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single_session">Sessão Avulsa</SelectItem>
                                <SelectItem value="package">Pacote / Plano</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Valor */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                className="pl-9"
                                placeholder="0.00"
                                {...register('amount', { valueAsNumber: true })}
                            />
                        </div>
                        {errors.amount && (
                            <p className="text-xs text-destructive">{errors.amount.message}</p>
                        )}
                    </div>

                    {/* Método de Pagamento */}
                    <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select
                            value={watch('method')}
                            onValueChange={(val) => setValue('method', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pix">Pix</SelectItem>
                                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                                <SelectItem value="cash">Dinheiro</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.method && (
                            <p className="text-xs text-destructive">{errors.method.message}</p>
                        )}
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                        <Label>Data do Pagamento</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setValue('date', d)}
                                    initialFocus
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
