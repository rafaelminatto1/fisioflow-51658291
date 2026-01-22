/**
 * Checkbox - Native Component (React Native)
 *
 * Usa Pressable + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check } from '@/lib/icons';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  testID?: string;
}

export const Checkbox = React.forwardRef<View, CheckboxProps>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      className = '',
      label,
      testID,
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(checked);

    React.useEffect(() => {
      setInternalChecked(checked);
    }, [checked]);

    const handlePress = () => {
      if (disabled) return;
      const newValue = !internalChecked;
      setInternalChecked(newValue);
      onCheckedChange?.(newValue);
    };

    return (
      <Pressable
        ref={ref}
        testID={testID}
        onPress={handlePress}
        disabled={disabled}
        className={cn('flex flex-row items-center gap-2', className)}
      >
        <View
          className={cn(
            'h-4 w-4 rounded items-center justify-center border',
            internalChecked
              ? 'bg-primary border-primary'
              : 'border-input bg-background',
            disabled && 'opacity-50'
          )}
        >
          {internalChecked && (
            <Check className="h-3 w-3 text-primary-foreground" size={12} />
          )}
        </View>
        {label && (
          <Text
            className={cn(
              'text-sm text-foreground',
              disabled && 'text-muted-foreground'
            )}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
