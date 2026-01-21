/**
 * Progress - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebProgress = React.lazy(() =>
  import('@/components/web/ui/progress').then(m => ({ default: m.Progress }))
);

const NativeProgress = React.lazy(() =>
  import('@/components/native/ui/progress').then(m => ({ default: m.Progress }))
);

export interface SharedProgressProps {
  value?: number;
  max?: number;
  className?: string;
}

export const Progress = React.forwardRef<any, SharedProgressProps>(
  ({ value = 0, max = 100, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = { value, max, className, ref, ...props };

    return (
      <React.Suspense fallback={<ProgressFallback {...platformProps} />}>
        {isWeb ? <WebProgress {...platformProps} /> : <NativeProgress {...platformProps} />}
      </React.Suspense>
    );
  }
);

Progress.displayName = 'Progress';

const ProgressFallback: React.FC<SharedProgressProps> = ({ value = 0, max = 100 }) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#0ea5e9', transition: 'width 0.3s ease' }} />
    </div>
  );
};

export default Progress;
