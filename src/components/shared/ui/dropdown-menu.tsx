/**
 * DropdownMenu - Componente Cross-Platform
 *
 * This component delegates to platform-specific implementations:
 * - Web: Uses @/components/web/ui/dropdown-menu (Radix UI)
 * - Native: Uses @/components/native/ui/dropdown-menu (React Native)
 */

import * as React from 'react';
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

const WebDropdownMenuLabel = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuLabel }))
);

const NativeDropdownMenuLabel = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuLabel }))
);

const WebDropdownMenuSeparator = React.lazy(() =>
  import('@/components/web/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuSeparator }))
);

const NativeDropdownMenuSeparator = React.lazy(() =>
  import('@/components/native/ui/dropdown-menu').then(m => ({ default: m.DropdownMenuSeparator }))
);

// Web fallback components (for Suspense)
const WebFallback = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const WebFallbackContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-lg border ${className || ''}`}>{children}</div>
);

// Native fallback components
const NativeFallback = ({ children }: { children: React.ReactNode }) => {
  const RN = require('react-native');
  return React.createElement(RN.View, null, children);
};

const NativeFallbackContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const RN = require('react-native');
  return React.createElement(RN.View, { className: `bg-white rounded-lg shadow-lg border ${className || ''}` }, children);
};

export interface SharedDropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu = ({ children, open, onOpenChange }: SharedDropdownMenuProps) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, open, onOpenChange };

  const FallbackComponent = isWeb ? WebFallback : NativeFallback;

  return (
    <React.Suspense fallback={<FallbackComponent>{children}</FallbackComponent>}>
      {isWeb ? <WebDropdownMenu {...platformProps} /> : <NativeDropdownMenu {...platformProps} />}
    </React.Suspense>
  );
};

DropdownMenu.displayName = 'DropdownMenu';

export const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => {
  const { isWeb } = usePlatform();

  // Use platform-specific trigger
  return (
    <React.Suspense fallback={<div>{children}</div>}>
      {isWeb ? <WebDropdownMenuTrigger>{children}</WebDropdownMenuTrigger> : <NativeDropdownMenuTrigger>{children}</NativeDropdownMenuTrigger>}
    </React.Suspense>
  );
};

export const DropdownMenuContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  const FallbackComponent = isWeb ? WebFallbackContent : NativeFallbackContent;

  return (
    <React.Suspense fallback={<FallbackComponent className={className}>{children}</FallbackComponent>}>
      {isWeb ? <WebDropdownMenuContent>{children}</WebDropdownMenuContent> : <NativeDropdownMenuContent>{children}</NativeDropdownMenuContent>}
    </React.Suspense>
  );
};

export const DropdownMenuItem = ({ children, onSelect, disabled }: { children: React.ReactNode; onSelect?: () => void; disabled?: boolean }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<div style={{ opacity: disabled ? 0.5 : 1 }}>{children}</div>}>
      {isWeb ? (
        <WebDropdownMenuItem onSelect={onSelect} disabled={disabled}>
          {children}
        </WebDropdownMenuItem>
      ) : (
        <NativeDropdownMenuItem onSelect={onSelect} disabled={disabled}>
          {children}
        </NativeDropdownMenuItem>
      )}
    </React.Suspense>
  );
};

export const DropdownMenuLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<div className={`px-2 py-1.5 text-sm font-semibold ${className || ''}`}>{children}</div>}>
      {isWeb ? <WebDropdownMenuLabel className={className}>{children}</WebDropdownMenuLabel> : <NativeDropdownMenuLabel className={className}>{children}</NativeDropdownMenuLabel>}
    </React.Suspense>
  );
};

export const DropdownMenuSeparator = () => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<div style={{ borderTopWidth: 1, borderColor: '#e2e8f0', marginVertical: 4 }} />}>
      {isWeb ? <WebDropdownMenuSeparator /> : <NativeDropdownMenuSeparator />}
    </React.Suspense>
  );
};

export default DropdownMenu;
