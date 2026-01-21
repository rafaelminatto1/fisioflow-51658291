/**
 * Button - Native Component (React Native)
 *
 * Usa TouchableOpacity + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Variantes do Button usando CVA (compatível com NativeWind)
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-border bg-transparent',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'bg-transparent',
        link: 'underline',
        medical: 'bg-gradient-primary text-primary-foreground',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps {
  /** Conteúdo do botão */
  children: React.ReactNode;
  /** Variante visual */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'medical';
  /** Tamanho */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Desabilitado */
  disabled?: boolean;
  /** Quando pressionado */
  onPress?: () => void;
  /** Classname adicional */
  className?: string;
  /** TestID para testes */
  testID?: string;
  /** Loading state */
  loading?: boolean;
  /** Icon only (sem texto) */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Style inline adicional */
  style?: ViewStyle;
  /** Ref */
  ref?: React.Ref<TouchableOpacity>;
}

export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  ({
    children,
    variant = 'default',
    size = 'default',
    disabled = false,
    onPress,
    className = '',
    testID,
    loading = false,
    leftIcon,
    rightIcon,
    style,
    ...props
  },
  ref
) => {
    const variants = buttonVariants({ variant, size });

    return (
      <TouchableOpacity
        ref={ref}
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        className={cn(
          variants,
          disabled && 'opacity-50',
          className
        )}
        style={style}
        activeOpacity={0.7}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            className={variant === 'outline' || variant === 'ghost' || variant === 'link'
              ? 'text-foreground'
              : 'text-primary-foreground'
            }
          />
        ) : (
          <>
            {leftIcon && leftIcon}
            {typeof children === 'string' ? (
              <Text
                className={cn(
                  'text-sm font-medium',
                  variant === 'outline' || variant === 'ghost' || variant === 'link'
                    ? 'text-foreground'
                    : 'text-primary-foreground'
                )}
                style={{ textAlign: 'center' }}
              >
                {children}
              </Text>
            ) : (
              children
            )}
            {rightIcon && rightIcon}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
export default Button;
