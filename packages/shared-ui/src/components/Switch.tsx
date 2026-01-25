/**
 * FisioFlow Design System - Switch Component
 *
 * Toggle switch component with smooth animations
 * Supports different sizes and custom colors
 */

import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps {
  /** Whether the switch is on */
  value?: boolean;
  /** Disable the switch */
  disabled?: boolean;
  /** Switch size */
  size?: SwitchSize;
  /** Label text */
  label?: string | ReactNode;
  /** Helper text */
  helperText?: string;
  /** Label position */
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  /** onChange handler */
  onChange?: (value: boolean) => void;
  /** Additional styles */
  style?: any;
  /** Test ID */
  testID?: string;
  /** Enable haptic feedback */
  haptic?: boolean;
}

const sizeConfig = {
  sm: { width: 40, thumb: 18, padding: 2 },
  md: { width: 48, thumb: 22, padding: 2 },
  lg: { width: 56, thumb: 26, padding: 3 },
};

/**
 * Switch Component
 */
export function Switch({
  value = false,
  disabled = false,
  size = 'md',
  label,
  helperText,
  labelPosition = 'right',
  onChange,
  style,
  testID,
  haptic = true,
}: SwitchProps) {
  const theme = useTheme();
  const config = sizeConfig[size];
  const [internalValue, setInternalValue] = React.useState(value);
  const animValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  const isOn = onChange ? value : internalValue;

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: isOn ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOn, animValue]);

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;

    if (haptic) {
      Haptics.selectionAsync();
    }

    const newValue = !isOn;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const trackColor = isOn
    ? theme.colors.primary[500]
    : theme.colors.gray[300];

  const thumbTranslate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, config.width - config.thumb - config.padding * 2],
  });

  const renderSwitch = () => (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.switchContainer,
        {
          width: config.width,
          height: config.thumb + config.padding * 2,
          backgroundColor: trackColor,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: config.thumb,
            height: config.thumb,
            transform: [{ translateX: thumbTranslate }],
          },
        ]}
      />
    </TouchableOpacity>
  );

  const renderLabel = () => {
    if (!label) return null;

    const labelContent =
      typeof label === 'string' ? (
        <Text
          style={[
            styles.label,
            {
              color: disabled
                ? theme.colors.gray[500]
                : theme.colors.text.primary,
              fontSize: size === 'sm' ? 14 : size === 'lg' ? 16 : 15,
            },
          ]}
        >
          {label}
        </Text>
      ) : (
        label
      );

    return labelContent;
  };

  const renderHelperText = () => {
    if (!helperText) return null;
    return (
      <Text
        style={[
          styles.helperText,
          {
            color: theme.colors.text.tertiary,
            fontSize: 12,
          },
        ]}
      >
        {helperText}
      </Text>
    );
  };

  if (labelPosition === 'top' || labelPosition === 'bottom') {
    return (
      <View style={[styles.containerVertical, style]}>
        {labelPosition === 'top' && renderLabel()}
        <View style={styles.switchWithLabel}>
          {renderSwitch()}
          <View style={{ marginLeft: 12, flex: 1 }}>
            {labelPosition === 'bottom' && renderLabel()}
            {renderHelperText()}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {labelPosition === 'left' && renderLabel()}
      <View style={{ marginHorizontal: 12 }} />
      {renderSwitch()}
      {labelPosition === 'right' && <View style={{ marginLeft: 12, flex: 1 }} />}
      {labelPosition === 'right' && (
        <View style={{ flex: 1 }}>
          {renderLabel()}
          {renderHelperText()}
        </View>
      )}
    </View>
  );
}

/**
 * Switch Group
 * Manages a group of related switches
 */
export interface SwitchOption {
  value: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
}

export interface SwitchGroupProps {
  /** Available options */
  options: SwitchOption[];
  /** Selected value (single selection) */
  value: string | null;
  /** onChange handler */
  onChange: (value: string | null) => void;
  /** Switch size */
  size?: SwitchSize;
  /** Enable haptic feedback */
  haptic?: boolean;
}

export function SwitchGroup({
  options,
  value,
  onChange,
  size = 'md',
  haptic = true,
}: SwitchGroupProps) {
  const handleToggle = (optionValue: string) => {
    onChange(value === optionValue ? null : optionValue);
  };

  return (
    <View style={styles.group}>
      {options.map((option) => (
        <View key={option.value} style={styles.groupItem}>
          <Switch
            value={value === option.value}
            disabled={option.disabled}
            label={option.label}
            helperText={option.helperText}
            size={size}
            onChange={() => handleToggle(option.value)}
            haptic={haptic}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerVertical: {
    gap: 8,
  },
  switchContainer: {
    borderRadius: 999,
    justifyContent: 'center',
  },
  thumb: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    includeFontPadding: false,
  },
  helperText: {
    marginTop: 2,
    includeFontPadding: false,
  },
  group: {
    gap: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
