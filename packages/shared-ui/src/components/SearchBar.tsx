/**
 * FisioFlow Design System - SearchBar Component
 *
 * Search input with icon and clear button
 * Supports different variants and sizes
 */

import React, { ReactNode, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

export type SearchBarSize = 'sm' | 'md' | 'lg';
export type SearchBarVariant = 'default' | 'pill' | 'underline';

export interface SearchBarProps {
  /** Search value */
  value: string;
  /** onChange handler */
  onChange: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Size */
  size?: SearchBarSize;
  /** Visual variant */
  variant?: SearchBarVariant;
  /** Show clear button */
  showClear?: boolean;
  /** Show search icon */
  showIcon?: boolean;
  /** Custom left icon */
  leftIcon?: ReactNode;
  /** Custom right icon */
  rightIcon?: ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Auto focus */
  autoFocus?: boolean;
  /** onClear handler */
  onClear?: () => void;
  /** onSubmit handler */
  onSubmit?: () => void;
  /** Ref */
  inputRef?: React.RefObject<TextInput>;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const sizeConfig = {
  sm: { height: 36, iconSize: 16, fontSize: 13, paddingHorizontal: 12 },
  md: { height: 40, iconSize: 18, fontSize: 15, paddingHorizontal: 14 },
  lg: { height: 48, iconSize: 20, fontSize: 16, paddingHorizontal: 16 },
};

/**
 * Search Icon Component
 */
function SearchIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={11} cy={11} r={8} />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

/**
 * Clear Icon Component
 */
function ClearIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

/**
 * SearchBar Component
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  size = 'md',
  variant = 'default',
  showClear = true,
  showIcon = true,
  leftIcon,
  rightIcon,
  disabled = false,
  autoFocus = false,
  onClear,
  onSubmit,
  inputRef,
  style,
  testID,
}: SearchBarProps) {
  const theme = useTheme();
  const internalRef = useRef<TextInput>(null);
  const ref = inputRef || internalRef;
  const [isFocused, setIsFocused] = useState(false);

  const config = sizeConfig[size];

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      height: config.height,
    };

    switch (variant) {
      case 'pill':
        return {
          ...baseStyle,
          backgroundColor: disabled
            ? theme.colors.gray[100]
            : theme.colors.gray[100],
          borderRadius: config.height / 2,
          paddingHorizontal: config.paddingHorizontal,
        };
      case 'underline':
        return {
          ...baseStyle,
          borderBottomWidth: 2,
          borderBottomColor: isFocused
            ? theme.colors.primary[500]
            : theme.colors.border,
          paddingHorizontal: 0,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: disabled
            ? theme.colors.gray[100]
            : theme.colors.background,
          borderWidth: 1,
          borderColor: isFocused
            ? theme.colors.primary[500]
            : theme.colors.border,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: config.paddingHorizontal,
        };
    }
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    ref.current?.focus();
  };

  const handleSubmit = () => {
    onSubmit?.();
  };

  const hasValue = value.length > 0;
  const showClearButton = showClear && hasValue;

  return (
    <View
      testID={testID}
      style={[styles.container, getContainerStyle(), style]}
    >
      {/* Left Icon */}
      {leftIcon || (showIcon && !leftIcon) ? (
        <View style={styles.leftIcon}>
          {leftIcon || (
            <SearchIcon size={config.iconSize} color={theme.colors.text.tertiary} />
          )}
        </View>
      ) : null}

      {/* Input */}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        autoFocus={autoFocus}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
        style={[
          styles.input,
          {
            fontSize: config.fontSize,
            color: theme.colors.text.primary,
            flex: 1,
          },
        ]}
      />

      {/* Clear Button */}
      {showClearButton && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ClearIcon size={config.iconSize} color={theme.colors.text.tertiary} />
        </TouchableOpacity>
      )}

      {/* Right Icon */}
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </View>
  );
}

/**
 * Search Input with Results Count
 */
export interface SearchWithResultsProps extends SearchBarProps {
  /** Results count */
  resultsCount?: number;
  /** Results label */
  resultsLabel?: string;
}

export function SearchWithResults({
  resultsCount,
  resultsLabel = 'resultados',
  ...props
}: SearchWithResultsProps) {
  const theme = useTheme();

  return (
    <View style={styles.searchWithResults}>
      <SearchBar {...props} />
      {typeof resultsCount === 'number' && (
        <Text style={[styles.resultsText, { color: theme.colors.text.tertiary }]}>
          {resultsCount} {resultsLabel}
        </Text>
      )}
    </View>
  );
}

/**
 * Filterable Search Bar
 * Has a filter button next to search
 */
export interface FilterableSearchBarProps extends SearchBarProps {
  /** Show filter button */
  showFilter?: boolean;
  /** Filter active */
  filterActive?: boolean;
  /** onFilter handler */
  onFilter?: () => void;
}

export function FilterableSearchBar({
  showFilter = true,
  filterActive = false,
  onFilter,
  ...props
}: FilterableSearchBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.filterableSearch}>
      <View style={styles.searchWithFilter}>
        <SearchBar {...props} />
        {showFilter && (
          <TouchableOpacity
            onPress={onFilter}
            style={[
              styles.filterButton,
              {
                backgroundColor: filterActive
                  ? theme.colors.primary[500]
                  : theme.colors.gray[200],
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FilterIcon
              size={20}
              color={filterActive ? '#FFFFFF' : theme.colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Filter Icon Component
 */
function FilterIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 0,
    includeFontPadding: false,
  },
  clearButton: {
    marginLeft: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  searchWithResults: {
    gap: 8,
  },
  resultsText: {
    fontSize: 13,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
  filterableSearch: {
    gap: 8,
  },
  searchWithFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Inline SVG component for React Native
const svg = { width: 0, height: 0 };
