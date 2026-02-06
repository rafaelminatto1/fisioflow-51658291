import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Doctor, DoctorFormData } from '@/types/doctor';
import { useCreateDoctor, useUpdateDoctor } from '@/hooks/useDoctors';

const formSchema = z.object({
    name: z.string().min(2, 'Nome é obrigatório'),
    specialty: z.string().optional(),
    crm: z.string().optional(),
    crm_state: z.string().max(2, 'Use a sigla do estado (ex: SP)').optional(),
    phone: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    clinic_name: z.string().optional(),
    clinic_address: z.string().optional(),
    clinic_phone: z.string().optional(),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DoctorFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    doctor?: Doctor | null;
    onSuccess?: (doctor: Doctor) => void;
    suggestedName?: string;
}

export function DoctorFormModal({
    open,
    onOpenChange,
    doctor,
    onSuccess,
    suggestedName,
}: DoctorFormModalProps) {
    const isEditing = !!doctor;
    const createMutation = useCreateDoctor();
    const updateMutation = useUpdateDoctor();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: doctor?.name || suggestedName || '',
            specialty: doctor?.specialty || '',
            crm: doctor?.crm || '',
            crm_state: doctor?.crm_state || '',
            phone: doctor?.phone || '',
            email: doctor?.email || '',
            clinic_name: doctor?.clinic_name || '',
            clinic_address: doctor?.clinic_address || '',
            clinic_phone: doctor?.clinic_phone || '',
            notes: doctor?.notes || '',
        },
    });

    React.useEffect(() => {
        if (open && doctor) {
            form.reset({
                name: doctor.name || '',
                specialty: doctor.specialty || '',
                crm: doctor.crm || '',
                crm_state: doctor.crm_state || '',
                phone: doctor.phone || '',
                email: doctor.email || '',
                clinic_name: doctor.clinic_name || '',
                clinic_address: doctor.clinic_address || '',
                clinic_phone: doctor.clinic_phone || '',
                notes: doctor.notes || '',
            });
        } else if (open && !doctor) {
            form.reset({
                name: suggestedName || '',
                specialty: '',
                crm: '',
                crm_state: '',
                phone: '',
                email: '',
                clinic_name: '',
                clinic_address: '',
                clinic_phone: '',
                notes: '',
            });
        }
    }, [open, doctor, form, suggestedName]);

    const onSubmit = async (values: FormValues) => {
        const data: DoctorFormData = {
            name: values.name,
            specialty: values.specialty || undefined,
            crm: values.crm || undefined,
            crm_state: values.crm_state || undefined,
            phone: values.phone || undefined,
            email: values.email || undefined,
            clinic_name: values.clinic_name || undefined,
            clinic_address: values.clinic_address || undefined,
            clinic_phone: values.clinic_phone || undefined,
            notes: values.notes || undefined,
        };

        if (isEditing) {
            updateMutation.mutate(
                { id: doctor.id, data },
                {
                    onSuccess: (savedDoctor) => {
                        onOpenChange(false);
                        onSuccess?.(savedDoctor);
                    },
                }
            );
        } else {
            createMutation.mutate(data, {
                onSuccess: (createdDoctor) => {
                    onOpenChange(false);
                    onSuccess?.(createdDoctor);
                },
            });
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Médico' : 'Cadastrar Novo Médico'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Atualize as informações do médico'
                            : 'Preencha os dados do médico. Apenas o nome é obrigatório.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Informações Básicas
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Nome Completo *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Dr(a). Nome Completo" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="specialty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Especialidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Ortopedista" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="crm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CRM</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123456" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="crm_state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado CRM</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SP" maxLength={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Contato
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(11) 99999-9999" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="medico@exemplo.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Clinic Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Clínica / Consultório
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="clinic_name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Nome da Clínica</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome da clínica" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="clinic_address"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Endereço da Clínica</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rua, número, bairro" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="clinic_phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone da Clínica</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(11) 3333-3333" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Informações adicionais sobre o médico..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Informações adicionais que podem ser úteis
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isPending}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Atualizar' : 'Cadastrar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
