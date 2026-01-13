import React, { useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, UserPlus, Loader2, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// ===== Schema de validação =====
const quickPatientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres')
    .refine(val => val.trim().includes(' '), {
      message: 'Por favor, informe o nome completo (nome e sobrenome)'
    }),
  phone: z.string()
    .optional()
    .refine(val => !val || val.replace(/\D/g, '').length >= 10, {
      message: 'Telefone deve ter pelo menos 10 dígitos'
    }),
});

type QuickPatientFormData = z.infer<typeof quickPatientSchema>;

// ===== Tipos =====
interface QuickPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: (patientId: string, patientName: string) => void;
  suggestedName?: string;
}

// ===== Funções utilitárias =====
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 11);

  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
};

const cleanPhoneNumber = (phone: string | undefined): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned : null;
};

// ===== Mensagens de erro amigáveis =====
const getErrorMessage = (error: { code?: string; message?: string } | null | undefined): string => {
  const code = error?.code;
  const message = error?.message || '';

  const errorMessages: Record<string, string> = {
    '23505': 'Já existe um paciente com este nome ou telefone cadastrado.',
    '42501': 'Sem permissão para criar pacientes. Verifique suas permissões.',
    '23503': 'Erro de referência: organização não encontrada.',
  };

  if (errorMessages[code]) {
    return errorMessages[code];
  }

  if (message.includes('row-level security')) {
    return 'Sem permissão para criar pacientes. Verifique suas permissões.';
  }

  if (message.includes('organization_id')) {
    return 'Erro ao associar paciente à organização.';
  }

  return message || 'Não foi possível criar o paciente.';
};

// ===== Componente Principal =====
export const QuickPatientModal: React.FC<QuickPatientModalProps> = ({
  open,
  onOpenChange,
  onPatientCreated,
  suggestedName = ''
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();

  const form = useForm<QuickPatientFormData>({
    resolver: zodResolver(quickPatientSchema),
    defaultValues: {
      name: suggestedName,
      phone: '',
    },
    mode: 'onChange', // Validação em tempo real
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch
  } = form;

  const phoneValue = watch('phone');
  const nameValue = watch('name');

  // ===== Mutation para criar paciente =====
  const createPatientMutation = useMutation({
    mutationFn: async (data: QuickPatientFormData) => {
      // Verificar autenticação
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Verificar organização
      if (!currentOrganization?.id) {
        throw new Error('Organização não encontrada. Tente fazer login novamente.');
      }

      // Verificar permissões (opcional - RLS já cuida disso)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const allowedRoles = ['admin', 'fisioterapeuta', 'estagiario'];
      const hasPermission = (roles || []).some((r: { role: string | number }) => allowedRoles.includes(String(r.role)));

      if (!hasPermission) {
        throw new Error('Você não tem permissão para criar pacientes.');
      }

      // Criar paciente
      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert({
          full_name: data.name.trim(),
          phone: cleanPhoneNumber(data.phone),
          status: 'active',
          incomplete_registration: true,
          organization_id: currentOrganization.id,
        })
        .select('id, full_name')
        .single();

      if (error) {
        logger.error('Erro ao criar paciente', error, 'QuickPatientModal');
        throw error;
      }

      if (!newPatient) {
        throw new Error('Paciente não foi criado. Tente novamente.');
      }

      return newPatient;
    },
    onSuccess: (newPatient) => {
      logger.info('Paciente criado com sucesso', { patientId: newPatient.id }, 'QuickPatientModal');

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: '✅ Paciente criado!',
        description: `${newPatient.full_name} foi adicionado. Complete o cadastro quando possível.`,
      });

      reset();
      onOpenChange(false);
      onPatientCreated(newPatient.id, newPatient.full_name);
    },
    onError: (error: { code?: string; message?: string } | null | undefined) => {
      logger.error('Erro ao criar paciente rápido', error, 'QuickPatientModal');

      toast({
        title: 'Erro ao criar paciente',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  // ===== Handlers =====
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhoneNumber(e.target.value), { shouldValidate: true });
  }, [setValue]);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const onSubmit = useCallback((data: QuickPatientFormData) => {
    createPatientMutation.mutate(data);
  }, [createPatientMutation]);

  // ===== Sincronizar nome sugerido =====
  React.useEffect(() => {
    if (open && suggestedName) {
      setValue('name', suggestedName, { shouldValidate: true });
    }
  }, [open, suggestedName, setValue]);

  // ===== Reset ao fechar =====
  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  // ===== Computed values =====
  const isFormDisabled = createPatientMutation.isPending;
  const canSubmit = isValid && !isFormDisabled && nameValue?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg">Cadastro Rápido</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Cadastre um paciente rapidamente e complete os dados depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Aviso de cadastro incompleto */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Cadastro Incompleto
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-200/80">
                O paciente será marcado para completar dados posteriormente.
              </p>
            </div>
          </div>

          {/* Campo Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4 text-muted-foreground" />
              Nome Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: João da Silva"
              autoFocus
              autoComplete="name"
              disabled={isFormDisabled}
              className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Campo Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Telefone <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phoneValue || ''}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              disabled={isFormDisabled}
              className={errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isFormDisabled}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="min-w-[140px]"
            >
              {createPatientMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
