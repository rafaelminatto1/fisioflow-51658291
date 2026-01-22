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
      <React.Suspense fallback={<div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f1f5f9' }} />}>
        {isWeb ? <WebAvatar {...platformProps} /> : <NativeAvatar {...platformProps} />}
      </React.Suspense>
    );
  }
);

Avatar.displayName = 'Avatar';

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
