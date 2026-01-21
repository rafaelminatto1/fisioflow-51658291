/**
 * Input - Native Component (React Native)
 *
 * Usa TextInput + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { TextInput, View, TextInputProps, TextStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  /** ClassName adicional */
  className?: string;
  /** TestID para testes */
  testID?: string;
  /** Style inline adicional */
  style?: TextStyle;
  /** Ref */
  ref?: React.Ref<TextInput>;
}

const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      className = '',
      placeholder,
      placeholderTextColor,
      secureTextEntry = false,
      editable = true,
      keyboardType = 'default',
      onChangeText,
      onFocus,
      onBlur,
      value,
      defaultValue,
      maxLength,
      autoFocus = false,
      testID,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <TextInput
        ref={ref}
        testID={testID}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || 'hsl(var(--muted-foreground))'}
        secureTextEntry={secureTextEntry}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={cn(
          // Base styles equivalentes ao web input
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
          // Focus styles (ativos automaticamente no React Native)
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          // Disabled styles
          'opacity-50',
          // Custom className
          className
        )}
        style={{
          // Ajustes específicos para React Native
          minHeight: 40,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
