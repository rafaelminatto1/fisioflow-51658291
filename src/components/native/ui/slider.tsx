/**
 * Slider - Native Component (React Native)
 *
 * Usa Slider nativo do React Native + NativeWind
 */

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slider as RNSlider } from '@react-native-community/slider';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider = React.forwardRef<View, SliderProps>(
  (
    {
      value = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      className = '',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value[0]);

    React.useEffect(() => {
      setInternalValue(value[0]);
    }, [value]);

    const handleChange = (newValue: number) => {
      setInternalValue(newValue);
      onValueChange?.([newValue]);
    };

    return (
      <View ref={ref} className={cn('py-2', className)}>
        <RNSlider
          value={internalValue}
          onValueChange={handleChange}
          minimumValue={min}
          maximumValue={max}
          step={step}
          disabled={disabled}
          minimumTrackTintColor="hsl(var(--primary))"
          maximumTrackTintColor="hsl(var(--input))"
          thumbTintColor="hsl(var(--primary))"
          style={styles.slider}
        />
      </View>
    );
  }
);

Slider.displayName = 'Slider';

const styles = StyleSheet.create({
  slider: {
    width: '100%',
    height: 40,
  },
});

export default Slider;
