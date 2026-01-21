/**
 * Popover - Native Component (React Native)
 *
 * Usa Modal + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerPosition: { x: number; y: number; width: number; height: number } | null;
  setTriggerPosition: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(
  undefined
);

const usePopoverContext = () => {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within <Popover>');
  }
  return context;
};

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Popover = ({
  open: controlledOpen,
  onOpenChange,
  children,
}: PopoverProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [triggerPosition, setTriggerPosition] = React.useState<
    { x: number; y: number; width: number; height: number } | null
  >(null);

  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  return (
    <PopoverContext.Provider
      value={{ open, onOpenChange: handleOpenChange, triggerPosition, setTriggerPosition }}
    >
      {children}
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { onOpenChange, setTriggerPosition } = usePopoverContext();

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setTriggerPosition({ x, y, width, height });
  };

  return (
    <Pressable
      onPress={() => onOpenChange(true)}
      onLayout={handleLayout}
    >
      {children}
    </Pressable>
  );
};

export const PopoverContent = ({
  children,
  className = '',
  align = 'center',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  style?: ViewStyle;
}) => {
  const { open, onOpenChange, triggerPosition } = usePopoverContext();

  if (!open || !triggerPosition) {
    return null;
  }

  // Calculate position based on alignment
  let left = triggerPosition.x;
  if (align === 'center') {
    left = triggerPosition.x + triggerPosition.width / 2 - 150; // Assuming ~300px width
  } else if (align === 'end') {
    left = triggerPosition.x + triggerPosition.width - 300;
  }

  const top = triggerPosition.y + triggerPosition.height + 8;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className="absolute rounded-lg border border-border bg-background p-4 shadow-lg"
          style={{
            left: Math.max(16, left),
            top: Math.max(16, top),
            right: 16,
            maxWidth: 400,
            ...style,
          }}
        >
          <View className={cn('', className)}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default Popover;
