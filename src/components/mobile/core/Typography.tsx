/**
 * FisioFlow - Universal Typography Component
 * Works on Web and React Native with consistent styling
 */

import { Platform, Text, TextInput, TextInputProps } from 'react-native';
import { HTMLAttributes, ReactNode } from 'react';

/**
 * Typography Props
 */
export interface TypographyProps {
  children?: ReactNode;
  className?: string;
  style?: any;
  testID?: string;
  numberOfLines?: number;
  onPress?: () => void;
}

/**
 * Text Variant Types
 */
type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'small' | 'tiny' | 'label';
type Color = 'default' | 'muted' | 'primary' | 'secondary' | 'accent' | 'destructive' | 'success';

const variantStyles: Record<Variant, string> = {
  h1: 'text-4xl font-bold text-foreground',
  h2: 'text-3xl font-semibold text-foreground',
  h3: 'text-2xl font-semibold text-foreground',
  h4: 'text-xl font-medium text-foreground',
  p: 'text-base text-foreground',
  small: 'text-sm text-foreground',
  tiny: 'text-xs text-muted-foreground',
  label: 'text-sm font-medium text-foreground',
};

const colorStyles: Record<Color, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  accent: 'text-accent-foreground',
  destructive: 'text-destructive',
  success: 'text-success',
};

/**
 * Typography Component - Universal text component
 */
export function Typography({
  children,
  className = '',
  style,
  testID,
  numberOfLines,
  onPress,
}: TypographyProps) {
  const props = {
    className,
    style,
    testID: testID,
    numberOfLines,
    ...(onPress && Platform.OS === 'web' ? { onClick: onPress } : {}),
    ...(onPress && Platform.OS !== 'web' ? { onPress } : {}),
  };

  if (Platform.OS === 'web') {
    const Span = 'span' as any;
    return <Span {...props}>{children}</Span>;
  }

  return <Text {...props}>{children}</Text>;
}

/**
 * Text Variants
 */
export function H1({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.h1} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function H2({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.h2} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function H3({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.h3} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function H4({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.h4} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function P({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.p} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function Small({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.small} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function Tiny({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.tiny} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

export function Label({ children, className = '', ...props }: Omit<TypographyProps, 'className'> & { className?: string }) {
  return (
    <Typography className={`${variantStyles.label} ${className}`} {...props}>
      {children}
    </Typography>
  );
}

/**
 * Heading Component with Color Support
 */
export function Heading({
  children,
  variant = 'h2',
  color = 'default',
  className = '',
  ...props
}: Omit<TypographyProps, 'className'> & { className?: string; variant?: Variant; color?: Color }) {
  const combinedClassName = `${variantStyles[variant]} ${colorStyles[color]} ${className}`;
  return <Typography className={combinedClassName} {...props}>{children}</Typography>;
}
