/**
 * Alert - Native Component (React Native)
 *
 * Usa View + Text + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, CheckCircle, XCircle } from '@/lib/icons';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive bg-destructive/10',
        success: 'border-success/50 text-success bg-success/10',
        warning: 'border-warning/50 text-warning bg-warning/10',
        info: 'border-info/50 text-info bg-info/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AlertProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title?: string;
  icon?: boolean;
}

const icons = {
  destructive: AlertTriangle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
};

export const Alert = React.forwardRef<View, AlertProps>(
  ({
    children,
    className = '',
    variant = 'default',
    title,
    icon = true,
  },
  ref
) => {
    const Icon = icons[variant];

    return (
      <View
        ref={ref}
        className={cn(alertVariants({ variant }), className)}
      >
        <View className="flex flex-row gap-3">
          {icon && Icon && (
            <Icon className="h-5 w-5" size={20} />
          )}
          <View className="flex-1">
            {title && (
              <Text className="mb-1 font-semibold text-foreground">
                {title}
              </Text>
            )}
            <Text className="text-sm text-foreground">{children}</Text>
          </View>
        </View>
      </View>
    );
  }
);

Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  Text,
  { children: React.ReactNode; className?: string }
>(({ children, className = '' }, ref) => {
  return (
    <Text
      ref={ref}
      className={cn('mb-1 font-semibold text-foreground', className)}
    >
      {children}
    </Text>
  );
});

AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  Text,
  { children: React.ReactNode; className?: string }
>(({ children, className = '' }, ref) => {
  return (
    <Text ref={ref} className={cn('text-sm text-foreground', className)}>
      {children}
    </Text>
  );
});

AlertDescription.displayName = 'AlertDescription';

export default Alert;
