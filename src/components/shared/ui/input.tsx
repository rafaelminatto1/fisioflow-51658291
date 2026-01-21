/**
 * Input - Componente Cross-Platform
 *
 * Web: Usa shadcn/ui Input (HTML input + Tailwind)
 * Native: Usa react-native-reusables Input (TextInput + NativeWind)
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

// Import web component
const WebInput = React.lazy(() =>
  import('@/components/web/ui/input').then(m => ({ default: m.Input }))
);

// Import native component
const NativeInput = React.lazy(() =>
  import('@/components/native/ui/input').then(m => ({ default: m.Input }))
);

/**
 * Props compartilhadas entre web e native
 */
export interface SharedInputProps {
  /** Valor do input */
  value?: string;
  /** Placeholder */
  placeholder?: string;
  /** Tipo do input */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Desabilitado */
  disabled?: boolean;
  /** Readonly */
  readOnly?: boolean;
  /** Quando o valor muda */
  onChangeText?: (text: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** onFocus */
  onFocus?: () => void;
  /** onBlur */
  onBlur?: () => void;
  /** ClassName adicional */
  className?: string;
  /** ID */
  id?: string;
  /** TestID para testes */
  testID?: string;
  /** Ref */
  ref?: React.Ref<any>;
  /** AutoFocus */
  autoFocus?: boolean;
  /** Max length */
  maxLength?: number;
  /** Keyboard type (native) */
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
}

/**
 * Componente Input que funciona tanto em web quanto em mobile
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="Digite seu email"
 *   value={email}
 *   onChangeText={setEmail}
 *   keyboardType="email-address"
 * />
 * ```
 */
export const Input = React.forwardRef<any, SharedInputProps>(
  (
    {
      value,
      placeholder,
      type = 'text',
      disabled,
      readOnly,
      onChangeText,
      onChange,
      onFocus,
      onBlur,
      className,
      id,
      testID,
      autoFocus,
      maxLength,
      keyboardType,
    },
    ref
  ) => {
    const { isWeb } = usePlatform();

    // Mapear keyboard type para HTML input type
    const htmlType = keyboardType === 'email-address' ? 'email' :
                      keyboardType === 'numeric' ? 'number' :
                      keyboardType === 'phone-pad' ? 'tel' :
                      keyboardType === 'url' ? 'url' :
                      type;

    // Normalizar props para cada plataforma
    const platformProps = {
      value,
      placeholder,
      disabled,
      className,
      id,
      autoFocus,
      maxLength,
      ref,
      ...(isWeb
        ? {
            type: htmlType,
            onChange,
            onFocus,
            onBlur,
            readOnly,
          }
        : {
            secureTextEntry: type === 'password',
            onChangeText,
            onFocus,
            onBlur,
            editable: !readOnly,
            keyboardType,
            testID,
          }
      ),
    };

    return (
      <React.Suspense fallback={<InputFallback {...platformProps} />}>
        {isWeb ? <WebInput {...platformProps} /> : <NativeInput {...platformProps} />}
      </React.Suspense>
    );
  }
);

Input.displayName = 'Input';

/**
 * Fallback simples enquanto carrega o componente
 */
const InputFallback: React.FC<SharedInputProps> = ({
  value,
  placeholder,
  disabled,
  className,
  autoFocus,
  maxLength,
}) => {
  return (
    <input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      maxLength={maxLength}
      className={className}
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: disabled ? '#f1f5f9' : 'white',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
};

export default Input;
