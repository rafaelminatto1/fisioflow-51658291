/**
 * FisioFlow - Universal Pressable/Clickable Component
 * Wraps children to handle touch/click interactions
 */

import { Platform, Pressable, PressableProps } from 'react-native';
import { ReactNode, ReactElement } from 'react';

/**
 * PressableWrapper Props
 */
export interface PressableWrapperProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: any;
  pressableProps?: PressableProps;
}

/**
 * PressableWrapper - Universal touch/click wrapper
 * - Web: Adds onClick to children
 * - Native: Wraps in Pressable
 */
export function PressableWrapper({
  children,
  onPress,
  onLongPress,
  disabled = false,
  className,
  style,
  pressableProps = {},
}: PressableWrapperProps) {
  const child = React.Children.only(children) as ReactElement;

  if (Platform.OS === 'web') {
    // Web: Clone element with onClick
    return React.cloneElement(child, {
      ...child.props,
      onClick: disabled ? undefined : onPress,
      style: [child.props.style, style],
      className: [child.props.className, className].filter(Boolean).join(' '),
    });
  }

  // Native: Wrap in Pressable
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        child.props.style,
        pressed && !disabled && { opacity: 0.7 },
      ]}
      className={className}
      {...pressableProps}
    >
      {() => child}
    </Pressable>
  );
}

/**
 * Helper HOC for making any component pressable
 */
export function withPressable<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & PressableWrapperProps> {
  return function PressableComponent(props: P & PressableWrapperProps) {
    const { onPress, onLongPress, disabled, className, style, pressableProps, ...rest } = props;
    return (
      <PressableWrapper
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        className={className}
        style={style}
        pressableProps={pressableProps}
      >
        <Component {...(rest as P)} />
      </PressableWrapper>
    );
  };
}
