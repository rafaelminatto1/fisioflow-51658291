/**
 * Popover - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebPopover = React.lazy(() =>
  import('@/components/web/ui/popover').then(m => ({ default: m.Popover }))
);

const NativePopover = React.lazy(() =>
  import('@/components/native/ui/popover').then(m => ({ default: m.Popover }))
);

const WebPopoverTrigger = React.lazy(() =>
  import('@/components/web/ui/popover').then(m => ({ default: m.PopoverTrigger }))
);

const NativePopoverTrigger = React.lazy(() =>
  import('@/components/native/ui/popover').then(m => ({ default: m.PopoverTrigger }))
);

const WebPopoverContent = React.lazy(() =>
  import('@/components/web/ui/popover').then(m => ({ default: m.PopoverContent }))
);

const NativePopoverContent = React.lazy(() =>
  import('@/components/native/ui/popover').then(m => ({ default: m.PopoverContent }))
);

export interface SharedPopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Popover = ({ open, onOpenChange, children }: SharedPopoverProps) => {
  const { isWeb } = usePlatform();

  const platformProps = { open, onOpenChange, children };

  return (
    <React.Suspense fallback={<div>{children}</div>}>
      {isWeb ? <WebPopover {...platformProps} /> : <NativePopover {...platformProps} />}
    </React.Suspense>
  );
};

Popover.displayName = 'Popover';

export const PopoverTrigger = ({ children }: { children: React.ReactNode }) => {
  const { onOpenChange } = React.useContext(
    require('@/components/web/ui/popover').PopoverContext
  ) || { onOpenChange: () => {} };

  return (
    <Pressable onPress={() => onOpenChange(true)}>
      {children}
    </Pressable>
  );
};

export const PopoverContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, className };

  return (
    <React.Suspense fallback={<div className="bg-white p-4 rounded-lg shadow-lg">{children}</div>}>
      {isWeb ? <WebPopoverContent {...platformProps} /> : <NativePopoverContent {...platformProps} />}
    </React.Suspense>
  );
};

export default Popover;
