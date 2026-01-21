/**
 * Card - Componente Cross-Platform
 *
 * Web: Usa shadcn/ui Card (div + Tailwind)
 * Native: Usa react-native-reusables Card (View + NativeWind)
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

// Import web components
const WebCard = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.Card }))
);
const WebCardHeader = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.CardHeader }))
);
const WebCardTitle = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.CardTitle }))
);
const WebCardDescription = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.CardDescription }))
);
const WebCardContent = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.CardContent }))
);
const WebCardFooter = React.lazy(() =>
  import('@/components/web/ui/card').then(m => ({ default: m.CardFooter }))
);

// Import native components
const NativeCard = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.Card }))
);
const NativeCardHeader = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.CardHeader }))
);
const NativeCardTitle = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.CardTitle }))
);
const NativeCardDescription = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.CardDescription }))
);
const NativeCardContent = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.CardContent }))
);
const NativeCardFooter = React.lazy(() =>
  import('@/components/native/ui/card').then(m => ({ default: m.CardFooter }))
);

/**
 * Props base para Card
 */
interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Container principal do Card
 */
export const Card = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<CardFallback {...props} />}>
        {isWeb ? <WebCard {...props} /> : <NativeCard {...props} />}
      </React.Suspense>
    );
  }
);
Card.displayName = 'Card';

/**
 * Header do Card (título + descrição)
 */
export const CardHeader = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<div className="p-6">{children}</div>}>
        {isWeb ? <WebCardHeader {...props} /> : <NativeCardHeader {...props} />}
      </React.Suspense>
    );
  }
);
CardHeader.displayName = 'CardHeader';

/**
 * Título do Card
 */
export const CardTitle = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<h3 className="text-xl font-semibold">{children}</h3>}>
        {isWeb ? <WebCardTitle {...props} /> : <NativeCardTitle {...props} />}
      </React.Suspense>
    );
  }
);
CardTitle.displayName = 'CardTitle';

/**
 * Descrição do Card
 */
export const CardDescription = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<p className="text-sm text-muted-foreground">{children}</p>}>
        {isWeb ? <WebCardDescription {...props} /> : <NativeCardDescription {...props} />}
      </React.Suspense>
    );
  }
);
CardDescription.displayName = 'CardDescription';

/**
 * Conteúdo principal do Card
 */
export const CardContent = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<div className="p-6 pt-0">{children}</div>}>
        {isWeb ? <WebCardContent {...props} /> : <NativeCardContent {...props} />}
      </React.Suspense>
    );
  }
);
CardContent.displayName = 'CardContent';

/**
 * Footer do Card (ações, etc)
 */
export const CardFooter = React.forwardRef<any, BaseCardProps>(
  ({ children, className, style }, ref) => {
    const { isWeb } = usePlatform();

    const props = { className, style, children, ref };

    return (
      <React.Suspense fallback={<div className="flex items-center p-6 pt-0">{children}</div>}>
        {isWeb ? <WebCardFooter {...props} /> : <NativeCardFooter {...props} />}
      </React.Suspense>
    );
  }
);
CardFooter.displayName = 'CardFooter';

/**
 * Fallback simples para Card
 */
const CardFallback: React.FC<BaseCardProps> = ({ children, className, style }) => {
  return (
    <div
      className={className}
      style={{
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: 'white',
        padding: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;
