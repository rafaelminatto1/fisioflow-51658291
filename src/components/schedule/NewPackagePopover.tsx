import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { PackagePlus, Loader2, Coins, CalendarDays } from 'lucide-react';
import { useSessionPackages, usePurchasePackage } from '@/hooks/usePackages';
import { toast } from 'sonner';

const newPackageSchema = z.object({
    template_id: z.string().min(1, 'Selecione um modelo de pacote'),
    sessions_count: z.number().min(1, 'Mínimo de 1 sessão'),
    price: z.number().min(0, 'Valor não pode ser negativo'),
    payment_method: z.string().min(1, 'Selecione a forma de pagamento'),
});

type NewPackageFormData = z.infer<typeof newPackageSchema>;

interface NewPackagePopoverProps {
    patientId: string;
    onPackageCreated: (packageId: string) => void;
    disabled?: boolean;
}

export function NewPackagePopover({
    patientId,
    onPackageCreated,
    disabled
}: NewPackagePopoverProps) {
    const [open, setOpen] = useState(false);
    const { data: templates, isLoading: isLoadingTemplates, isError, error } = useSessionPackages();
    const { mutateAsync: purchasePackage, isPending: isPurchasing } = usePurchasePackage();

    const form = useForm<NewPackageFormData>({
        resolver: zodResolver(newPackageSchema),
        defaultValues: {
            template_id: '',
            sessions_count: 10,
            price: 0,
            payment_method: '',
        },
    });

    const { watch, setValue, handleSubmit, reset, formState: { errors } } = form;
    const watchedTemplateId = watch('template_id');

    useEffect(() => {
        console.log('NewPackagePopover templates:', templates);
        console.log('NewPackagePopover isLoading:', isLoadingTemplates);
        console.log('NewPackagePopover error:', error);
    }, [templates, isLoadingTemplates, error]);

    // Auomatic update of defaults when template changes
    useEffect(() => {
        if (watchedTemplateId && templates) {
            const template = templates.find((t) => t.id === watchedTemplateId);
            if (template) {
                setValue('sessions_count', template.sessions_count);
                setValue('price', template.price);
            }
        }
    }, [watchedTemplateId, templates, setValue]);

    const onSubmit = async (data: NewPackageFormData) => {
        if (!patientId) {
            toast.error('Selecione um paciente primeiro.');
            return;
        }

        try {
            const result = await purchasePackage({
                patient_id: patientId,
                package_id: data.template_id,
                custom_sessions: data.sessions_count,
                custom_price: data.price,
                payment_method: data.payment_method,
            });

            toast.success('Pacote criado com sucesso!');
            onPackageCreated(result.id);
            setOpen(false);
            reset();
        } catch (error) {
            console.error(error);
            // Toast is handled in the hook
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-dashed border-primary/40 hover:border-primary/60 hover:bg-primary/5 text-primary"
                    disabled={disabled || !patientId}
                    title={!patientId ? "Selecione um paciente primeiro" : "Vender novo pacote"}
                >
                    <PackagePlus className="h-4 w-4" />
                    <span className="hidden xs:inline">Novo Pacote</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h4 className="font-medium leading-none flex items-center gap-2">
                            <PackagePlus className="h-4 w-4 text-primary" />
                            Vender Novo Pacote
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Configure os detalhes da venda para este paciente.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        {/* Template Selection */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Modelo de Pacote</Label>
                            <Select
                                onValueChange={(val) => setValue('template_id', val)}
                                value={watch('template_id')}
                                disabled={isLoadingTemplates || isPurchasing}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Selecione um modelo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingTemplates ? (
                                        <div className="p-2 text-xs text-center text-muted-foreground">
                                            Carregando...
                                        </div>
                                    ) : isError ? (
                                        <div className="p-2 text-xs text-center text-destructive">
                                            Erro ao carregar modelos
                                        </div>
                                    ) : (
                                        templates?.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="text-xs">
                                                {t.name}
                                            </SelectItem>
                                        ))
                                    )}
                                    {!isLoadingTemplates && !isError && (!templates || templates.length === 0) && (
                                        <div className="p-2 text-xs text-center text-muted-foreground">
                                            Nenhum modelo encontrado
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.template_id && (
                                <p className="text-[10px] text-destructive">{errors.template_id.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Sessions Count */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                    Sessões
                                </Label>
                                <Input
                                    type="number"
                                    {...form.register('sessions_count', { valueAsNumber: true })}
                                    className="h-8 text-xs"
                                    min={1}
                                    disabled={isPurchasing}
                                />
                                {errors.sessions_count && (
                                    <p className="text-[10px] text-destructive">{errors.sessions_count.message}</p>
                                )}
                            </div>

                            {/* Price */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1.5">
                                    <Coins className="h-3 w-3 text-muted-foreground" />
                                    Valor Total
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('price', { valueAsNumber: true })}
                                        className="h-8 text-xs pl-7"
                                        min={0}
                                        disabled={isPurchasing}
                                    />
                                </div>
                                {errors.price && (
                                    <p className="text-[10px] text-destructive">{errors.price.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Forma de Pagamento</Label>
                            <Select
                                onValueChange={(val) => setValue('payment_method', val)}
                                value={watch('payment_method')}
                                disabled={isPurchasing}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                    <SelectItem value="debito">Débito</SelectItem>
                                    <SelectItem value="credito">Crédito</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.payment_method && (
                                <p className="text-[10px] text-destructive">{errors.payment_method.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-8 text-xs" disabled={isPurchasing}>
                            {isPurchasing ? (
                                <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Confirmar Venda'
                            )}
                        </Button>
                    </form>
                </div>
            </PopoverContent>
        </Popover>
    );
}
