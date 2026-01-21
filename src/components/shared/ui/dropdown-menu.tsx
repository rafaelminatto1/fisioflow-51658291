/**
 * DropdownMenu - Componente Cross-Platform
 */

import * as React from 'react';
import { Pressable, View } from 'react-native';
import { usePlatform } from '@/hooks/platform';

const WebDropdownMenu = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenu }))
);

const NativeDropdownMenu = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenu }))
);

const WebDropdownMenuTrigger = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuTrigger }))
);

const NativeDropdownMenuTrigger = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuTrigger }))
);

const WebDropdownMenuContent = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuContent }))
);

const NativeDropdownMenuContent = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuContent }))
);

const WebDropdownMenuItem = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuItem }))
);

const NativeDropdownMenuItem = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuItem }))
);

const WebDropdownMenuSeparator = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuSeparator }))
);

const NativeDropdownMenuSeparator = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuSeparator }))
);

export interface SharedDropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu = ({ children, open, onOpenChange }: SharedDropdownMenuProps) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, open, onOpenChange };

  return (
    <React.Suspense fallback={<View>{children}</View>}>
      {isWeb ? <WebDropdownMenu {...platformProps} /> : <NativeDropdownMenu {...platformProps} />}
    </React.Suspense>
  );
};

DropdownMenu.displayName = 'DropdownMenu';

export const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => {
  const { onOpenChange } = React.useContext(
    require('@/components/web/ui/dropdown-menu').DropdownMenuContext
  ) || { onOpenChange: () => {} };

  return (
    <Pressable onPress={() => onOpenChange(true)}>
      {children}
    </Pressable>
  );
};

export const DropdownMenuContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<View className="bg-white rounded-lg shadow-lg border">{children}</View>}>
      {isWeb ? <WebDropdownMenuContent>{children}</WebDropdownMenuContent> : <NativeDropdownMenuContent>{children}</NativeDropdownMenuContent>}
    </React.Suspense>
  );
};

export const DropdownMenuItem = ({ children, onSelect, disabled }: { children: React.ReactNode; onSelect?: () => void; disabled?: boolean }) => {
  const { onOpenChange } = React.useContext(
    require('@/components/web/ui/dropdown-menu').DropdownMenuContext
  ) || { onOpenChange: () => {} };

  const { isWeb } = usePlatform();

  const handlePress = () => {
    if (!disabled) {
      onSelect?.();
      onOpenChange(false);
    }
  };

  return (
    <Pressable onPress={handlePress} style={{ opacity: disabled ? 0.5 : 1 }}>
      {children}
    </Pressable>
  );
};

export const DropdownMenuSeparator = () => {
  return <View style={{ borderTopWidth: 1, borderColor: '#e2e8f0', marginVertical: 4 }} />;
};

export default DropdownMenu;
