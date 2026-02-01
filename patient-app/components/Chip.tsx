/**
 * Chip Component
 * Interactive chips for filters, selections, etc.
 */

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';

export type ChipVariant = 'default' | 'outline' | 'flat';
export type ChipSize = 'small' | 'medium' | 'large';

interface ChipProps {
  label: string;
  selected?: boolean;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onRemove?: () => void;
  onPress?: () => void;
  style?: any;
}

const sizeStyles = {
  small: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, iconSize: 14 },
  medium: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, iconSize: 16 },
  large: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, iconSize: 18 },
};

export function Chip({
  label,
  selected = false,
  variant = 'outline',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  onRemove,
  onPress,
  style,
}: ChipProps) {
  const colors = useColors();
  const sizeStyle = sizeStyles[size];

  const getContainerStyle = () => {
    const base: any = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: sizeStyle.paddingHorizontal,
      paddingVertical: sizeStyle.paddingVertical,
      borderRadius: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
      gap: 6,
    };

    if (disabled) {
      base.backgroundColor = colors.surface;
      base.borderColor = colors.border;
      base.opacity = 0.5;
      return base;
    }

    switch (variant) {
      case 'default':
        if (selected) {
          base.backgroundColor = colors.primary;
          base.borderColor = colors.primary;
        } else {
          base.backgroundColor = colors.surface;
          base.borderColor = colors.border;
        }
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1;
        base.borderColor = selected ? colors.primary : colors.border;
        break;
      case 'flat':
        base.backgroundColor = selected ? colors.primary + '20' : colors.surface;
        base.borderWidth = 0;
        break;
    }

    return base;
  };

  const getLabelStyle = () => {
    const base: any = {
      fontSize: sizeStyle.fontSize,
      fontWeight: '500',
    };

    if (disabled) {
      base.color = colors.textMuted;
    } else if (selected && variant === 'outline') {
      base.color = colors.primary;
    } else if (selected && variant !== 'outline') {
      base.color = '#FFFFFF';
    } else {
      base.color = colors.text;
    }

    return base;
  };

  const getIconColor = () => {
    if (disabled) return colors.textMuted;
    if (selected && variant === 'outline') return colors.primary;
    if (selected && variant !== 'outline') return '#FFFFFF';
    return colors.textSecondary;
  };

  const containerStyle = getContainerStyle();
  const labelStyle = getLabelStyle();

  const content = (
    <>
      {icon && (
        <Ionicons name={icon} size={sizeStyle.iconSize} color={getIconColor()} />
      )}
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>
      {onRemove && !loading && (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Ionicons name="close-circle" size={sizeStyle.iconSize + 2} color={getIconColor()} />
        </TouchableOpacity>
      )}
      {loading && <ActivityIndicator size="small" color={getIconColor()} />}
    </>
  );

  if (onPress && !disabled && !loading) {
    return (
      <TouchableOpacity
        style={[containerStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{content}</View>;
}

/**
 * Chip Group for multiple selectable chips
 */
interface ChipGroupProps {
  options: Array<{ value: string; label: string; icon?: keyof typeof Ionicons.glyphMap }>;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  variant?: ChipVariant;
  size?: ChipSize;
  multiple?: boolean;
  style?: any;
}

export function ChipGroup({
  options,
  value,
  onChange,
  variant = 'outline',
  size = 'medium',
  multiple = false,
  style,
}: ChipGroupProps) {
  const isSelected = (optionValue: string) => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handlePress = (optionValue: string) => {
    if (!onChange) return;

    if (multiple && Array.isArray(value)) {
      if (value.includes(optionValue)) {
        onChange(value.filter(v => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    } else {
      onChange(optionValue);
    }
  };

  return (
    <View style={[styles.chipGroup, style]}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          icon={option.icon}
          selected={isSelected(option.value)}
          variant={variant}
          size={size}
          onPress={() => handlePress(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
