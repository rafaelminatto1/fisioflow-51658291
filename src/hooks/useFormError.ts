import { useCallback } from 'react';
import { FieldErrors, FieldValues, Path } from 'react-hook-form';
import { ZodError } from 'zod';
import { ErrorHandler, ValidationError } from '@/lib/errors';
import { toast } from 'sonner';

/**
 * Hook para integração do sistema de tratamento de erros com React Hook Form
 */
export const useFormError = <T extends FieldValues>() => {
  /**
   * Processa erros de validação Zod e os converte para formato do React Hook Form
   */
  const handleZodError = useCallback((error: ZodError): FieldErrors<T> => {
    const fieldErrors: FieldErrors<T> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.') as Path<T>;
      if (path) {
        fieldErrors[path] = {
          type: 'validation',
          message: err.message
        };
      }
    });
    
    return fieldErrors;
  }, []);
  
  /**
   * Processa erros de API e os exibe como toast
   */
  const handleApiError = useCallback((error: unknown, context?: string) => {
    if (error instanceof ValidationError) {
      // Se é erro de validação com campos específicos
      if (error.validationErrors) {
        const fieldErrors: FieldErrors<T> = {};
        
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          fieldErrors[field as Path<T>] = {
            type: 'server',
            message: Array.isArray(messages) ? messages[0] : messages
          };
        });
        
        return fieldErrors;
      }
      
      // Erro de validação geral
      toast.error(error.message);
      return null;
    }
    
    // Outros tipos de erro
    ErrorHandler.handleApiError(error, context);
    return null;
  }, []);
  
  /**
   * Processa erros de submissão de formulário
   */
  const handleSubmitError = useCallback((
    error: unknown,
    setError?: (name: Path<T>, error: { type: string; message: string }) => void,
    context?: string
  ) => {
    const fieldErrors = handleApiError(error, context);
    
    if (fieldErrors && setError) {
      Object.entries(fieldErrors).forEach(([field, error]) => {
        if (error && typeof error === 'object' && 'message' in error) {
          setError(field as Path<T>, {
            type: error.type || 'server',
            message: error.message as string
          });
        }
      });
    }
  }, [handleApiError]);
  
  /**
   * Wrapper para operações assíncronas em formulários
   */
  const withFormErrorHandling = useCallback(<R>(
    operation: () => Promise<R>,
    setError?: (name: Path<T>, error: { type: string; message: string }) => void,
    context?: string
  ) => {
    return async (): Promise<R | null> => {
      try {
        return await operation();
      } catch (error) {
        handleSubmitError(error, setError, context);
        return null;
      }
    };
  }, [handleSubmitError]);
  
  /**
   * Valida dados usando schema Zod e retorna erros formatados
   */
  const validateWithZod = useCallback(<S>(
    schema: { parse: (data: unknown) => S },
    data: unknown
  ): { success: true; data: S } | { success: false; errors: FieldErrors<T> } => {
    try {
      const validData = schema.parse(data);
      return { success: true, data: validData };
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false, errors: handleZodError(error) };
      }
      throw error;
    }
  }, [handleZodError]);
  
  /**
   * Exibe erro de campo específico
   */
  const showFieldError = useCallback((message: string, field?: string) => {
    const errorMessage = field ? `${field}: ${message}` : message;
    toast.error(errorMessage);
  }, []);
  
  /**
   * Exibe sucesso de operação
   */
  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);
  
  /**
   * Limpa todos os erros de um formulário
   */
  const clearErrors = useCallback((
    clearErrors?: () => void
  ) => {
    if (clearErrors) {
      clearErrors();
    }
  }, []);
  
  return {
    handleZodError,
    handleApiError,
    handleSubmitError,
    withFormErrorHandling,
    validateWithZod,
    showFieldError,
    showSuccess,
    clearErrors
  };
};

/**
 * Hook específico para formulários de autenticação
 */
