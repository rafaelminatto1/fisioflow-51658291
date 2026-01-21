/**
 * Accordion - Native Component (React Native)
 *
 * Usa Pressable + View + Animated + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Pressable, Text, Animated, StyleSheet } from 'react-native';
import { cn } from '@/lib/utils';
import { ChevronDown } from '@/lib/icons/ChevronDown';
import { ChevronRight } from '@/lib/icons/ChevronRight';

interface AccordionContextValue {
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(
  undefined
);

const useAccordionContext = () => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within <Accordion>');
  }
  return context;
};

export interface AccordionProps {
  children: React.ReactNode;
  type: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
}

export const Accordion = React.forwardRef<View, AccordionProps>(
  ({ children, type, value: controlledValue, onValueChange, className = '' }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      type === 'single' ? '' : []
    );

    const value = controlledValue ?? internalValue;

    const handleValueChange = (newValue: string | string[]) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
        <View ref={ref} className={cn('', className)}>
          {children}
        </View>
      </AccordionContext.Provider>
    );
  }
);

Accordion.displayName = 'Accordion';

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem = React.forwardRef<View, AccordionItemProps>(
  ({ value: itemValue, children, className = '' }, ref) => {
    return (
      <View ref={ref} className={cn('border-b border-border', className)}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { itemValue } as any);
          }
          return child;
        })}
      </View>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

export interface AccordionTriggerProps {
  itemValue: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionTrigger = React.forwardRef<Pressable, AccordionTriggerProps>(
  ({ itemValue, children, className = '' }, ref) => {
    const { value, onValueChange, type } = useAccordionContext();
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
      if (type === 'single') {
        setIsOpen(value === itemValue);
      } else if (Array.isArray(value)) {
        setIsOpen(value.includes(itemValue));
      }
    }, [value, itemValue, type]);

    const handlePress = () => {
      let newValue: string | string[];

      if (type === 'single') {
        newValue = isOpen ? '' : itemValue;
      } else {
        const arr = Array.isArray(value) ? value : [];
        newValue = isOpen
          ? arr.filter(v => v !== itemValue)
          : [...arr, itemValue];
      }

      onValueChange(newValue);
    };

    const rotateAnim = React.useRef(new Animated.Value(isOpen ? 0 : -90));

    React.useEffect(() => {
      Animated.timing(rotateAnim.current, {
        toValue: isOpen ? 0 : -90,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [isOpen]);

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        className={cn(
          'flex flex-row items-center justify-between py-4',
          'focus:outline-none',
          className
        )}
      >
        <Text className="flex-1 text-sm font-medium text-foreground">{children}</Text>
        <Animated.View
          style={{
            transform: [{ rotate: rotateAnim.current.interpolate({
              inputRange: [-90, 0],
              outputRange: ['-90deg', '0deg'],
            }) }],
          }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" size={16} />
        </Animated.View>
      </Pressable>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

export interface AccordionContentProps {
  itemValue: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionContent = React.forwardRef<View, AccordionContentProps>(
  ({ itemValue, children, className = '' }, ref) => {
    const { value, type } = useAccordionContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const [height] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
      let shouldOpen = false;
      if (type === 'single') {
        shouldOpen = value === itemValue;
      } else if (Array.isArray(value)) {
        shouldOpen = value.includes(itemValue);
      }

      setIsOpen(shouldOpen);

      Animated.timing(height, {
        toValue: shouldOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [value, itemValue, type]);

    if (!isOpen) {
      return null;
    }

    return (
      <Animated.View
        ref={ref}
        style={[
          {
            height: height.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Max height, pode ser ajustado
            }),
            overflow: 'hidden',
          },
        ]}
        className={cn('pb-4 pt-0', className)}
      >
        <View className="text-sm text-foreground">{children}</View>
      </Animated.View>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

export default Accordion;
