import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  health_insurance: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  observations: z.string().optional(),
  status: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

export const EditPatientModal: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId?: string
}> = ({ open, onOpenChange, patientId }) => {

  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, setValue, control } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      birth_date: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      health_insurance: '',
      emergency_contact: '',
      emergency_phone: '',
      observations: '',
      status: 'active',
    }
  });

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!patientId
  });

  useEffect(() => {
    if (patient) {
      // Reset form with patient data
      reset({
        name: patient.name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        cpf: patient.cpf || '',
        birth_date: patient.birth_date || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip_code: patient.zip_code || '',
        health_insurance: patient.health_insurance || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        observations: patient.observations || '',
        status: patient.status || 'active',
      });
    }
  }, [patient, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      if (!patientId) throw new Error('Patient ID is required');

      const { error } = await supabase
        .from('patients')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Paciente atualizado',
        description: 'As informações do paciente foram atualizadas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      onOpenChange(false);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PatientFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>
            Atualize as informações cadastrais do paciente
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <form id="edit-patient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Nome Completo *</Label>
                    <Input id="name" {...register('name')} className="h-9" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="birth_date" className="text-sm">Data de Nascimento</Label>
                    <Input id="birth_date" type="date" {...register('birth_date')} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cpf" className="text-sm">CPF</Label>
                    <Input id="cpf" {...register('cpf')} placeholder="000.000.000-00" className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-sm">Status</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                            <SelectItem value="Inicial">Inicial</SelectItem>
                            <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input id="email" type="email" {...register('email')} className="h-9" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">Telefone</Label>
                    <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_contact" className="text-sm">Contato de Emergência</Label>
                    <Input id="emergency_contact" {...register('emergency_contact')} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emergency_phone" className="text-sm">Tel. Emergência</Label>
                    <Input id="emergency_phone" {...register('emergency_phone')} placeholder="(00) 00000-0000" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="address" className="text-sm">Endereço</Label>
                    <Input id="address" {...register('address')} placeholder="Rua, número, complemento" className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-sm">Cidade</Label>
                    <Input id="city" {...register('city')} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-sm">Estado</Label>
                    <Input id="state" {...register('state')} placeholder="SP" className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zip_code" className="text-sm">CEP</Label>
                    <Input id="zip_code" {...register('zip_code')} placeholder="00000-000" className="h-9" />
                  </div>
                </div>
              </div>

              {/* Health Insurance */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plano de Saúde</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="health_insurance" className="text-sm">Convênio</Label>
                    <Input id="health_insurance" {...register('health_insurance')} className="h-9" />
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-1.5">
                <Label htmlFor="observations" className="text-sm">Observações</Label>
                <Textarea
                  id="observations"
                  {...register('observations')}
                  rows={3}
                  placeholder="Informações adicionais sobre o paciente..."
                  className="resize-none"
                />
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="gap-2 p-6 pt-2 border-t mt-auto bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="edit-patient-form"
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientModal;
