/**
 * Skeleton - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebSkeleton = React.lazy(() =>
  import('@/components/web/ui/skeleton').then(m => ({ default: m.Skeleton }))
);

const NativeSkeleton = React.lazy(() =>
  import('@/components/native/ui/skeleton').then(m => ({ default: m.Skeleton }))
);

export interface SharedSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = React.forwardRef<any, SharedSkeletonProps>(
  ({ width = '100%', height = '20px', className, ...props }, ref) => {
  const { isWeb } = usePlatform();

    const platformProps = { width, height, className, ref, ...props };

    return (
      <React.Suspense fallback={<SkeletonFallback {...platformProps} />}>
        {isWeb ? <WebSkeleton {...platformProps} /> : <NativeSkeleton {...platformProps} />}
      </React.Suspense>
    );
  }
);

Skeleton.displayName = 'Skeleton';

const SkeletonFallback: React.FC<SharedSkeletonProps> = ({ width, height, className }) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: '4px',
        backgroundColor: '#e2e8f0',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
};

export default Skeleton;
