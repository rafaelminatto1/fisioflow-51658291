/**
 * Alert - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebAlert = React.lazy(() =>
  import('@/components/web/ui/alert').then(m => ({ default: m.Alert }))
);

const NativeAlert = React.lazy(() =>
  import('@/components/native/ui/alert').then(m => ({ default: m.Alert }))
);

export interface SharedAlertProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title?: string;
}

export const Alert = React.forwardRef<any, SharedAlertProps>(
  ({ children, className, variant, title }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      children,
      className,
      variant,
      title,
      ref,
    };

    return (
      <React.Suspense fallback={<AlertFallback {...props} />}>
        {isWeb ? <WebAlert {...props} /> : <NativeAlert {...props} />}
      </React.Suspense>
    );
  }
);

Alert.displayName = 'Alert';

const AlertFallback: React.FC<SharedAlertProps> = ({ children, title, variant }) => {
  const bgColors = {
    default: '#f1f5f9',
    destructive: '#fee2e2',
    success: '#dcfce7',
    warning: '#fef3c7',
    info: '#dbeafe',
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: bgColors[variant || 'default'],
        border: '1px solid #e2e8f0',
      }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      <div>{children}</div>
    </div>
  );
};

export const AlertTitle = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/alert').then(m => ({ default: m.AlertTitle })))
    : React.lazy(() => import('@/components/native/ui/alert').then(m => ({ default: m.AlertTitle })));

  return (
    <React.Suspense fallback={<div style={{ fontWeight: 600 }} />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export const AlertDescription = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/alert').then(m => ({ default: m.AlertDescription })))
    : React.lazy(() => import('@/components/native/ui/alert').then(m => ({ default: m.AlertDescription })));

  return (
    <React.Suspense fallback={<div />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default Alert;
