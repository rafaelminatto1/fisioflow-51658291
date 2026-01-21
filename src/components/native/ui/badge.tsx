/**
 * Badge - Native Component (React Native)
 *
 * Usa View + Text + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  style?: ViewStyle;
}

export const Badge = React.forwardRef<View, BadgeProps>(
  ({ children, className = '', variant = 'default', style }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        style={style}
      >
        <Text className={cn(
          'text-xs font-semibold',
          variant === 'outline' ? 'text-foreground' : 'text-inherit'
        )}>
          {children}
        </Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

export { badgeVariants };
export default Badge;
