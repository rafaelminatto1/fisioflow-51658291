/**
 * Dialog - Native Component (React Native)
 *
 * Usa Modal + View + NativeWind para styling compatível com Tailwind
 */

import * as React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { cn } from '@/lib/utils';
import { X } from '@/lib/icons/X';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(
  undefined
);

const useDialogContext = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within <Dialog>');
  }
  return context;
};

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({
  open: controlledOpen,
  onOpenChange,
  children,
}: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ children }: { children: React.ReactNode }) => {
  const { onOpenChange } = useDialogContext();

  return (
    <Pressable onPress={() => onOpenChange(true)}>{children}</Pressable>
  );
};

export const DialogContent = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open, onOpenChange } = useDialogContext();

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center p-4"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
          {/* Close button */}
          <Pressable
            onPress={() => onOpenChange(false)}
            className="absolute right-4 top-4"
          >
            <X className="text-foreground" size={20} />
          </Pressable>

          <View className={cn('', className)}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const DialogHeader = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <View className={cn('mb-4', className)}>{children}</View>;
};

export const DialogTitle = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Text
      className={cn('text-lg font-semibold text-foreground', className)}
    >
      {children}
    </Text>
  );
};

export const DialogDescription = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </Text>
  );
};

export const DialogBody = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <View className={cn('mb-4', className)}>
      <ScrollView>{children}</ScrollView>
    </View>
  );
};

export const DialogFooter = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <View
      className={cn('flex flex-row items-center justify-end gap-2', className)}
    >
      {children}
    </View>
  );
};

export default Dialog;
