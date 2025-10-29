import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const quickPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
});

interface QuickPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: (patientId: string, patientName: string) => void;
  suggestedName?: string;
}

export const QuickPatientModal: React.FC<QuickPatientModalProps> = ({ 
  open, 
  onOpenChange,
  onPatientCreated,
  suggestedName = ''
}) => {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(quickPatientSchema),
    defaultValues: {
      name: suggestedName,
      phone: '',
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = form;
  const phoneValue = watch('phone');

  // Função para formatar telefone com máscara (XX) XXXXX-XXXX
  const formatPhone = (value: string) => {
    if (!value) return '';
    
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted);
  };
  
  const handleSave = async (data: z.infer<typeof quickPatientSchema>) => {
    try {
      // Verifica sessão e papéis antes de tentar inserir (evita erro 401/RLS)
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        toast({
          title: 'Sessão necessária',
          description: 'Faça login para criar pacientes.',
          variant: 'destructive',
        });
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.warn('Falha ao buscar papéis do usuário:', rolesError);
      }

      const allowed = ['admin', 'fisioterapeuta', 'estagiario'];
      const hasAllowedRole = (roles || []).some((r: any) => allowed.includes(String(r.role)));

      if (!hasAllowedRole) {
        toast({
          title: 'Sem permissão',
          description: 'Você precisa ser Admin, Fisioterapeuta ou Estagiário para criar pacientes.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Creating quick patient:', data);
      
      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert([{
          name: data.name,
          phone: data.phone || null,
          status: 'active',
          incomplete_registration: true,
          // Campos mínimos para evitar erros
          birth_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Patient created successfully:', newPatient);

      toast({
        title: 'Paciente criado!',
        description: `${data.name} foi adicionado. Lembre-se de completar o cadastro posteriormente.`,
      });

      reset();
      onOpenChange(false);
      onPatientCreated(newPatient.id, newPatient.name);
    } catch (error: any) {
      console.error('Error creating quick patient:', error);

      let description = error?.message || 'Não foi possível criar o paciente.';
      if (error?.code === '42501' || /row-level security/i.test(description) || error?.status === 401) {
        description = 'Sem permissão para criar pacientes (RLS). Faça login e confirme seu papel (admin/fisio/estagiário).';
      }

      toast({
        title: 'Erro ao criar paciente',
        description,
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    if (open && suggestedName) {
      form.setValue('name', suggestedName);
    }
  }, [open, suggestedName, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <span>Cadastro Rápido de Paciente</span>
          </DialogTitle>
          <DialogDescription>
            Crie um cadastro básico agora e complete as informações depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          {/* Aviso */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Cadastro Incompleto
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-200">
                Este paciente será marcado como "cadastro incompleto" e você receberá lembretes para completar os dados.
              </p>
            </div>
          </div>

          {/* Nome do paciente - OBRIGATÓRIO */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Digite o nome completo do paciente"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{String(errors.name.message)}</p>
            )}
          </div>

          {/* Telefone - OPCIONAL */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (Opcional)</Label>
            <Input
              id="phone"
              value={phoneValue || ''}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{String(errors.phone.message)}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Paciente
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
