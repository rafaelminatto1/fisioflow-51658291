/**
 * Select - Native Component (React Native)
 *
 * Usa Modal + Pressable + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import {
  View,
  Pressable,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const Select = React.forwardRef<View, SelectProps>(
  (
    {
      options = [],
      value,
      onValueChange,
      placeholder = 'Selecione...',
      className = '',
      style,
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(value);

    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    const selectedOption = options.find(opt => opt.value === internalValue);

    const handleSelect = (optionValue: string) => {
      setInternalValue(optionValue);
      onValueChange?.(optionValue);
      setIsOpen(false);
    };

    return (
      <View ref={ref} className={cn('', className)} style={style}>
        {/* Trigger */}
        <Pressable
          onPress={() => !disabled && setIsOpen(true)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2',
            disabled && 'opacity-50'
          )}
        >
          <Text
            className={cn(
              'text-base text-foreground',
              !selectedOption && 'text-muted-foreground'
            )}
          >
            {selectedOption?.label || placeholder}
          </Text>
          <Text className="text-muted-foreground">▼</Text>
        </Pressable>

        {/* Modal/Picker */}
        <Modal
          visible={isOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setIsOpen(false)}
          >
            <View className="m-4 mt-auto rounded-lg bg-background p-4 shadow-lg">
              <Text className="mb-2 text-lg font-semibold text-foreground">
                Selecione uma opção
              </Text>
              <ScrollView className="max-h-64">
                {options.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      'border-b border-border py-3',
                      option.disabled && 'opacity-50'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-base text-foreground',
                        option.value === internalValue && 'font-semibold text-primary'
                      )}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="mt-4 rounded-md bg-primary px-4 py-2"
              >
                <Text className="text-center font-semibold text-primary-foreground">
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }
);

Select.displayName = 'Select';

export default Select;
