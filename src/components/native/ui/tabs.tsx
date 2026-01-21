/**
 * Tabs - Native Component (React Native)
 *
 * Usa Pressable + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import { View, Pressable, ScrollView, Text, ViewStyle } from 'react-native';
import { cn } from '@/lib/utils';

// Context
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within <Tabs>');
  }
  return context;
};

// Root Tabs component
export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export const Tabs = React.forwardRef<View, TabsProps>(
  ({
    defaultValue = '',
    value: controlledValue,
    onValueChange,
    children,
    className = '',
    style,
    orientation = 'horizontal',
  },
  ref
) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;

    const handleValueChange = (newValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <View ref={ref} className={cn('', className)} style={style}>
          {children}
        </View>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

// TabsList
export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export const TabsList = React.forwardRef<ScrollView, TabsListProps>(
  ({ children, className = '', style }, ref) => {
    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName={cn(
          'inline-flex items-center justify-center rounded-lg bg-muted p-1',
          className
        )}
        style={style}
      >
        {children}
      </ScrollView>
    );
  }
);

TabsList.displayName = 'TabsList';

// TabsTrigger
export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTrigger = React.forwardRef<Pressable, TabsTriggerProps>(
  ({ value: triggerValue, children, className = '', disabled }, ref) => {
    const { value, onValueChange } = useTabsContext();
    const isActive = value === triggerValue;

    return (
      <Pressable
        ref={ref}
        onPress={() => !disabled && onValueChange(triggerValue)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-background/50',
          className
        )}
      >
        <Text
          className={cn(
            'text-sm font-medium',
            isActive
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {children}
        </Text>
      </Pressable>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

// TabsContent
export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export const TabsContent = React.forwardRef<View, TabsContentProps>(
  ({ value: contentValue, children, className = '', style }, ref) => {
    const { value } = useTabsContext();

    if (value !== contentValue) {
      return null;
    }

    return (
      <View
        ref={ref}
        className={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        style={style}
      >
        {children}
      </View>
    );
  }
);

TabsContent.displayName = 'TabsContent';

export default Tabs;
