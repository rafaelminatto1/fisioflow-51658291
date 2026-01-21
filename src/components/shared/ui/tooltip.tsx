/**
 * Tooltip - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebTooltip = React.lazy(() =>
  import('@/components/web/ui/tooltip').then(m => ({ default: m.Tooltip }))
);

const NativeTooltip = React.lazy(() =>
  import('@/components/native/ui/tooltip').then(m => ({ default: m.Tooltip }))
);

const WebTooltipContent = React.lazy(() =>
  import('@/components/web/ui/tooltip').then(m => ({ default: m.TooltipContent }))
);

const NativeTooltipContent = React.lazy(() =>
  import('@/components/native/ui/tooltip').then(m => ({ default: m.TooltipContent }))
);

export interface SharedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export const Tooltip = ({ children, content, className }: SharedTooltipProps) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, content, className };

  return (
    <React.Suspense fallback={<>{children}</>}>
      {isWeb ? <WebTooltip {...platformProps} /> : <NativeTooltip {...platformProps} />}
    </React.Suspense>
  );
};

Tooltip.displayName = 'Tooltip';

export const TooltipContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<div className="bg-black text-white text-xs px-2 py-1 rounded">{children}</div>}>
      {isWeb ? <WebTooltipContent>{children}</WebTooltipContent> : <NativeTooltipContent>{children}</NativeTooltipContent>}
    </React.Suspense>
  );
};

export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Tooltip;
