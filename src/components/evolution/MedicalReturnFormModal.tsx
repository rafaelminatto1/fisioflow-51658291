import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Stethoscope, Calendar, Phone, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MedicalReturnService } from '@/lib/services/medicalReturnService';
import type { MedicalReturn, MedicalReturnFormData } from '@/types/evolution';
import { DoctorAutocomplete } from '@/components/doctors/DoctorAutocomplete';
import { DoctorFormModal } from '@/components/doctors/DoctorFormModal';
import { toast } from 'sonner';

const formSchema = z.object({
    doctor_name: z.string().min(2, 'Nome do médico é obrigatório'),
    doctor_phone: z.string().optional(),
    return_date: z.string().min(1, 'Data do retorno é obrigatória'),
    return_period: z.string().nullable().optional(),
    notes: z.string().optional(),
    report_done: z.boolean().default(false),
    report_sent: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface MedicalReturnFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    medicalReturn?: MedicalReturn | null;
    onSuccess?: () => void;
}

export const MedicalReturnFormModal: React.FC<MedicalReturnFormModalProps> = ({
    open,
    onOpenChange,
    patientId,
    medicalReturn,
    onSuccess,
}) => {
    const queryClient = useQueryClient();
    const isEditing = !!medicalReturn;
    const [doctorModalOpen, setDoctorModalOpen] = useState(false);
    const [suggestedDoctorName, setSuggestedDoctorName] = useState('');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            doctor_name: '',
            doctor_phone: '',
            return_date: '',
            return_period: null,
            notes: '',
            report_done: false,
            report_sent: false,
        },
    });

    useEffect(() => {
        if (medicalReturn) {
            form.reset({
                doctor_name: medicalReturn.doctor_name || '',
                doctor_phone: medicalReturn.doctor_phone || '',
                return_date: medicalReturn.return_date || '',
                return_period: medicalReturn.return_period || null,
                notes: medicalReturn.notes || '',
                report_done: !!medicalReturn.report_done,
                report_sent: !!medicalReturn.report_sent,
            });
        } else {
            form.reset({
                doctor_name: '',
                doctor_phone: '',
                return_date: '',
                return_period: null,
                notes: '',
                report_done: false,
                report_sent: false,
            });
        }
    }, [medicalReturn, form, open]);

    useEffect(() => {
        if (!open) {
            setDoctorModalOpen(false);
            setSuggestedDoctorName('');
        }
    }, [open]);

    const createMutation = useMutation({
        mutationFn: (data: MedicalReturnFormData) => MedicalReturnService.addMedicalReturn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-medical-returns', patientId] });
            toast.success('Retorno médico registrado com sucesso');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: () => {
            toast.error('Erro ao registrar retorno médico');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MedicalReturnFormData> }) =>
            MedicalReturnService.updateMedicalReturn(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-medical-returns', patientId] });
            toast.success('Retorno médico atualizado com sucesso');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: () => {
            toast.error('Erro ao atualizar retorno médico');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => MedicalReturnService.deleteMedicalReturn(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-medical-returns', patientId] });
            toast.success('Retorno médico removido com sucesso');
            onOpenChange(false);
            onSuccess?.();
        },
        onError: () => {
            toast.error('Erro ao remover retorno médico');
        },
    });

    const onSubmit = (values: FormValues) => {
        const data: MedicalReturnFormData = {
            patient_id: patientId,
            doctor_name: values.doctor_name,
            doctor_phone: values.doctor_phone || '',
            return_date: values.return_date,
            return_period: values.return_period || undefined,
            notes: values.notes || '',
            report_done: values.report_done,
            report_sent: values.report_sent,
        };

        if (isEditing && medicalReturn) {
            updateMutation.mutate({ id: medicalReturn.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = () => {
        if (medicalReturn && confirm('Tem certeza que deseja remover este retorno médico?')) {
            deleteMutation.mutate(medicalReturn.id);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            {isEditing ? 'Editar Retorno Médico' : 'Novo Retorno Médico'}
                        </DialogTitle>
                        <DialogDescription>
                            Agende ou registre os detalhes do retorno do paciente ao médico assistente.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="doctor_name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Nome do Médico *</FormLabel>
                                            <FormControl>
                                                <DoctorAutocomplete
                                                    value={field.value}
                                                    onSelect={(doctor) => {
                                                        if (doctor) {
                                                            field.onChange(doctor.name);
                                                            // Auto-populate phone if available
                                                            form.setValue('doctor_phone', doctor.phone || '');
                                                        } else {
                                                            field.onChange('');
                                                        }
                                                    }}
                                                    onCreateNew={(searchTerm) => {
                                                        setSuggestedDoctorName(searchTerm);
                                                        setDoctorModalOpen(true);
                                                    }}
                                                    placeholder="Selecione ou digite o nome do médico..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="doctor_phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                Telefone
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="(00) 00000-0000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="return_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Data do Retorno *
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="return_period"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Período do Dia (Opcional)</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(value === '__none' ? null : value)}
                                                value={field.value ?? '__none'}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o período..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="__none">Não informado</SelectItem>
                                                    <SelectItem value="manha">Manhã</SelectItem>
                                                    <SelectItem value="tarde">Tarde</SelectItem>
                                                    <SelectItem value="noite">Noite</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-2 flex gap-6 pt-2">
                                    <FormField
                                        control={form.control}
                                        name="report_done"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="flex items-center gap-1 cursor-pointer">
                                                        <FileText className="h-3 w-3" />
                                                        Relatório Pronto
                                                    </FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="report_sent"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="flex items-center gap-1 cursor-pointer">
                                                        <FileText className="h-3 w-3 text-green-500" />
                                                        Relatório Enviado
                                                    </FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Observações / Condutas p/ Médico</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Detalhes sobre o que informar ao médico no retorno..."
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                {isEditing && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={isPending}
                                    >
                                        Excluir
                                    </Button>
                                )}
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : isEditing ? (
                                        'Salvar Alterações'
                                    ) : (
                                        'Registrar Retorno'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <DoctorFormModal
                open={doctorModalOpen}
                onOpenChange={(nextOpen) => {
                    setDoctorModalOpen(nextOpen);
                    if (!nextOpen) {
                        setSuggestedDoctorName('');
                    }
                }}
                suggestedName={suggestedDoctorName}
                onSuccess={(doctor) => {
                    form.setValue('doctor_name', doctor.name, { shouldDirty: true, shouldValidate: true });
                    form.setValue('doctor_phone', doctor.phone || '', { shouldDirty: true, shouldValidate: true });
                    setDoctorModalOpen(false);
                    setSuggestedDoctorName('');
                }}
            />
        </>
    );
};
