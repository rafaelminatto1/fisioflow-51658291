import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
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
  insurance_number: z.string().optional(),
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
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
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
      Object.keys(patient).forEach((key) => {
        setValue(key as keyof PatientFormData, patient[key] || '');
      });
    }
  }, [patient, setValue]);

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Informações Básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input id="birth_date" type="date" {...register('birth_date')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" {...register('cpf')} placeholder="000.000.000-00" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => setValue('status', value)} defaultValue={patient?.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="Inicial">Inicial</SelectItem>
                      <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contato</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" {...register('phone')} placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Contato de Emergência</Label>
                  <Input id="emergency_contact" {...register('emergency_contact')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Tel. Emergência</Label>
                  <Input id="emergency_phone" {...register('emergency_phone')} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" {...register('address')} placeholder="Rua, número, complemento" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" {...register('city')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" {...register('state')} placeholder="SP" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input id="zip_code" {...register('zip_code')} placeholder="00000-000" />
                </div>
              </div>
            </div>

            {/* Health Insurance */}
            <div className="space-y-4">
              <h3 className="font-semibold">Plano de Saúde</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="health_insurance">Convênio</Label>
                  <Input id="health_insurance" {...register('health_insurance')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_number">Número da Carteirinha</Label>
                  <Input id="insurance_number" {...register('insurance_number')} />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea 
                id="observations" 
                {...register('observations')} 
                rows={4}
                placeholder="Informações adicionais sobre o paciente..."
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientModal;
