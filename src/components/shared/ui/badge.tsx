/**
 * Badge - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebBadge = React.lazy(() =>
  import('@/components/web/ui/badge').then(m => ({ default: m.Badge }))
);

const NativeBadge = React.lazy(() =>
  import('@/components/native/ui/badge').then(m => ({ default: m.Badge }))
);

export interface SharedBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export const Badge = React.forwardRef<any, SharedBadgeProps>(
  ({ children, className, variant = 'default' }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      children,
      className,
      variant,
      ref,
    };

    return (
      <React.Suspense fallback={<BadgeFallback {...props} />}>
        {isWeb ? <WebBadge {...props} /> : <NativeBadge {...props} />}
      </React.Suspense>
    );
  }
);

Badge.displayName = 'Badge';

const BadgeFallback: React.FC<SharedBadgeProps> = ({ children, className }) => {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        padding: '2px 10px',
        fontSize: '12px',
        fontWeight: 600,
        background: '#0ea5e9',
        color: 'white',
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
