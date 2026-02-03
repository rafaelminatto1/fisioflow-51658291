/**
 * Input de telefone com máscara automática e validação
 *
 * Formata automaticamente: (00) 00000-0000 ou (00) 0000-0000
 * Valida telefone brasileiro em tempo real
 */

import { forwardRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { isValidPhone, stripNonDigits } from '@/utils/validators';

export interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  showIcon?: boolean;
  placeholder?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, onValidChange, error, showIcon = true, placeholder = '(00) 00000-0000', className, ...props }, ref
) => {
  const [internalValue, setInternalValue] = useState(() => formatPhone(value));

  // Atualizar valor
  const updateValue = useCallback((newValue: string) => {
    const digits = stripNonDigits(newValue);
    let formatted = '';

    if (digits.length > 0) {
      formatted += '(';

      // DDD (sempre 2 dígitos)
      if (digits.length > 0) {
        formatted += digits.substring(0, 2);
      }
      formatted += ') ';

      // Número
      if (digits.length > 2) {
        const remaining = digits.substring(2);
        if (remaining.length <= 4) {
          // Telefone fixo: (00) 0000-0000
          formatted += remaining.substring(0, 4);
        } else {
          // Celular: (00) 00000-0000
          formatted += remaining.substring(0, 5);
          if (remaining.length > 5) {
            formatted += '-';
            formatted += remaining.substring(5, 9);
          }
        }
      }
    }

    setInternalValue(formatted);

    if (onChange) {
      onChange(formatted);
    }

    // Validar
    const digitsCount = stripNonDigits(formatted).length;
    if (onValidChange) {
      onValidChange((digitsCount === 10 || digitsCount === 11) && isValidPhone(formatted));
    }
  }, [onChange, onValidChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(e.target.value);
  }, [updateValue]);

  // Validar estilo
  const isValid = (internalValue.length === 14 || internalValue.length === 13) && isValidPhone(internalValue);
  const isInvalid = (internalValue.length === 14 || internalValue.length === 13) && !isValid;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={15} // (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        className={className}
        aria-invalid={isInvalid || !!error}
        {...props}
      />
      {showIcon && internalValue.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : isInvalid ? (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
});

PhoneInput.displayName = 'PhoneInput';

function formatPhone(value: string): string {
  const digits = stripNonDigits(value);
  let formatted = '';

  if (digits.length > 0) {
    formatted += '(';
    formatted += digits.substring(0, 2);
    formatted += ') ';

    const remaining = digits.substring(2);
    if (digits.length >= 11) {
      // Celular: 9 dígitos
      formatted += remaining.substring(0, 5);
      if (remaining.length > 5) {
        formatted += '-';
        formatted += remaining.substring(5, 9);
      }
    } else {
      // Fixo: 8 dígitos
      formatted += remaining.substring(0, 4);
      if (remaining.length > 4) {
        formatted += '-';
        formatted += remaining.substring(4, 8);
      }
    }
  }

  return formatted;
}
