import { useState } from 'react';

// Tipo simplificado para erro de campo
interface FieldError {
  message: string;
  type?: string;
}

// Estado de erro do formulário
interface FormError {
  [key: string]: FieldError | undefined;
}

export function useFormError() {
  const [errors, setErrors] = useState<FormError>({});

  const setError = (field: string, error: FieldError) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const getError = (field: string): FieldError | undefined => {
    return errors[field];
  };

  const hasError = (field: string): boolean => {
    return !!errors[field];
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  return {
    errors,
    setError,
    clearError,
    getError,
    hasError,
    clearAllErrors
  };
}