/**
 * Accessibility Utilities
 *
 * @description
 * Utility functions and hooks for implementing WCAG 2.1 AA accessibility features.
 *
 * @module lib/a11y
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Announce a message to screen readers
 * Uses aria-live region for dynamic content announcements
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Remove existing live regions
  const existing = document.getElementById(`sr-announcement-${priority}`);
  if (existing) {
    existing.remove();
  }

  // Create new live region
  const liveRegion = document.createElement('div');
  liveRegion.id = `sr-announcement-${priority}`;
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.setAttribute('role', 'status');

  // Add to DOM
  document.body.appendChild(liveRegion);

  // Set message after a small delay to ensure screen reader catches it
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);

  // Remove after announcement
  setTimeout(() => {
    liveRegion.remove();
  }, 5000);
}

/**
 * Hook to manage focus trap in modals
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const focusableElements = containerRef.current.querySelectorAll<
      HTMLElement
    >(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Restore focus to previous element
        previousActiveElement.current?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);

      // Restore focus when modal closes
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to manage focus restoration
 */
export function useFocusRestoration(isOpen: boolean) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element when opening
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when closing
      previousActiveElementRef.current?.focus();
    }
  }, [isOpen]);
}

/**
 * Hook to skip to main content
 */
export function useSkipLink(targetId: string = 'main-content') {
  const [showSkipLink, setShowSkipLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setShowSkipLink(true);
      }
    };

    const handleMouseDown = () => {
      setShowSkipLink(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleClick = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return { showSkipLink, handleClick };
}

/**
 * Get ARIA attributes for common UI patterns
 */
export const ariaAttributes = {
  /**
   * ARIA attributes for expandable/collapsible content
   */
  expanded: (isExpanded: boolean) => ({
    'aria-expanded': isExpanded,
  }),

  /**
   * ARIA attributes for popup/dropdown
   */
  popup: (isOpen: boolean, type: 'menu' | 'listbox' | 'dialog' | 'grid' = 'menu') => ({
    'aria-haspopup': type,
    'aria-expanded': isOpen,
  }),

  /**
   * ARIA attributes for selected state
   */
  selected: (isSelected: boolean) => ({
    'aria-selected': isSelected,
  }),

  /**
   * ARIA attributes for checked state
   */
  checked: (isChecked: boolean | 'mixed') => ({
    'aria-checked': isChecked,
  }),

  /**
   * ARIA attributes for disabled state
   */
  disabled: (isDisabled: boolean) => ({
    'aria-disabled': isDisabled,
    disabled: isDisabled,
  }),

  /**
   * ARIA attributes for pressed state (toggle buttons)
   */
  pressed: (isPressed: boolean) => ({
    'aria-pressed': isPressed,
  }),

  /**
   * ARIA attributes for loading state
   */
  busy: (isBusy: boolean) => ({
    'aria-busy': isBusy,
  }),

  /**
   * ARIA attributes for invalid/form error state
   */
  invalid: (isInvalid: boolean, message?: string) => ({
    'aria-invalid': isInvalid,
    ...(message && { 'aria-describedby': message }),
  }),

  /**
   * ARIA attributes for live region
   */
  liveRegion: (politeness: 'polite' | 'assertive' | 'off' = 'polite') => ({
    'aria-live': politeness,
    'aria-atomic': 'true',
  }),

  /**
   * ARIA attributes for current page/item
   */
  current: (isCurrent: boolean, page: string | boolean = 'page') => ({
    'aria-current': isCurrent ? page : undefined,
  }),

  /**
   * ARIA attributes for orientation
   */
  orientation: (orientation: 'horizontal' | 'vertical') => ({
    'aria-orientation': orientation,
  }),

  /**
   * ARIA attributes for required fields
   */
  required: (isRequired: boolean) => ({
    'aria-required': isRequired,
    required: isRequired,
  }),

  /**
   * ARIA attributes for modal/dialog
   */
  modal: (role: 'dialog' | 'alertdialog' = 'dialog') => ({
    role,
    'aria-modal': 'true',
  }),

  /**
   * ARIA attributes for listbox
   */
  listbox: (isActive: boolean) => ({
    role: 'listbox',
    'aria-expanded': isActive,
    'aria-activedescendant': isActive ? undefined : '',
  }),

  /**
   * ARIA attributes for option
   */
  option: (isSelected: boolean, index: number) => ({
    role: 'option',
    'aria-selected': isSelected,
    id: `option-${index}`,
  }),

  /**
   * ARIA attributes for tab
   */
  tab: (isSelected: boolean, controlsId: string, panelId: string) => ({
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    id: controlsId,
    tabIndex: isSelected ? 0 : -1,
  }),

  /**
   * ARIA attributes for tab panel
   */
  tabPanel: (tabId: string) => ({
    role: 'tabpanel',
    'aria-labelledby': tabId,
    tabIndex: 0,
  }),

  /**
   * ARIA attributes for tree/item
   */
  treeNode: (isExpanded: boolean, level: number, setsize?: number, posinset?: number) => ({
    role: 'treeitem',
    'aria-expanded': isExpanded,
    'aria-level': level,
    ...(setsize !== undefined && { 'aria-setsize': setsize }),
    ...(posinset !== undefined && { 'aria-posinset': posinset }),
  }),

  /**
   * ARIA attributes for slider
   */
  slider: (value: number, min: number, max: number, label?: string) => ({
    role: 'slider',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': `${value}`,
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for progress bar
   */
  progressBar: (value: number, max: number = 100, label?: string) => ({
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuetext': `${Math.round((value / max) * 100)}%`,
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for tooltip
   */
  tooltip: (triggerId: string) => ({
    role: 'tooltip',
    id: `${triggerId}-tooltip`,
  }),

  /**
   * ARIA attributes for alert
   */
  alert: (isLive: boolean = true) => ({
    role: 'alert',
    'aria-live': isLive ? 'assertive' : 'off',
  }),

  /**
   * ARIA attributes for status
   */
  status: () => ({
    role: 'status',
    'aria-live': 'polite',
  }),

  /**
   * ARIA attributes for navigation landmark
   */
  navigation: (label?: string) => ({
    role: 'navigation',
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for main landmark
   */
  main: (label?: string) => ({
    role: 'main',
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for search landmark
   */
  search: (label?: string) => ({
    role: 'search',
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for complementary landmark
   */
  complementary: (label?: string) => ({
    role: 'complementary',
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for contentinfo landmark
   */
  contentInfo: (label?: string) => ({
    role: 'contentinfo',
    ...(label && { 'aria-label': label }),
  }),

  /**
   * ARIA attributes for form landmark
   */
  form: (label: string) => ({
    role: 'form',
    'aria-label': label,
  }),

  /**
   * ARIA attributes for region landmark
   */
  region: (label: string) => ({
    role: 'region',
    'aria-label': label,
  }),
};

/**
 * Keyboard key codes
 */
export const keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Check if key is an activation key (Enter or Space)
 */
export function isActivationKey(key: string): boolean {
  return key === keys.ENTER || key === keys.SPACE;
}

/**
 * Check if key is an arrow key
 */
export function isArrowKey(key: string): boolean {
  return (
    key === keys.ARROW_UP ||
    key === keys.ARROW_DOWN ||
    key === keys.ARROW_LEFT ||
    key === keys.ARROW_RIGHT
  );
}

/**
 * Create keyboard event handler with type safety
 */
export function createKeyboardHandler(
  handlers: Partial<Record<keyof typeof keys, (e: KeyboardEvent) => void>>
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const handler = handlers[e.key as keyof typeof keys];
    if (handler) {
      handler(e);
    }
  };
}

/**
 * Hook to handle keyboard navigation in lists
 */
export function useKeyboardListNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: {
    orientation?: 'horizontal' | 'vertical';
    loop?: boolean;
    isActive?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true, isActive = true } = options;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isActive) return;

    const nextKeys = orientation === 'vertical'
      ? [keys.ARROW_DOWN]
      : [keys.ARROW_RIGHT];
    const prevKeys = orientation === 'vertical'
      ? [keys.ARROW_UP]
      : [keys.ARROW_LEFT];

    if (nextKeys.includes(e.key)) {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev + 1;
        if (next >= items.length) {
          return loop ? 0 : prev;
        }
        return next;
      });
    } else if (prevKeys.includes(e.key)) {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev - 1;
        if (next < 0) {
          return loop ? items.length - 1 : 0;
        }
        return next;
      });
    } else if (isActivationKey(e.key)) {
      e.preventDefault();
      onSelect(items[selectedIndex], selectedIndex);
    } else if (e.key === keys.HOME) {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === keys.END) {
      e.preventDefault();
      setSelectedIndex(items.length - 1);
    }
  };

  return { selectedIndex, setSelectedIndex, handleKeyDown };
}
