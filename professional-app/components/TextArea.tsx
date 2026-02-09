import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  style?: any;
}

export function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  maxLength,
  numberOfLines = 4,
  style,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          maxLength={maxLength}
          numberOfLines={numberOfLines}
          multiline
          textAlignVertical="top"
        />
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
      {maxLength && (
        <Text style={[styles.charCount, { color: colors.textMuted }]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});
