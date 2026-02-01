/**
 * Select/Dropdown Component
 * Form select with options
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './Badge';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string | number;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  style?: any;
  containerStyle?: any;
}

export function Select({
  label,
  placeholder = 'Selecione...',
  value,
  options,
  onValueChange,
  disabled = false,
  error,
  required = false,
  style,
  containerStyle,
}: SelectProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onValueChange(option.value);
      setIsOpen(false);
    }
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.error : disabled ? colors.border : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedOption ? colors.text : colors.textSecondary },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>

        <View style={styles.triggerRight}>
          {selectedOption?.badge && (
            <Badge size="small" style={styles.badge}>
              {selectedOption.badge}
            </Badge>
          )}
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ScrollView style={styles.optionsList} nestedScrollEnabled>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    option.disabled && styles.optionDisabled,
                    option.value === value && styles.optionSelected,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelect(option)}
                  disabled={option.disabled}
                >
                  {option.icon && (
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={option.disabled ? colors.textMuted : colors.textSecondary}
                      style={styles.optionIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      { color: option.value === value ? colors.primary : colors.text },
                      option.disabled && { color: colors.textMuted },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.badge && (
                    <Badge size="small">{option.badge}</Badge>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  values: string[];
  options: SelectOption[];
  onValuesChange: (values: string[]) => void;
  disabled?: boolean;
  error?: string;
  max?: number;
  style?: any;
  containerStyle?: any;
}

export function MultiSelect({
  label,
  placeholder = 'Selecione...',
  values,
  options,
  onValuesChange,
  disabled = false,
  error,
  max,
  style,
  containerStyle,
}: MultiSelectProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (option: SelectOption) => {
    if (option.disabled) return;

    if (values.includes(option.value)) {
      onValuesChange(values.filter(v => v !== option.value));
    } else {
      if (max && values.length >= max) return;
      onValuesChange([...values, option.value]);
    }
  };

  const handleRemove = (value: string) => {
    onValuesChange(values.filter(v => v !== value));
  };

  const selectedOptions = options.filter(opt => values.includes(opt.value));

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
      )}

      {/* Selected items */}
      {selectedOptions.length > 0 && (
        <View style={styles.selectedItems}>
          {selectedOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.selectedChip, { backgroundColor: colors.primary + '20' }]}
              onPress={() => !disabled && handleRemove(option.value)}
            >
              <Text style={[styles.selectedChipText, { color: colors.primary }]}>
                {option.label}
              </Text>
              <Ionicons name="close-circle" size={16} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.error : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: colors.textSecondary }]}>
          {selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selecionados`}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ScrollView style={styles.optionsList} nestedScrollEnabled>
              {options.map((option) => {
                const isSelected = values.includes(option.value);
                const isDisabled = option.disabled || (max && values.length >= max && !isSelected);

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      isDisabled && styles.optionDisabled,
                      isSelected && styles.optionSelected,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleToggle(option)}
                    disabled={isDisabled}
                  >
                    <View style={styles.checkbox}>
                      {isSelected && (
                        <Ionicons name="checkbox" size={20} color={colors.primary} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        { color: isSelected ? colors.primary : colors.text },
                        isDisabled && { color: colors.textMuted },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
  triggerText: {
    fontSize: 14,
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: '50%',
  },
  optionsList: {
    padding: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionIcon: {
    marginRight: 4,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  checkbox: {
    width: 20,
    alignItems: 'center',
  },
  // MultiSelect
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  selectedChipText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  selectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
});
