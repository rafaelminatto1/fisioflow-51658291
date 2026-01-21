/**
 * FisioFlow - Universal Box Component
 * Works as div on Web and View on React Native
 */

import { Platform, View, ViewProps } from 'react-native';
import { HTMLAttributes, ReactNode } from 'react';

/**
 * Box Props - Universal props that work on both platforms
 */
export interface BoxProps {
  children?: ReactNode;
  className?: string;
  style?: any;
  testID?: string;
  onClick?: () => void;
}

/**
 * Box Component - Universal container
 * - Web: renders <div> with className
 * - Native: renders <View> with className (NativeWind)
 */
export function Box({ children, className, style, testID, onClick }: BoxProps) {
  const props = {
    className,
    style,
    testID: testID,
    ...(onClick && Platform.OS === 'web' ? { onClick } : {}),
    ...(onClick && Platform.OS !== 'web' ? { onClick } : {}),
  };

  if (Platform.OS === 'web') {
    // Web: Render div element
    const Div = 'div' as any;
    return <Div {...props}>{children}</Div>;
  }

  // Native: Render View
  return <View {...props}>{children}</View>;
}

/**
 * Common layout variants using Box
 */
export function Row({ children, className, style }: Omit<BoxProps, 'onClick'>) {
  return (
    <Box className={`flex flex-row ${className || ''}`} style={style}>
      {children}
    </Box>
  );
}

export function Column({ children, className, style }: Omit<BoxProps, 'onClick'>) {
  return (
    <Box className={`flex flex-col ${className || ''}`} style={style}>
      {children}
    </Box>
  );
}

export function Center({ children, className, style }: Omit<BoxProps, 'onClick'>) {
  return (
    <Box className={`flex items-center justify-center ${className || ''}`} style={style}>
      {children}
    </Box>
  );
}

export function Spacer({ className, style }: Pick<BoxProps, 'className' | 'style'>) {
  return <Box className={`flex-1 ${className || ''}`} style={style} />;
}
