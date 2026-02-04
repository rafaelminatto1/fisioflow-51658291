import React, { useEffect } from 'react';
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
import { Loader2, Stethoscope, Calendar, User, Building2, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SurgeryService } from '@/lib/services/surgeryService';
import { SURGERY_TYPES, AFFECTED_SIDES } from '@/lib/constants/surgery';
import type { Surgery, SurgeryFormData } from '@/types/evolution';
import { toast } from 'sonner';

const formSchema = z.object({
  surgery_name: z.string().min(2, 'Nome da cirurgia é obrigatório'),
  surgery_date: z.string().min(1, 'Data da cirurgia é obrigatória'),
  affected_side: z.enum(['direito', 'esquerdo', 'bilateral', 'nao_aplicavel']),
  surgeon_name: z.string().optional(),
  hospital: z.string().optional(),
  surgery_type: z.string().optional(),
  notes: z.string().optional(),
  complications: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SurgeryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  surgery?: Surgery | null;
  onSuccess?: () => void;
}

export const SurgeryFormModal: React.FC<SurgeryFormModalProps> = ({
  open,
  onOpenChange,
  patientId,
  surgery,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!surgery;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      surgery_name: '',
      surgery_date: '',
      affected_side: 'nao_aplicavel',
      surgeon_name: '',
      hospital: '',
      surgery_type: '',
      notes: '',
      complications: '',
    },
  });

  useEffect(() => {
    if (surgery) {
      form.reset({
        surgery_name: surgery.surgery_name || '',
        surgery_date: surgery.surgery_date || '',
        affected_side: (surgery.affected_side as FormValues['affected_side']) || 'nao_aplicavel',
        surgeon_name: surgery.surgeon_name || surgery.surgeon || '',
        hospital: surgery.hospital || '',
        surgery_type: surgery.surgery_type || '',
        notes: surgery.notes || '',
        complications: surgery.complications || '',
      });
    } else {
      form.reset({
        surgery_name: '',
        surgery_date: '',
        affected_side: 'nao_aplicavel',
        surgeon_name: '',
        hospital: '',
        surgery_type: '',
        notes: '',
        complications: '',
      });
    }
  }, [surgery, form, open]);

  const createMutation = useMutation({
    mutationFn: (data: SurgeryFormData) => SurgeryService.addSurgery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-surgeries', patientId] });
      toast.success('Cirurgia registrada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao registrar cirurgia');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SurgeryFormData> }) =>
      SurgeryService.updateSurgery(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-surgeries', patientId] });
      toast.success('Cirurgia atualizada com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao atualizar cirurgia');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SurgeryService.deleteSurgery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-surgeries', patientId] });
      toast.success('Cirurgia removida com sucesso');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao remover cirurgia');
    },
  });

  const onSubmit = (values: FormValues) => {
    const data: SurgeryFormData = {
      patient_id: patientId,
      surgery_name: values.surgery_name,
      surgery_date: values.surgery_date,
      affected_side: values.affected_side,
      surgeon_name: values.surgeon_name || null,
      hospital: values.hospital || null,
      surgery_type: values.surgery_type || null,
      notes: values.notes || null,
      complications: values.complications || null,
    };

    if (isEditing && surgery) {
      updateMutation.mutate({ id: surgery.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (surgery && confirm('Tem certeza que deseja remover esta cirurgia?')) {
      deleteMutation.mutate(surgery.id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Cirurgia' : 'Nova Cirurgia'}
          </DialogTitle>
          <DialogDescription>
            Registre os detalhes da cirurgia do paciente para acompanhamento da recuperação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surgery_name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome da Cirurgia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Reconstrução do LCA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surgery_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cirurgia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SURGERY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surgery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Data *
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
                name="affected_side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lado Afetado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AFFECTED_SIDES.map((side) => (
                          <SelectItem key={side.value} value={side.value}>
                            {side.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surgeon_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Cirurgião
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Dr(a). Nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hospital"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Hospital / Clínica
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do hospital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes adicionais sobre a cirurgia..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complications"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Complicações
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Registre complicações, se houver..."
                        rows={2}
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
                  'Registrar Cirurgia'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
