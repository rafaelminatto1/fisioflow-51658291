/**
 * Dialog - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebDialog = React.lazy(() =>
  import('@/components/web/ui/dialog').then(m => ({ default: m.Dialog }))
);

const NativeDialog = React.lazy(() =>
  import('@/components/native/ui/dialog').then(m => ({ default: m.Dialog }))
);

const WebDialogContent = React.lazy(() =>
  import('@/components/web/ui/dialog').then(m => ({ default: m.DialogContent }))
);

const NativeDialogContent = React.lazy(() =>
  import('@/components/native/ui/dialog').then(m => ({ default: m.DialogContent }))
);

const WebDialogHeader = React.lazy(() =>
  import('@/components/web/ui/dialog').then(m => ({ default: m.DialogHeader }))
);

const NativeDialogHeader = React.lazy(() =>
  import('@/components/native/ui/dialog').then(m => ({ default: m.DialogHeader }))
);

const WebDialogTitle = React.lazy(() =>
  import('@/components/web/ui/dialog').then(m => ({ default: m.DialogTitle }))
);

const NativeDialogTitle = React.lazy(() =>
  import('@/components/native/ui/dialog').then(m => ({ default: m.DialogTitle }))
);

const WebDialogDescription = React.lazy(() =>
  import('@/components/web/ui/dialog').then(m => ({ default: m.DialogDescription }))
);

const NativeDialogDescription = React.lazy(() =>
  import('@/components/native/ui/dialog').then(m => ({ default: m.DialogDescription }))
);

export interface SharedDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog = ({ open, onOpenChange, children }: SharedDialogProps) => {
  const { isWeb } = usePlatform();

  const platformProps = { open, onOpenChange, children };

  return (
    <React.Suspense fallback={<div className="hidden">{children}</div>}>
      {isWeb ? <WebDialog {...platformProps} /> : <NativeDialog {...platformProps} />}
    </React.Suspense>
  );
};

Dialog.displayName = 'Dialog';

export const DialogTrigger = ({ children }: { children: React.ReactNode }) => {
  const { onOpenChange } = React.useContext(
    isWeb ? require('@/components/web/ui/dialog').DialogContext
      : require('@/components/native/ui/dialog').DialogContext
  ) || { onOpenChange: () => {} };

  return (
    <Pressable onPress={() => onOpenChange(true)}>
      {children}
    </Pressable>
  );
};

export const DialogContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, className };

  return (
    <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">{children}</div>}>
      {isWeb ? <WebDialogContent {...platformProps} /> : <NativeDialogContent {...platformProps} />}
    </React.Suspense>
  );
};

export const DialogHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<div className="flex flex-col space-y-1.5 p-6">{children}</div>}>
      {isWeb ? <WebDialogHeader>{children}</WebDialogHeader> : <NativeDialogHeader>{children}</NativeDialogHeader>}
    </React.Suspense>
  );
};

export const DialogTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<h2 className="text-lg font-semibold">{children}</h2>}>
      {isWeb ? <WebDialogTitle>{children}</WebDialogTitle> : <NativeDialogTitle>{children}</NativeDialogTitle>}
    </React.Suspense>
  );
};

export const DialogDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<p className="text-sm text-muted-foreground">{children}</p>}>
      {isWeb ? <WebDialogDescription>{children}</WebDialogDescription> : <NativeDialogDescription>{children}</NativeDialogDescription>}
    </React.Suspense>
  );
};

export default Dialog;
