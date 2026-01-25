/**
 * FisioFlow Design System - Input Component
 *
 * Accessible input component with validation states
 * Supports icons, error messages, and multiline
 */

import React, { ReactNode, RefObject, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  ReturnKeyTypeOptions,
} from 'react-native';
import { useTheme } from '../theme';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'success' | 'disabled';

export interface InputProps {
  /** Input value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message (switches state to error) */
  error?: string;
  /** Success message (switches state to success) */
  success?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Input size */
  size?: InputSize;
  /** Icon to display on the left */
  leftIcon?: ReactNode;
  /** Icon to display on the right */
  rightIcon?: ReactNode;
  /** Multiline input */
  multiline?: boolean;
  /** Number of lines for multiline */
  numberOfLines?: number;
  /** Keyboard type */
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad' | 'url';
  /** Secure text entry (password) */
  secureTextEntry?: boolean;
  /** Auto capitalize */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Return key type */
  returnKeyType?: ReturnKeyTypeOptions;
  /** Maximum length */
  maxLength?: number;
  /** onChange handler */
  onChangeText?: (text: string) => void;
  /** onFocus handler */
  onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  /** onBlur handler */
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  /** onSubmitEditing handler */
  onSubmitEditing?: () => void;
  /** ref */
  ref?: RefObject<TextInput>;
  /** Additional styles */
  style?: any;
  /** Test ID */
  testID?: string;
}

const sizeConfig = {
  sm: {
    height: 36,
    paddingHorizontal: 12,
    fontSize: 12,
    iconSize: 16,
  },
  md: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    iconSize: 18,
  },
  lg: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    iconSize: 20,
  },
};

/**
 * Input Component
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      value,
      placeholder,
      label,
      helperText,
      error,
      success,
      disabled = false,
      size = 'md',
      leftIcon,
      rightIcon,
      multiline = false,
      numberOfLines = 1,
      keyboardType = 'default',
      secureTextEntry = false,
      autoCapitalize = 'none',
      returnKeyType = 'done',
      maxLength,
      onChangeText,
      onFocus,
      onBlur,
      onSubmitEditing,
      style,
      testID,
    },
    ref
  ) => {
    const theme = useTheme();
    const config = sizeConfig[size];

    // Determine state
    let state: InputState = 'default';
    if (disabled) state = 'disabled';
    else if (error) state = 'error';
    else if (success) state = 'success';

    // Get border color based on state
    const getBorderColor = () => {
      switch (state) {
        case 'error':
          return theme.colors.danger[500];
        case 'success':
          return theme.colors.success[500];
        case 'disabled':
          return theme.colors.gray[300];
        default:
          return theme.colors.border;
      }
    };

    // Get background color based on state
    const getBackgroundColor = () => {
      if (disabled) {
        return theme.colors.gray[100];
      }
      return theme.isDark ? theme.colors.secondary[500] : theme.colors.background;
    };

    // Get text color based on state
    const getTextColor = () => {
      if (disabled) {
        return theme.colors.gray[500];
      }
      return theme.colors.text.primary;
    };

    // Get message text and color
    const getMessage = () => {
      if (error) return { text: error, color: theme.colors.danger[500] };
      if (success) return { text: success, color: theme.colors.success[500] };
      if (helperText) return { text: helperText, color: theme.colors.text.tertiary };
      return null;
    };

    const message = getMessage();

    const inputStyle = {
      ...styles.input,
      height: multiline ? undefined : config.height,
      minHeight: multiline ? config.height : undefined,
      paddingHorizontal: leftIcon || rightIcon ? config.paddingHorizontal + 28 : config.paddingHorizontal,
      fontSize: config.fontSize,
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      color: getTextColor(),
    };

    return (
      <View style={style}>
        {label && (
          <Text style={[styles.label, { color: theme.colors.text.secondary, fontSize: 14 }]}>
            {label}
          </Text>
        )}
        <View style={styles.inputContainer}>
          {leftIcon && (
            <View style={[styles.iconContainer, styles.leftIcon]}>
              {leftIcon}
            </View>
          )}
          <TextInput
            testID={testID}
            ref={ref}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.tertiary}
            style={[inputStyle, multiline && styles.multiline]}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            returnKeyType={returnKeyType}
            maxLength={maxLength}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            onSubmitEditing={onSubmitEditing}
            editable={!disabled}
            selectionColor={theme.colors.primary[500]}
          />
          {rightIcon && (
            <View style={[styles.iconContainer, styles.rightIcon]}>
              {rightIcon}
            </View>
          )}
        </View>
        {message && (
          <Text style={[styles.helperText, { color: message.color, fontSize: 12 }]}>
            {message.text}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    width: '100%',
    includeFontPadding: false,
  },
  multiline: {
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 80,
  },
  iconContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -10,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    left: 12,
  },
  rightIcon: {
    right: 12,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 6,
  },
});
