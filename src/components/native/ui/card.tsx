/**
 * Card - Native Component (React Native)
 *
 * Usa View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Text, ScrollView, ViewStyle } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const Card = React.forwardRef<View, CardProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card text-card-foreground',
          className
        )}
        style={style}
      >
        {children}
      </View>
    );
  }
);
Card.displayName = 'Card';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const CardHeader = React.forwardRef<View, CardHeaderProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        style={style}
      >
        {children}
      </View>
    );
  }
);
CardHeader.displayName = 'CardHeader';

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const CardTitle = React.forwardRef<Text, CardTitleProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight text-card-foreground',
          className
        )}
        style={style}
      >
        {children}
      </Text>
    );
  }
);
CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const CardDescription = React.forwardRef<Text, CardDescriptionProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        style={style}
      >
        {children}
      </Text>
    );
  }
);
CardDescription.displayName = 'CardDescription';

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const CardContent = React.forwardRef<View, CardContentProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('p-6 pt-0', className)}
        style={style}
      >
        {children}
      </View>
    );
  }
);
CardContent.displayName = 'CardContent';

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

const CardFooter = React.forwardRef<View, CardFooterProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('flex flex-row items-center p-6 pt-0', className)}
        style={style}
      >
        {children}
      </View>
    );
  }
);
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};

export default Card;
