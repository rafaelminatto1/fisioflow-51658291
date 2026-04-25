/**
 * Input de telefone com máscara automática e validação
 *
 * Formata automaticamente: (00) 00000-0000 ou (00) 0000-0000
 * Valida telefone brasileiro em tempo real
 */

import { forwardRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { isValidPhone, stripNonDigits } from "@/utils/validators";
import { formatPhoneInput } from "@/utils/formatInputs";

export interface PhoneInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  showIcon?: boolean;
  placeholder?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = "",
      onChange,
      onValidChange,
      error,
      showIcon = true,
      placeholder = "(00) 00000-0000",
      className,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(() => formatPhoneInput(value));

    useEffect(() => {
      setInternalValue(formatPhoneInput(value));
    }, [value]);

    // Atualizar valor
    const updateValue = useCallback(
      (newValue: string) => {
        const formatted = formatPhoneInput(newValue);
        setInternalValue(formatted);

        if (onChange) {
          onChange(formatted);
        }

        // Validar
        const digitsCount = stripNonDigits(formatted).length;
        if (onValidChange) {
          onValidChange((digitsCount === 10 || digitsCount === 11) && isValidPhone(formatted));
        }
      },
      [onChange, onValidChange],
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateValue(e.target.value);
      },
      [updateValue],
    );

    // Validar estilo
    const digitsCount = stripNonDigits(internalValue).length;
    const hasCompletePhone = digitsCount === 10 || digitsCount === 11;
    const isValid = hasCompletePhone && isValidPhone(internalValue);
    const isInvalid = hasCompletePhone && !isValid;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          formatPhone={false}
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={19} // +55 (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
          className={className}
          aria-invalid={isInvalid || !!error}
          {...props}
        />
        {showIcon && internalValue.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
            {isValid ? (
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Telefone válido</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : isInvalid ? (
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>Telefone inválido</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : null}
          </div>
        )}
      </div>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
