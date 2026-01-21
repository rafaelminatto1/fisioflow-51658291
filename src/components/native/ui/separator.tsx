/**
 * Separator - Native Component (React Native)
 *
 * Usa View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, ViewStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
  style?: ViewStyle;
}

export const Separator = React.forwardRef<View, SeparatorProps>(
  (
    {
      className = '',
      orientation = 'horizontal',
      decorative = true,
      style,
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        accessibilityRole={decorative ? 'none' : 'separator'}
        accessibilityState={{ selected: false }}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal'
            ? 'h-[1px] w-full'
            : 'h-full w-[1px]',
          className
        )}
        style={style}
      />
    );
  }
);

Separator.displayName = 'Separator';

export default Separator;
