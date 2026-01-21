/**
 * Text - Componente Cross-Platform
 *
 * Web: Usa span/div/p com Tailwind
 * Native: Usa Text do React Native + NativeWind
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

/**
 * Variantes de tipografia
 */
type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'small' | 'lead' | 'muted' | 'label';

/**
 * Props do Text component
 */
export interface TextProps {
  children: React.ReactNode;
  /** Variante de tipografia */
  variant?: TextVariant;
  /** Tamanho do texto */
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Peso da fonte */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Alinhamento */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Cor */
  color?: string;
  /** ClassName adicional */
  className?: string;
  /** Número de linhas (native) */
  numberOfLines?: number;
  /** TestID */
  testID?: string;
  /** ID */
  id?: string;
  /** Click handler */
  onPress?: () => void;
  onClick?: () => void;
}

/**
 * Mapeamento de variantes para classes/estilos
 */
const variantStyles: Record<TextVariant, { base: string; native?: string }> = {
  h1: { base: 'text-4xl font-bold tracking-tight', native: 'text-4xl font-bold' },
  h2: { base: 'text-3xl font-semibold tracking-tight', native: 'text-3xl font-semibold' },
  h3: { base: 'text-2xl font-semibold tracking-tight', native: 'text-2xl font-semibold' },
  h4: { base: 'text-xl font-semibold tracking-tight', native: 'text-xl font-semibold' },
  p: { base: 'text-base leading-7', native: 'text-base' },
  span: { base: 'text-base', native: 'text-base' },
  small: { base: 'text-sm', native: 'text-sm' },
  lead: { base: 'text-lg text-muted-foreground', native: 'text-lg text-muted-foreground' },
  muted: { base: 'text-sm text-muted-foreground', native: 'text-sm text-muted-foreground' },
  label: { base: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', native: 'text-sm font-medium' },
};

/**
 * Mapeamento de tamanhos */
const sizeStyles: Record<NonNullable<TextProps['size']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

/**
 * Mapeamento de pesos */
const weightStyles: Record<NonNullable<TextProps['weight']>, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

/**
 * Componente Text cross-platform
 *
 * @example
 * ```tsx
 * <Text variant="h1">Título Principal</Text>
 * <Text variant="p">Parágrafo de texto</Text>
 * <Text variant="muted">Texto secundário</Text>
 * ```
 */
export const Text = React.forwardRef<any, TextProps>(
  (
    {
      children,
      variant = 'span',
      size,
      weight = 'normal',
      align = 'left',
      color,
      className = '',
      numberOfLines,
      testID,
      id,
      onPress,
      onClick,
    },
    ref
  ) => {
    const { isWeb } = usePlatform();

    // Calcular classes baseadas nas props
    const variantClass = variantStyles[variant].base;
    const sizeClass = size ? sizeStyles[size] : '';
    const weightClass = weightStyles[weight];
    const alignClass = `text-${align}`;

    const combinedClassName = [variantClass, sizeClass, weightClass, alignClass, className]
      .filter(Boolean)
      .join(' ');

    const handleClick = onPress || onClick;

    if (isWeb) {
      // Web: usar HTML elements apropriados
      const Tag = variant === 'h1' ? 'h1' :
                   variant === 'h2' ? 'h2' :
                   variant === 'h3' ? 'h3' :
                   variant === 'h4' ? 'h4' :
                   variant === 'p' ? 'p' :
                   variant === 'small' ? 'small' :
                   variant === 'label' ? 'label' :
                   'span';

      return (
        <Tag
          ref={ref}
          id={id}
          className={combinedClassName}
          style={{ color }}
          onClick={handleClick}
        >
          {children}
        </Tag>
      );
    }

    // Native: usar Text do React Native com NativeWind
    return (
      <span
        ref={ref}
        testID={testID}
        className={combinedClassName}
        style={{ color }}
        numberOfLines={numberOfLines}
        onClick={handleClick}
      >
        {children}
      </span>
    );
  }
);

Text.displayName = 'Text';

/**
 * Atalhos para variantes comuns
 */
export const H1 = (props: Omit<TextProps, 'variant'>) => <Text variant="h1" {...props} />;
export const H2 = (props: Omit<TextProps, 'variant'>) => <Text variant="h2" {...props} />;
export const H3 = (props: Omit<TextProps, 'variant'>) => <Text variant="h3" {...props} />;
export const H4 = (props: Omit<TextProps, 'variant'>) => <Text variant="h4" {...props} />;
export const P = (props: Omit<TextProps, 'variant'>) => <Text variant="p" {...props} />;
export const Label = (props: Omit<TextProps, 'variant'>) => <Text variant="label" {...props} />;
export const Muted = (props: Omit<TextProps, 'variant'>) => <Text variant="muted" {...props} />;
export const Lead = (props: Omit<TextProps, 'variant'>) => <Text variant="lead" {...props} />;

export default Text;
