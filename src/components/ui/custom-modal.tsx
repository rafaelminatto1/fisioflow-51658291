import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CustomModal - A robust modal component that avoids React Error #185
 *
 * Key differences from Dialog/Sheet:
 * - Uses native DOM events instead of Radix UI state management
 * - No internal state that could cause render loops
 * - Proper event cleanup with refs
 * - Supports mobile (bottom sheet) and desktop (centered) layouts
 */

interface CustomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  isMobile?: boolean;
}

/**
 * Custom Modal Component
 *
 * Designed to avoid the React Error #185 by:
 * 1. Using refs for stable event handler references
 * 2. Properly cleaning up event listeners
 * 3. Not using complex state management like Radix UI
 */
export const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onOpenChange,
  children,
  className,
  contentClassName,
  isMobile = false
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Use refs to store the latest callback to avoid stale closures
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  // Handle overlay click with ref
  const handleOverlayClick = useRef((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onOpenChangeRef.current(false);
    }
  });

  // Handle escape key with proper cleanup
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChangeRef.current(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!open || !contentRef.current) return;

    const focusableElements = contentRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (!firstElement) return;

    firstElement.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    contentRef.current.addEventListener('keydown', handleTab);
    return () => {
      contentRef.current?.removeEventListener('keydown', handleTab);
    };
  }, [open]);

  if (!open) return null;

  // Mobile: Bottom sheet com altura fixa para footer sempre visível
  const modalContainerClass = isMobile
    ? "fixed inset-x-0 bottom-0 top-auto z-50 flex flex-col"
    : "fixed inset-0 z-50 flex items-center justify-center p-4";

  const modalContentClass = isMobile
    ? "bg-white w-full rounded-t-2xl shadow-2xl flex flex-col h-[90dvh] max-h-[90dvh] min-h-0 overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
    : "bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden";

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "animate-in fade-in duration-200",
        className
      )}
      onClick={handleOverlayClick.current}
    >
      <div className={modalContainerClass}>
        <div
          ref={contentRef}
          className={cn(
            modalContentClass,
            contentClassName
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * CustomModal Components
 */
export const CustomModalHeader: React.FC<{
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}> = ({ className, children, onClose }) => {
  return (
    <div className={cn(
      "flex items-center justify-between px-6 py-5 border-b shrink-0",
      className
    )}>
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export const CustomModalTitle: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  return (
    <h2 className={cn("text-xl font-semibold text-gray-900", className)}>
      {children}
    </h2>
  );
};

export const CustomModalBody: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  return (
    <div className={cn(
      "flex-1 overflow-y-auto px-4 sm:px-6 py-4",
      className
    )}>
      {children}
    </div>
  );
};

export const CustomModalFooter: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className, children }) => {
  return (
    <div className={cn(
      "flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 shrink-0",
      className
    )}>
      {children}
    </div>
  );
};
