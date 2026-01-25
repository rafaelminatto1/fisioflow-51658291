/**
 * FisioFlow Design System - Checkbox Component
 *
 * Accessible checkbox component with custom styling
 * Supports indeterminate state and different sizes
 */

import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked?: boolean;
  /** Indeterminate state (for parent checkboxes) */
  indeterminate?: boolean;
  /** Disable the checkbox */
  disabled?: boolean;
  /** Checkbox size */
  size?: CheckboxSize;
  /** Label text */
  label?: string | ReactNode;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** onChange handler */
  onChange?: (checked: boolean) => void;
  /** Additional styles */
  style?: any;
  /** Test ID */
  testID?: string;
  /** Enable haptic feedback */
  haptic?: boolean;
}

const sizeConfig = {
  sm: { checkbox: 18, icon: 10, gap: 8 },
  md: { checkbox: 22, icon: 12, gap: 10 },
  lg: { checkbox: 26, icon: 14, gap: 12 },
};

/**
 * Checkbox Component
 */
export function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  size = 'md',
  label,
  labelPosition = 'right',
  onChange,
  style,
  testID,
  haptic = true,
}: CheckboxProps) {
  const theme = useTheme();
  const config = sizeConfig[size];
  const [internalChecked, setInternalChecked] = React.useState(checked);

  const isChecked = onChange ? checked : internalChecked;

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;

    if (haptic) {
      Haptics.selectionAsync();
    }

    const newChecked = !isChecked;
    if (onChange) {
      onChange(newChecked);
    } else {
      setInternalChecked(newChecked);
    }
  };

  const getBackgroundColor = () => {
    if (disabled) {
      return theme.colors.gray[200];
    }
    if (isChecked || indeterminate) {
      return theme.colors.primary[500];
    }
    return 'transparent';
  };

  const getBorderColor = () => {
    if (disabled) {
      return theme.colors.gray[300];
    }
    if (isChecked || indeterminate) {
      return theme.colors.primary[500];
    }
    return theme.colors.border;
  };

  const checkboxStyle = {
    width: config.checkbox,
    height: config.checkbox,
    borderRadius: 4,
    backgroundColor: getBackgroundColor(),
    borderWidth: 2,
    borderColor: getBorderColor(),
  };

  const iconSize = config.icon;

  const renderCheckbox = () => (
    <View
      testID={testID}
      style={[styles.checkbox, checkboxStyle]}
      onStartShouldSetResponder={() => !disabled}
      onResponderRelease={handlePress}
    >
      {(isChecked || indeterminate) && (
        <View style={styles.iconContainer}>
          {indeterminate ? (
            <View
              style={[
                styles.indeterminate,
                {
                  width: iconSize,
                  height: 2,
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          ) : (
            <View style={styles.checkIcon}>
              <View
                style={[
                  styles.checkLine1,
                  {
                    width: iconSize * 0.6,
                    height: 2,
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
              <View
                style={[
                  styles.checkLine2,
                  {
                    width: iconSize * 0.35,
                    height: 2,
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}
    </View>
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

    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        style={styles.labelTouchable}
      >
        {labelContent}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {labelPosition === 'left' ? (
        <>
          {renderLabel()}
          <View style={{ width: config.gap }} />
          {renderCheckbox()}
        </>
      ) : (
        <>
          {renderCheckbox()}
          <View style={{ width: config.gap }} />
          {renderLabel()}
        </>
      )}
    </View>
  );
}

/**
 * Checkbox Group
 * Manages a group of related checkboxes
 */
export interface CheckboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /** Available options */
  options: CheckboxOption[];
  /** Selected values */
  value: string[];
  /** onChange handler */
  onChange: (values: string[]) => void;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Checkbox size */
  size?: CheckboxSize;
  /** Enable haptic feedback */
  haptic?: boolean;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  orientation = 'vertical',
  size = 'md',
  haptic = true,
}: CheckboxGroupProps) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <View
      style={[
        styles.group,
        orientation === 'horizontal' && styles.groupHorizontal,
      ]}
    >
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={value.includes(option.value)}
          disabled={option.disabled}
          label={option.label}
          size={size}
          onChange={() => handleToggle(option.value)}
          haptic={haptic}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  checkIcon: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLine1: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    top: '45%',
    left: '20%',
  },
  checkLine2: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    top: '38%',
    left: '28%',
  },
  indeterminate: {
    borderRadius: 1,
  },
  label: {
    includeFontPadding: false,
  },
  labelTouchable: {
    flex: 1,
  },
  group: {
    gap: 12,
  },
  groupHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
