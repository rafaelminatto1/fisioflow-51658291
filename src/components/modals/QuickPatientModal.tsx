import React, { useCallback, useEffect, useTransition, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, UserPlus, Loader2, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { patientsApi } from '@/integrations/firebase/functions';

// ===== Schema de validação =====
const quickPatientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(150, 'Nome deve ter no máximo 150 caracteres'),
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
// Memoizadas fora do componente para evitar recriação
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  // Remove tudo que não é dígito e limita a 11 dígitos (2 DDD + 9 número)
  let numbers = value.replace(/\D/g, '').slice(0, 11);

  // Se começar com 55 (código do Brasil), remove
  if (numbers.startsWith('55')) {
    numbers = numbers.slice(2);
  }

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
const getErrorMessage = (error: { code?: string; message?: string; functionName?: string } | null | undefined): string => {
  const code = error?.code;
  const message = error?.message || '';
  const functionName = error?.functionName || 'createPatient';

  // Log detalhado para debug
  console.error('[QuickPatientModal] Erro ao criar paciente:', { code, message, functionName, error });

  // Erros específicos do Firebase/Postgres
  const errorMessages: Record<string, string> = {
    '23505': 'Já existe um paciente com este nome ou telefone cadastrado.',
    '42501': 'Sem permissão para criar pacientes. Verifique suas permissões.',
    '23503': 'Erro de referência: organização não encontrada.',
    'not-found': 'Recurso não encontrado. Verifique a configuração do sistema.',
    'permission-denied': 'Sem permissão para criar pacientes.',
    'unauthenticated': 'Sessão expirada. Faça login novamente.',
    'already-exists': 'Já existe um paciente com estes dados.',
  };

  if (code && errorMessages[code]) {
    return errorMessages[code];
  }

  // Erros do Firebase Functions
  if (message.includes('FirebaseError') || message.includes('The project')) {
    return 'Erro de conexão com o servidor. Tente novamente.';
  }

  if (message.includes('row-level security') || message.includes('insufficient permissions')) {
    return 'Sem permissão para criar pacientes. Verifique suas permissões.';
  }

  if (message.includes('organization_id') || message.includes('organization')) {
    return 'Erro ao associar paciente à organização. Verifique seu perfil.';
  }

  if (message.includes('network')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  // Se for um erro do FunctionCallError, tentar extrair mais informações
  if (error instanceof Error && error.name === 'FunctionCallError') {
    return `Erro ao chamar função ${functionName}. Verifique a conexão.`;
  }

  return message || 'Não foi possível criar o paciente. Tente novamente.';
};

// ===== Componente Principal =====
// Usando memo para evitar re-renders desnecessários quando props não mudam
const QuickPatientModalComponent: React.FC<QuickPatientModalProps> = ({
  open,
  onOpenChange,
  onPatientCreated,
  suggestedName = ''
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth(); // Firebase auth user and profile
  // useTransition para melhor UX durante operações assíncronas (React 18)
  const [isPending, startTransition] = useTransition();

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
      // Verificar autenticação Firebase
      if (!user) {
        logger.error('Usuário Firebase não autenticado', { user }, 'QuickPatientModal');
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Verificar organização (do profile do Firebase)
      const organizationId = profile?.organization_id;
      if (!organizationId) {
        logger.error('Organização não encontrada no profile', { profile }, 'QuickPatientModal');
        throw new Error('Organização não encontrada. Tente fazer login novamente.');
      }

      // Log para debug
      logger.info('Criando paciente via Firebase Functions', {
        name: data.name.trim(),
        phone: cleanPhoneNumber(data.phone),
        organizationId,
      }, 'QuickPatientModal');

      // Criar paciente via Firebase Cloud Functions (PostgreSQL)
      try {
        const newPatient = await patientsApi.create({
          name: data.name.trim(),
          phone: cleanPhoneNumber(data.phone) || undefined,
          status: 'active',
          incomplete_registration: true,
          organization_id: organizationId,
        });

        if (!newPatient) {
          throw new Error('Paciente não foi criado. Tente novamente.');
        }

        logger.info('Paciente criado com sucesso via Firebase Functions', {
          patientId: newPatient.id,
          patientName: newPatient.name || newPatient.full_name
        }, 'QuickPatientModal');

        return newPatient;
      } catch (err: any) {
        // Capturar e logar erros do Firebase Functions
        logger.error('Erro ao criar paciente via Firebase Functions', {
          error: err,
          errorMessage: err?.message,
          errorCode: err?.code,
          errorDetails: err?.details,
        }, 'QuickPatientModal');

        // Re-throw com contexto adicional para o getErrorMessage
        const enhancedError = {
          code: err?.code,
          message: err?.message,
          functionName: 'createPatient',
        };
        throw enhancedError;
      }
    },
    onSuccess: (newPatient) => {
      logger.info('Paciente criado com sucesso', {
        patientId: newPatient.id,
        patientName: newPatient.name || newPatient.full_name
      }, 'QuickPatientModal');

      // Usar startTransition para atualizações de estado não urgentes (React 18)
      startTransition(() => {
        // Invalidar cache para recarregar lista de pacientes
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['activePatients'] });
        queryClient.invalidateQueries({ queryKey: ['current-organization'] });

        toast({
          title: '✅ Paciente criado!',
          description: `${newPatient.name || newPatient.full_name} foi adicionado. Complete o cadastro quando possível.`,
        });

        reset();
        onOpenChange(false);
        onPatientCreated(newPatient.id, (newPatient.name || newPatient.full_name || 'Paciente') as string);
      });
    },
    onError: (error: any) => {
      logger.error('Erro ao criar paciente rápido', error, 'QuickPatientModal');

      // Melhorar o log para incluir FunctionCallError
      if (error.name === 'FunctionCallError') {
        logger.error('Detalhes do erro FunctionCallError', {
          functionName: error.functionName,
          originalError: error.originalError,
        }, 'QuickPatientModal');
      }

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

  // ===== Gerenciar estado do formulário ao abrir/fechar =====
  // Combinando dois useEffects em um para melhor performance
  useEffect(() => {
    if (open) {
      // Ao abrir, sincronizar nome sugerido
      if (suggestedName) {
        setValue('name', suggestedName, { shouldValidate: true });
      }
    } else {
      // Ao fechar, resetar formulário
      reset();
    }
  }, [open, suggestedName, setValue, reset]);

  // ===== Computed values =====
  const isFormDisabled = createPatientMutation.isPending || isPending;
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

// ===== Export com memo para otimização =====
// Usa memo para evitar re-renders quando as props não mudam
// Comparação customizada para onOpenChange e onPatientCreated (funções)
export const QuickPatientModal = memo(QuickPatientModalComponent, (prevProps, nextProps) => {
  return (
    prevProps.open === nextProps.open &&
    prevProps.suggestedName === nextProps.suggestedName
  );
});

QuickPatientModal.displayName = 'QuickPatientModal';
