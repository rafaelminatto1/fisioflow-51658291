/**
 * Input de data no formato brasileiro (DD/MM/YYYY)
 *
 * Formata automaticamente: 00/00/0000
 * Valida data em tempo real
 */

import { forwardRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { parseBrazilianDate } from '@/utils/validators';

export interface DateInputBRProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  placeholder?: string;
  minAge?: number; // Idade mínima (opcional)
  maxAge?: number; // Idade máxima (opcional)
}

export const DateInputBR = forwardRef<HTMLInputElement, DateInputBRProps>(
  ({ value = '', onChange, onValidChange, error, placeholder = 'DD/MM/AAAA', minAge, maxAge, className, ...props }, ref
) => {
  const [internalValue, setInternalValue] = useState(() => formatDate(value));

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.replace(/\D/g, ''); // Apenas números

    // Adicionar barras
    if (newValue.length > 0) {
      if (newValue.length <= 2) {
        // DD
        newValue = newValue;
      } else if (newValue.length <= 4) {
        // DD/MM
        newValue = newValue.substring(0, 2) + '/' + newValue.substring(2, 4);
      } else {
        // DD/MM/AAAA
        newValue = newValue.substring(0, 2) + '/' + newValue.substring(2, 4) + '/' + newValue.substring(4, 8);
      }
    }

    setInternalValue(newValue);

    if (onChange) {
      onChange(newValue);
    }

    // Validar
    const isValidDate = newValue.length === 10 && parseBrazilianDate(newValue) !== null;
    if (onValidChange && newValue.length === 10) {
      onValidChange(isValidDate);
    }
  }, [onChange, onValidChange]);

  // Calcular idade mínima/máxima se especificado
  const getAgeLimit = useCallback(() => {
    if (!internalValue || internalValue.length !== 10) return null;
    const date = parseBrazilianDate(internalValue);
    if (!date) return null;

    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    return age;
  }, [internalValue]);

  const isValid = internalValue.length === 10 && parseBrazilianDate(internalValue) !== null;
  const isInvalid = internalValue.length === 10 && !isValid;

  // Verificar limites de idade
  const age = getAgeLimit();
  const ageInvalid = minAge !== undefined && age !== null && age < minAge;
  const maxAgeInvalid = maxAge !== undefined && age !== null && age > maxAge;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={10}
        className={className}
        aria-invalid={isInvalid || ageInvalid || maxAgeInvalid || !!error}
        {...props}
      />
      {internalValue.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
          {isValid ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>Data válida</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : isInvalid || ageInvalid || maxAgeInvalid ? (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>Data inválida</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}
      {(ageInvalid || maxAgeInvalid) && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-500">
          {ageInvalid && `Mínimo ${minAge} anos`}
          {maxAgeInvalid && `Máximo ${maxAge} anos`}
        </div>
      )}
    </div>
  );
});

DateInputBR.displayName = 'DateInputBR';

function formatDate(value: string): string {
  if (!value) return '';

  // Se já está no formato DD/MM/YYYY, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }

  // Se é ISO (YYYY-MM-DD), converte
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  return value;
}
