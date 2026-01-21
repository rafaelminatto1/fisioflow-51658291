/**
 * Textarea - Native Component (React Native)
 *
 * Usa TextInput multiline + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { TextInput, View, TextInputProps, TextStyle } from 'react-native';
import { cn } from '@/lib/utils';

export interface TextareaProps extends Omit<TextInputProps, 'style'> {
  className?: string;
  testID?: string;
  style?: TextStyle;
  ref?: React.Ref<TextInput>;
}

const Textarea = React.forwardRef<TextInput, TextareaProps>(
  (
    {
      className = '',
      placeholder,
      placeholderTextColor,
      editable = true,
      onChangeText,
      onFocus,
      onBlur,
      value,
      defaultValue,
      maxLength,
      autoFocus = false,
      numberOfLines = 4,
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
        editable={editable}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
        autoFocus={autoFocus}
        numberOfLines={numberOfLines}
        multiline
        textAlignVertical="top"
        className={cn(
          // Base styles equivalentes ao web textarea
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          className
        )}
        style={{
          minHeight: 80,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
