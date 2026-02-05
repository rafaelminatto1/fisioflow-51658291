/**
 * Input de nome com validação de nome completo
 *
 * Verifica se o nome tem pelo menos 2 palavras
 * Mostra feedback visual em tempo real
 */

import { forwardRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { isValidName } from '@/utils/validators';

export interface NameInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  minLength?: number;
  placeholder?: string;
}

export const NameInput = forwardRef<HTMLInputElement, NameInputProps>(
  ({ value = '', onChange, onValidChange, error, minLength = 3, placeholder = 'Nome completo', className, ...props }, ref
) => {
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTouched(true);

    if (onChange) {
      onChange(newValue);
    }

    if (onValidChange && touched) {
      onValidChange(isValidName(newValue));
    }
  }, [onChange, onValidChange, touched]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    if (onValidChange) {
      onValidChange(isValidName(value));
    }
  }, [onValidChange, value]);

  // Validar estilo
  const isValid = touched && isValidName(value);
  const isInvalid = touched && !isValidName(value) && value.length >= minLength;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        aria-invalid={isInvalid || !!error}
        {...props}
      />
      {touched && value.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
          {isValid ? (
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>Nome válido</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : isInvalid ? (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <title>Nome inválido - insira nome completo</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
});

NameInput.displayName = 'NameInput';
