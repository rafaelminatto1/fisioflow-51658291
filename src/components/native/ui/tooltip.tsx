/**
 * Tooltip - Native Component (React Native)
 *
 * Usa Modal + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  LayoutChangeEvent,
} from 'react-native';
import { cn } from '@/lib/utils';

interface TooltipContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerPosition: { x: number; y: number; width: number; height: number } | null;
  setTriggerPosition: (position: { x: number; y: number; width: number; height: number } | null) => void;
  content: React.ReactNode;
  setContent: (content: React.ReactNode) => void;
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(
  undefined
);

const useTooltipContext = () => {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error('Tooltip components must be used within <TooltipProvider>');
  }
  return context;
};

export const TooltipProvider = ({
  children,
  delayDuration = 200,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) => {
  const [open, setOpen] = React.useState(false);
  const [triggerPosition, setTriggerPosition] = React.useState<
    { x: number; y: number; width: number; height: number } | null
  >(null);
  const [content, setContent] = React.useState<React.ReactNode>(null);

  const handleOpenChange = (value: boolean) => {
    if (delayDuration > 0) {
      setTimeout(() => setOpen(value), delayDuration);
    } else {
      setOpen(value);
    }
  };

  return (
    <TooltipContext.Provider
      value={{ open, onOpenChange: handleOpenChange, triggerPosition, setTriggerPosition, content, setContent }}
    >
      {children}
    </TooltipContext.Provider>
  );
};

export const Tooltip = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const TooltipTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { onOpenChange, setTriggerPosition } = useTooltipContext();

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setTriggerPosition({ x, y, width, height });
  };

  return (
    <Pressable
      onPressIn={() => onOpenChange(true)}
      onPressOut={() => onOpenChange(false)}
      onLayout={handleLayout}
    >
      {children}
    </Pressable>
  );
};

export const TooltipContent = ({
  children,
  className = '',
  sideOffset = 4,
}: {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}) => {
  const { open, onOpenChange, triggerPosition } = useTooltipContext();

  if (!open || !triggerPosition) {
    return null;
  }

  // Position above the trigger
  const left = triggerPosition.x + triggerPosition.width / 2 - 75; // Center horizontally (assuming ~150px)
  const top = triggerPosition.y - 40 - sideOffset;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1">
        <View
          className="absolute rounded-md border border-border bg-popover px-3 py-1.5 shadow-md"
          style={{
            left: Math.max(16, left),
            top: Math.max(16, top),
          }}
        >
          <Text className={cn('text-sm text-foreground', className)}>
            {children}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default Tooltip;
