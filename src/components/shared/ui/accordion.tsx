/**
 * Accordion - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebAccordion = React.lazy(() =>
  import('@/components/web/ui/accordion').then(m => ({ default: m.Accordion }))
);

const NativeAccordion = React.lazy(() =>
  import('@/components/native/ui/accordion').then(m => ({ default: m.Accordion }))
);

const WebAccordionItem = React.lazy(() =>
  import('@/components/web/ui/accordion').then(m => ({ default: m.AccordionItem }))
);

const NativeAccordionItem = React.lazy(() =>
  import('@/components/native/ui/accordion').then(m => ({ default: m.AccordionItem }))
);

const WebAccordionTrigger = React.lazy(() =>
  import('@/components/web/ui/accordion').then(m => ({ default: m.AccordionTrigger }))
);

const NativeAccordionTrigger = React.lazy(() =>
  import('@/components/native/ui/accordion').then(m => ({ default: m.AccordionTrigger }))
);

const WebAccordionContent = React.lazy(() =>
  import('@/components/web/ui/accordion').then(m => ({ default: m.AccordionContent }))
);

const NativeAccordionContent = React.lazy(() =>
  import('@/components/native/ui/accordion').then(m => ({ default: m.AccordionContent }))
);

export interface SharedAccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple';
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
}

export const Accordion = React.forwardRef<any, SharedAccordionProps>(
  ({ children, type, value, onValueChange, className, ...props }, ref) => {
  const { isWeb } = usePlatform();

  const platformProps = { children, type, value, onValueChange, className, ref, ...props };

  return (
    <React.Suspense fallback={<div className="space-y-2">{children}</div>}>
      {isWeb ? <WebAccordion {...platformProps} /> : <NativeAccordion {...platformProps} />}
    </React.Suspense>
  );
});

Accordion.displayName = 'Accordion';

export const AccordionItem = React.forwardRef<any, { value: string; children: React.ReactNode; className?: string }>(
  ({ value, children, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = { value, children, className, ref, ...props };

    return (
      <React.Suspense fallback={<div className="border rounded">{children}</div>}>
        {isWeb ? <WebAccordionItem {...platformProps} /> : <NativeAccordionItem {...platformProps} />}
      </React.Suspense>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

export const AccordionTrigger = React.forwardRef<any, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = { children, className, ref, ...props };

    return (
      <React.Suspense fallback={<div className="font-medium">{children}</div>}>
        {isWeb ? <WebAccordionTrigger {...platformProps} /> : <NativeAccordionTrigger {...platformProps} />}
      </React.Suspense>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

export const AccordionContent = React.forwardRef<any, { children: React.ReactNode; className?: string }>(
  ({ children, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = { children, className, ref, ...props };

    return (
      <React.Suspense fallback={<div className="pt-2">{children}</div>}>
        {isWeb ? <WebAccordionContent {...platformProps} /> : <NativeAccordionContent {...platformProps} />}
      </React.Suspense>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

export default Accordion;
