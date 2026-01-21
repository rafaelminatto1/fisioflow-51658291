/**
 * Dropdown Menu - Native Component (React Native)
 *
 * Usa Modal + Pressable + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  ScrollView,
  Separator,
  LayoutChangeEvent,
} from 'react-native';
import { cn } from '@/lib/utils';
import { Check } from '@/lib/icons/Check';

interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerPosition: { x: number; y: number; width: number; height: number } | null;
  setTriggerPosition: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(
  undefined
);

const useDropdownMenuContext = () => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within <DropdownMenu>');
  }
  return context;
};

export interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const DropdownMenu = ({
  open: controlledOpen,
  onOpenChange,
  children,
}: DropdownMenuProps) => {
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
    <DropdownMenuContext.Provider
      value={{ open, onOpenChange: handleOpenChange, triggerPosition, setTriggerPosition }}
    >
      {children}
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { onOpenChange, setTriggerPosition } = useDropdownMenuContext();

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

export const DropdownMenuContent = ({
  children,
  className = '',
  align = 'start',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}) => {
  const { open, onOpenChange, triggerPosition } = useDropdownMenuContext();

  if (!open || !triggerPosition) {
    return null;
  }

  // Calculate position
  let left = triggerPosition.x;
  if (align === 'center') {
    left = triggerPosition.x + triggerPosition.width / 2 - 100;
  } else if (align === 'end') {
    left = triggerPosition.x + triggerPosition.width - 200;
  }

  const top = triggerPosition.y + triggerPosition.height + 8;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable className="flex-1" onPress={() => onOpenChange(false)}>
        <View
          className="absolute min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
          style={{
            left: Math.max(16, left),
            top: Math.max(16, top),
            right: 16,
            maxWidth: 200,
          }}
        >
          <ScrollView>{children}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

export const DropdownMenuItem = ({
  children,
  className = '',
  onPress,
  disabled = false,
  icon: Icon,
}: {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: any;
}) => {
  const { onOpenChange } = useDropdownMenuContext();

  return (
    <Pressable
      onPress={() => {
        onPress?.();
        onOpenChange(false);
      }}
      disabled={disabled}
      className={cn(
        'relative flex flex-row items-center gap-2 rounded-sm px-2 py-1.5',
        'disabled:pointer-events-none disabled:opacity-50',
        'focus:bg-accent',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 text-foreground" size={16} />}
      <Text className="flex-1 text-sm text-foreground">{children}</Text>
    </Pressable>
  );
};

export const DropdownMenuSeparator = () => {
  return <View className="my-1 h-[1px] bg-border" />;
};

export const DropdownMenuCheckboxItem = ({
  checked,
  children,
  onCheckedChange,
  className = '',
}: {
  checked: boolean;
  children: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) => {
  const { onOpenChange } = useDropdownMenuContext();

  return (
    <Pressable
      onPress={() => {
        onCheckedChange(!checked);
        onOpenChange(false);
      }}
      className={cn(
        'relative flex flex-row items-center gap-2 rounded-sm px-2 py-1.5',
        'focus:bg-accent',
        className
      )}
    >
      <View
        className={cn(
          'h-4 w-4 shrink-0 rounded items-center justify-center border',
          checked ? 'bg-primary border-primary' : 'border-input'
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" size={12} />}
      </View>
      <Text className="flex-1 text-sm text-foreground">{children}</Text>
    </Pressable>
  );
};

export default DropdownMenu;
