/**
 * Label - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebLabel = React.lazy(() =>
  import('@/components/web/ui/label').then(m => ({ default: m.Label }))
);

const NativeLabel = React.lazy(() =>
  import('@/components/native/ui/label').then(m => ({ default: m.Label }))
);

export interface SharedLabelProps {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const Label = React.forwardRef<any, SharedLabelProps>(
  ({ children, className, htmlFor }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      children,
      className,
      ref,
      ...(isWeb ? { htmlFor } : { nativeID: htmlFor }),
    };

    return (
      <React.Suspense fallback={<LabelFallback {...props} />}>
        {isWeb ? <WebLabel {...props} /> : <NativeLabel {...props} />}
      </React.Suspense>
    );
  }
);

Label.displayName = 'Label';

const LabelFallback: React.FC<SharedLabelProps> = ({ children, className }) => {
  return (
    <label className={className} style={{ fontSize: 14, fontWeight: 500 }}>
      {children}
    </label>
  );
};

export default Label;
