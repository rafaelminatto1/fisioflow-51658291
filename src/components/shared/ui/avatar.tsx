/**
 * Avatar - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebAvatar = React.lazy(() =>
  import('@/components/web/ui/avatar').then(m => ({ default: m.Avatar }))
);

const NativeAvatar = React.lazy(() =>
  import('@/components/native/ui/avatar').then(m => ({ default: m.Avatar }))
);

export interface SharedAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

export const Avatar = React.forwardRef<any, SharedAvatarProps>(
  ({ src, alt, className, size = 'md', fallback }, ref) => {
  const { isWeb } = usePlatform();

    const platformProps = { src, alt, className, size, fallback, ref };

    return (
      <React.Suspense fallback={<AvatarFallback {...platformProps} />}>
        {isWeb ? <WebAvatar {...platformProps} /> : <NativeAvatar {...platformProps} />}
      </React.Suspense>
    );
  }
);

Avatar.displayName = 'Avatar';

const AvatarFallback: React.FC<SharedAvatarProps> = ({ alt, fallback, size = 'md' }) => {
  const sizeStyles = { sm: 32, md: 40, lg: 48, xl: 64 };
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const displayFallback = fallback || (alt ? getInitials(alt) : '?');

  return (
    <div
      style={{
        width: sizeStyles[size],
        height: sizeStyles[size],
        borderRadius: '50%',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0ea5e9',
        fontWeight: 600,
        fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
      }}
    >
      {displayFallback}
    </div>
  );
};

export const AvatarImage = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/avatar').then(m => ({ default: m.AvatarImage })))
    : React.lazy(() => import('@/components/native/ui/avatar').then(m => ({ default: m.AvatarImage })));

  return (
    <React.Suspense fallback={null}>
      <Component {...props} />
    </React.Suspense>
  );
};

export const AvatarFallback = (props: any) => {
  const { isWeb } = usePlatform();
  const Component = isWeb
    ? React.lazy(() => import('@/components/web/ui/avatar').then(m => ({ default: m.AvatarFallback })))
    : React.lazy(() => import('@/components/native/ui/avatar').then(m => ({ default: m.AvatarFallback })));

  return (
    <React.Suspense fallback={<div style={{ background: '#f1f5f9', borderRadius: '50%' }} />}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default Avatar;
