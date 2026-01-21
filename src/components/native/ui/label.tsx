/**
 * Label - Native Component (React Native)
 *
 * Usa Text + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { Text, TextStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface LabelProps {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  nativeID?: string;
  style?: TextStyle;
}

export const Label = React.forwardRef<Text, LabelProps>(
  ({ children, className = '', nativeID, style }, ref) => {
    return (
      <Text
        ref={ref}
        nativeID={nativeID}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          'text-foreground',
          className
        )}
        style={style}
      >
        {children}
      </Text>
    );
  }
);

Label.displayName = 'Label';

export default Label;