export const useAuthFormError = () => {
  const formError = useFormError();
  
  const handleAuthError = useCallback((error: unknown, context?: string) => {
    // Mensagens específicas para erros de autenticação
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('invalid_credentials') || message.includes('invalid login')) {
        toast.error('Email ou senha incorretos');
        return;
      }
      
      if (message.includes('email_not_confirmed')) {
        toast.error('Confirme seu email antes de fazer login');
        return;
      }
      
      if (message.includes('too_many_requests')) {
        toast.error('Muitas tentativas. Tente novamente em alguns minutos');
        return;
      }
      
      if (message.includes('weak_password')) {
        toast.error('Senha muito fraca. Use pelo menos 8 caracteres');
        return;
      }
      
      if (message.includes('email_address_invalid')) {
        toast.error('Email inválido');
        return;
      }
      
      if (message.includes('signup_disabled')) {
        toast.error('Cadastro temporariamente desabilitado');
        return;
      }
    }
    
    // Fallback para outros erros
    formError.handleApiError(error, context || 'Authentication');
  }, [formError]);
  
  return {
    ...formError,
    handleAuthError
  };
};

/**
 * Hook específico para formulários de pacientes
 */
export const usePatientFormError = () => {
  const formError = useFormError();
  
  const handlePatientError = useCallback((error: unknown, context?: string) => {
    // Mensagens específicas para erros de pacientes
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('cpf_already_exists')) {
        toast.error('CPF já cadastrado no sistema');
        return;
      }
      
      if (message.includes('email_already_exists')) {
        toast.error('Email já cadastrado no sistema');
        return;
      }
      
      if (message.includes('phone_already_exists')) {
        toast.error('Telefone já cadastrado no sistema');
        return;
      }
      
      if (message.includes('invalid_cpf')) {
        toast.error('CPF inválido');
        return;
      }
      
      if (message.includes('patient_not_found')) {
        toast.error('Paciente não encontrado');
        return;
      }
    }
    
    // Fallback para outros erros
    formError.handleApiError(error, context || 'Patient');
  }, [formError]);
  
  return {
    ...formError,
    handlePatientError
  };
};

/**
 * Hook específico para formulários de exercícios
 */
export const useExerciseFormError = () => {
  const formError = useFormError();
  
  const handleExerciseError = useCallback((error: unknown, context?: string) => {
    // Mensagens específicas para erros de exercícios
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('exercise_not_found')) {
        toast.error('Exercício não encontrado');
        return;
      }
      
      if (message.includes('invalid_duration')) {
        toast.error('Duração inválida para o exercício');
        return;
      }
      
      if (message.includes('invalid_difficulty')) {
        toast.error('Nível de dificuldade inválido');
        return;
      }
      
      if (message.includes('plan_not_found')) {
        toast.error('Plano de exercícios não encontrado');
        return;
      }
    }
    
    // Fallback para outros erros
    formError.handleApiError(error, context || 'Exercise');
  }, [formError]);
  
  return {
    ...formError,
    handleExerciseError
  };
};

/**
 * Utilitário para criar mensagens de erro padronizadas
 */
export const createErrorMessage = {
  required: (field: string) => `${field} é obrigatório`,
  invalid: (field: string) => `${field} inválido`,
  tooShort: (field: string, min: number) => `${field} deve ter pelo menos ${min} caracteres`,
  tooLong: (field: string, max: number) => `${field} deve ter no máximo ${max} caracteres`,
  email: () => 'Email inválido',
  phone: () => 'Telefone inválido',
  cpf: () => 'CPF inválido',
  cnpj: () => 'CNPJ inválido',
  password: () => 'Senha deve ter pelo menos 8 caracteres, incluindo letras e números',
  passwordMatch: () => 'Senhas não coincidem',
  date: () => 'Data inválida',
  future: () => 'Data deve ser futura',
  past: () => 'Data deve ser passada',
  number: () => 'Deve ser um número válido',
  positive: () => 'Deve ser um número positivo',
  url: () => 'URL inválida',
  file: () => 'Arquivo inválido',
  fileSize: (maxSize: string) => `Arquivo deve ter no máximo ${maxSize}`,
  fileType: (types: string[]) => `Tipos permitidos: ${types.join(', ')}`
};