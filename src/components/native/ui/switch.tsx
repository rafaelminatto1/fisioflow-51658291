/**
 * Switch - Native Component (React Native)
 *
 * Usa Switch nativo do React Native + NativeWind
 */

import * as React from 'react';
import { Switch as RNSwitch, View, ViewStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  testID?: string;
}

export const Switch = React.forwardRef<View, SwitchProps>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      className = '',
      style,
      testID,
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(checked);

    React.useEffect(() => {
      setInternalChecked(checked);
    }, [checked]);

    const handleChange = (value: boolean) => {
      setInternalChecked(value);
      onCheckedChange?.(value);
    };

    return (
      <View ref={ref} className={cn('', className)} style={style} testID={testID}>
        <RNSwitch
          value={internalChecked}
          onValueChange={handleChange}
          disabled={disabled}
          trackColor={{ false: '#cbd5e1', true: 'hsl(var(--primary))' }}
          thumbColor={internalChecked ? '#ffffff' : '#f1f5f9'}
          ios_backgroundColor="#cbd5e1"
        />
      </View>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;
