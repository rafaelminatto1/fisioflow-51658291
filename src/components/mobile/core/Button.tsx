/**
 * FisioFlow - Universal Button Component
 * Works on Web and React Native with consistent styling
 */

import { Platform, Pressable, PressableProps, View } from 'react-native';
import { ReactNode } from 'react';
import { Typography } from './Typography';

/**
 * Button Props
 */
export interface ButtonProps {
  children?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'success' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  style?: any;
  testID?: string;
}

/**
 * Button Variant Styles
 */
const variantStyles: Record<Exclude<ButtonProps['variant'], undefined>, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:opacity-90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:opacity-90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
  success: 'bg-success text-success-foreground hover:bg-success/90 active:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:opacity-90',
};

/**
 * Button Size Styles
 */
const sizeStyles: Record<Exclude<ButtonProps['size'], undefined>, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

/**
 * Button Component - Universal button
 */
export function Button({
  children,
  onPress,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
  style,
  testID,
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const combinedClasses = `${baseClasses} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`.trim();

  const content = (
    <Typography className="text-center font-medium" style={{ color: 'inherit' }}>
      {children}
    </Typography>
  );

  if (Platform.OS === 'web') {
    // Web: Use button element
    const buttonProps: any = {
      className: combinedClasses,
      style,
      testID,
      disabled,
      ...(onPress && { onClick: onPress }),
    };

    const Button = 'button' as any;
    return <Button {...buttonProps}>{content}</Button>;
  }

  // Native: Use Pressable
  const pressableProps: PressableProps = {
    onPress,
    disabled,
    style: [style],
    testID,
    className: combinedClasses,
  };

  return (
    <Pressable {...pressableProps}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {content}
      </View>
    </Pressable>
  );
}

/**
 * IconButton - For icon-only buttons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  label?: string; // Accessibility label
}

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <Button {...props} size="icon" className={props.className}>
      {icon}
    </Button>
  );
}
