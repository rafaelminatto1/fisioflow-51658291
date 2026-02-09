import React, { useState } from 'react';

import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';

type MaskType = 'phone' | 'cpf' | 'cep' | 'date';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  mask?: MaskType;
}

/**
 * Apply mask to input value
 */
function applyMask(value: string, mask: MaskType): string {
  const cleanValue = value.replace(/\D/g, '');

  switch (mask) {
    case 'phone':
      if (cleanValue.length <= 2) {
        return cleanValue;
      } else if (cleanValue.length <= 7) {
        return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
      } else {
        return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
      }

    case 'cpf':
      if (cleanValue.length <= 3) {
        return cleanValue;
      } else if (cleanValue.length <= 6) {
        return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
      } else if (cleanValue.length <= 9) {
        return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
      } else {
        return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9, 11)}`;
      }

    case 'cep':
      if (cleanValue.length <= 5) {
        return cleanValue;
      } else {
        return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 8)}`;
      }

    case 'date':
      if (cleanValue.length <= 2) {
        return cleanValue;
      } else if (cleanValue.length <= 4) {
        return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`;
      } else {
        return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}/${cleanValue.slice(4, 8)}`;
      }

    default:
      return value;
  }
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  mask,
  onChangeText,
  ...props
}: InputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maskedValue, setMaskedValue] = useState('');

  const isPassword = secureTextEntry;
  const actualSecureTextEntry = isPassword && !showPassword;

  const handleChangeText = (text: string) => {
    let newValue = text;

    if (mask) {
      newValue = applyMask(text, mask);
      setMaskedValue(newValue);
    }

    if (onChangeText) {
      // Pass both masked and unmasked values
      const cleanValue = mask ? text.replace(/\D/g, '') : text;
      onChangeText(newValue, cleanValue);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.error
              : isFocused
              ? colors.primary
              : colors.border,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              paddingLeft: leftIcon ? 0 : 16,
              paddingRight: rightIcon || isPassword ? 0 : 16,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={actualSecureTextEntry}
          value={mask ? maskedValue : undefined}
          onChangeText={handleChangeText}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
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
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  leftIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  rightIcon: {
    paddingHorizontal: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
