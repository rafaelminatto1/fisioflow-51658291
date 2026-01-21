/**
 * Separator - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebSeparator = React.lazy(() =>
  import('@/components/web/ui/separator').then(m => ({ default: m.Separator }))
);

const NativeSeparator = React.lazy(() =>
  import('@/components/native/ui/separator').then(m => ({ default: m.Separator }))
);

export interface SharedSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator = React.forwardRef<any, SharedSeparatorProps>(
  ({ orientation = 'horizontal', className, ...props }, ref) => {
  const { isWeb } = usePlatform();

    const platformProps = { orientation, className, ref, ...props };

    return (
      <React.Suspense fallback={<SeparatorFallback {...platformProps} />}>
        {isWeb ? <WebSeparator {...platformProps} /> : <NativeSeparator {...platformProps} />}
      </React.Suspense>
    );
  }
);

Separator.displayName = 'Separator';

const SeparatorFallback: React.FC<SharedSeparatorProps> = ({ orientation = 'horizontal', className }) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={className}
        style={{ width: '1px', height: '100%', backgroundColor: '#e2e8f0' }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{ height: '1px', width: '100%', backgroundColor: '#e2e8f0' }}
    />
  );
};

export default Separator;
