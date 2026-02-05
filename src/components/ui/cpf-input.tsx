/**
 * Input de CPF com máscara automática e validação
 *
 * Formata automaticamente: 000.000.000-00
 * Valida CPF em tempo real
 */

import { forwardRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { isValidCPF, stripNonDigits } from '@/utils/validators';

export interface CPFInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  showIcon?: boolean;
}

export const CPFInput = forwardRef<HTMLInputElement, CPFInputProps>(
  ({ value = '', onChange, onValidChange, error, showIcon = true, className, ...props }, ref
) => {
  const [internalValue, setInternalValue] = useState(() => formatCPF(value));

  // Atualizar valor externo
  const updateValue = useCallback((newValue: string) => {
    const digits = stripNonDigits(newValue);
    let formatted = '';

    if (digits.length > 0) {
      // Adiciona pontos e traço conforme usuário digita
      for (let i = 0; i < Math.min(digits.length, 11); i++) {
        if (i === 3 || i === 6) {
          formatted += '.';
        } else if (i === 9) {
          formatted += '-';
        }
        formatted += digits[i];
      }
    }

    setInternalValue(formatted);

    // Notificar mudança
    if (onChange) {
      onChange(formatted);
    }

    // Validar se tem 11 dígitos
    if (onValidChange) {
      onValidChange(digits.length === 11 && isValidCPF(formatted));
    }
  }, [onChange, onValidChange]);

  // Lidar com digitação
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(e.target.value);
  }, [updateValue]);

  // Validar estilo base
  const isValid = internalValue.length === 14 && isValidCPF(internalValue);
  const isInvalid = internalValue.length === 14 && !isValid;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={internalValue}
        onChange={handleChange}
        maxLength={14}
        placeholder="000.000.000-00"
        className={className}
        aria-invalid={isInvalid || !!error}
        {...props}
      />
      {showIcon && internalValue.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
          {isValid ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>CPF válido</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : isInvalid ? (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>CPF inválido</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
});

CPFInput.displayName = 'CPFInput';

function formatCPF(value: string): string {
  const digits = stripNonDigits(value);
  let formatted = '';

  for (let i = 0; i < Math.min(digits.length, 11); i++) {
    if (i === 3 || i === 6) {
      formatted += '.';
    } else if (i === 9) {
      formatted += '-';
    }
    formatted += digits[i];
  }

  return formatted;
}
