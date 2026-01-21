/**
 * Button - Componente Cross-Platform
 *
 * Web: Usa shadcn/ui Button (@radix-ui)
 * Native: Usa react-native-reusables Button (NativeWind)
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';
import type { ButtonProps as WebButtonProps } from '@/components/web/ui/button';
import type { ButtonProps as NativeButtonProps } from '@/components/native/ui/button';

// Import web component (lazy para não quebrar build native)
const WebButton = React.lazy(() =>
  import('@/components/web/ui/button').then(m => ({ default: m.Button }))
);

// Import native component
const NativeButton = React.lazy(() =>
  import('@/components/native/ui/button').then(m => ({ default: m.Button }))
);

/**
 * Props compartilhadas entre web e native
 */
export interface SharedButtonProps {
  /** Conteúdo do botão */
  children: React.ReactNode;
  /** Variante visual */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'medical';
  /** Tamanho */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Desabilitado */
  disabled?: boolean;
  /** onClick handler */
  onPress?: () => void;
  onClick?: () => void;
  /** ClassName adicional */
  className?: string;
  /** ID para acessibilidade */
  id?: string;
  /** TestID para testes */
  testID?: string;
}

/**
 * Componente Button que funciona tanto em web quanto em mobile
 *
 * @example
 * ```tsx
 * <Button variant="default" onPress={() => console.log('clicked')}>
 *   Clique aqui
 * </Button>
 * ```
 */
export const Button = React.forwardRef<any, SharedButtonProps>(
  ({ children, variant = 'default', size = 'default', disabled, onPress, onClick, className, id, testID, ...props }, ref) => {
    const { isWeb } = usePlatform();

    // Normalizar props para cada plataforma
    const platformProps = {
      variant,
      size,
      disabled,
      className,
      id,
      ...(isWeb
        ? { onClick: onPress || onClick, children, ref }
        : { onPress: onPress || onClick, testID, children, ref }
      ),
      ...props,
    } as WebButtonProps & NativeButtonProps;

    return (
      <React.Suspense fallback={<ButtonFallback {...platformProps} />}>
        {isWeb ? (
          <WebButton {...platformProps} />
        ) : (
          <NativeButton {...platformProps} />
        )}
      </React.Suspense>
    );
  }
);

Button.displayName = 'Button';

/**
 * Fallback simples enquanto carrega o componente
 */
const ButtonFallback: React.FC<SharedButtonProps> = ({ children, disabled, className }) => {
  return (
    <button
      disabled={disabled}
      className={className}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        background: disabled ? '#ccc' : '#0ea5e9',
        color: 'white',
        border: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
};

export default Button;
