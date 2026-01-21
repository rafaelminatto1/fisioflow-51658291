/**
 * Tabs - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebTabs = React.lazy(() =>
  import('@/components/web/ui/tabs').then(m => ({ default: m.Tabs }))
);

const NativeTabs = React.lazy(() =>
  import('@/components/native/ui/tabs').then(m => ({ default: m.Tabs }))
);

export interface SharedTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = React.forwardRef<any, SharedTabsProps>(
  ({ defaultValue, value, onValueChange, children, className }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      defaultValue,
      value,
      onValueChange,
      children,
      className,
      ref,
    };

    return (
      <React.Suspense fallback={<div>{children}</div>}>
        {isWeb ? <WebTabs {...props} /> : <NativeTabs {...props} />}
      </React.Suspense>
    );
  }
);

Tabs.displayName = 'Tabs';

// Export sub-components
export const TabsList = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/tabs').then(m => ({ default: m.TabsList })))
    : React.lazy(() => import('@/components/native/ui/tabs').then(m => ({ default: m.TabsList })));

  return (
    <React.Suspense fallback={<div />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export const TabsTrigger = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/tabs').then(m => ({ default: m.TabsTrigger })))
    : React.lazy(() => import('@/components/native/ui/tabs').then(m => ({ default: m.TabsTrigger })));

  return (
    <React.Suspense fallback={<div />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export const TabsContent = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/tabs').then(m => ({ default: m.TabsContent })))
    : React.lazy(() => import('@/components/native/ui/tabs').then(m => ({ default: m.TabsContent })));

  return (
    <React.Suspense fallback={<div />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default Tabs;
