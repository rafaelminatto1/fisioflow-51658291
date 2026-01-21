/**
 * Collapsible - Native Component (React Native)
 *
 * Usa Animated + View + NativeWind para animação de collapse/expand
 */

import * as React from 'react';
import { View, Animated } from 'react-native';
import { cn } from '@/lib/utils';

export interface CollapsibleProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible = React.forwardRef<View, CollapsibleProps>(
  ({ open, children, className = '' }, ref) => {
    const [height] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
      Animated.timing(height, {
        toValue: open ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [open, height]);

    return (
      <Animated.View
        ref={ref}
        className={cn('', className)}
        style={{
          height: height.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1000], // Max height arbitrário
          }),
          overflow: 'hidden',
        }}
      >
        {children}
      </Animated.View>
    );
  }
);

Collapsible.displayName = 'Collapsible';

export const CollapsibleTrigger = View;
export const CollapsibleContent = View;

export default Collapsible;
