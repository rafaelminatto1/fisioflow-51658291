/**
 * Accessibility Utilities
 *
 * WCAG 2.1 AA compliant utilities and helpers
 *
 * @module lib/accessibility
 */


/**
 * Announces messages to screen readers via ARIA live regions
 */

import React from 'react';

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  // Remove existing announcer if present
  const existing = document.getElementById(`a11y-announcer-${priority}`);
  if (existing) {
    existing.remove();
  }

  // Create new announcer
  const announcer = document.createElement('div');
  announcer.id = `a11y-announcer-${priority}`;
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  // Clean up after message is announced
  setTimeout(() => {
    announcer.remove();
  }, 5000);
}

/**
 * Traps focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Manages focus restoration when closing modals
 */
export function useFocusRestoration(isOpen: boolean) {
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus when closed
      previousActiveElementRef.current?.focus();
    }
  }, [isOpen]);
}

/**
 * Checks color contrast ratio for WCAG compliance
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const [R, G, B] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if contrast meets WCAG AA standards
 */
export function meetsWCAG_AA(foreground: string, background: string, largeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Checks if contrast meets WCAG AAA standards
 */
export function meetsWCAG_AAA(foreground: string, background: string, largeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Generates unique ID for accessibility attributes
 */
let idCounter = 0;
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Keyboard navigation keys
 */
export const KEYS = {
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

export type NavigationKey = typeof KEYS[keyof typeof KEYS];

/**
 * Checks if key is a keyboard navigation key
 */
export function isNavigationKey(key: string): boolean {
  return Object.values(KEYS).includes(key as NavigationKey);
}

/**
 * Adds visually-hidden class but keeps accessible to screen readers
 */
export const srOnly = 'sr-only';

export const srOnlyStyles = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .sr-only-focusable:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Focus visible styles for better keyboard navigation */
  *:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }

  /* Skip to main content link */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 8px 16px;
    z-index: 100;
    transition: top 0.3s;
  }

  .skip-link:focus {
    top: 0;
  }
`;

/**
 * Reduced motion media query
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate animation duration based on reduced motion preference
 */
export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

/**
 * Checks if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Checks if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * ARIA role mappings for common components
 */
export const ARIA_ROLES = {
  // Navigation
  NAV: 'navigation',
  MENU: 'menu',
  MENU_ITEM: 'menuitem',
  TAB_LIST: 'tablist',
  TAB: 'tab',
  TAB_PANEL: 'tabpanel',

  // Interactive
  BUTTON: 'button',
  LINK: 'link',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  ALERT: 'alert',
  STATUS: 'status',

  // Form
  FORM: 'form',
  TEXTBOX: 'textbox',
  COMBO_BOX: 'combobox',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  RADIO_GROUP: 'radiogroup',
  SWITCH: 'switch',
  SLIDER: 'slider',

  // Live regions
  LIVE_REGION: 'live',
  LOG: 'log',
  MARQUEE: 'marquee',
  TIMER: 'timer',

  // Structure
  ARTICLE: 'article',
  REGION: 'region',
  SECTION: 'section',
  HEADING: 'heading',
  LIST: 'list',
  LIST_ITEM: 'listitem',
  DESCRIPTION_LIST: 'dl',
  DESCRIPTION_TERM: 'dt',
  DESCRIPTION_DETAIL: 'dd',
} as const;

/**
 * Get appropriate heading level based on context
 */
export function getHeadingLevel(context: 'main' | 'aside' | 'nested' = 'main'): number {
  const levels = {
    main: 1,
    aside: 2,
    nested: 3,
  };
  return levels[context];
}

/**
 * Create accessible label from icon
 */
export function iconToLabel(iconName: string, fallback?: string): string {
  const labels: Record<string, string> = {
    'menu': 'Abrir menu',
    'close': 'Fechar',
    'search': 'Buscar',
    'filter': 'Filtrar',
    'add': 'Adicionar',
    'edit': 'Editar',
    'delete': 'Excluir',
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'confirm': 'Confirmar',
    'next': 'Próximo',
    'previous': 'Anterior',
    'calendar': 'Agenda',
    'user': 'Perfil',
    'settings': 'Configurações',
    'logout': 'Sair',
    'notifications': 'Notificações',
  };

  return labels[iconName] || fallback || iconName;
}

/**
 * Screen reader only text component props
 */
export interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export function ScreenReaderOnly({ children, as: Component = 'span' }: ScreenReaderOnlyProps) {
  return <Component className={srOnly}>{children}</Component>;
}

/**
 * Focus management hook for keyboard navigation
 */
export function useKeyboardNavigation(
  items: Array<{ id: string; element?: HTMLElement }>,
  options?: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
    onNavigate?: (index: number) => void;
  }
) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { loop = true, orientation = 'horizontal' } = options || {};
    const isVertical = orientation === 'vertical';

    const prevKey = isVertical ? KEYS.ARROW_UP : KEYS.ARROW_LEFT;
    const nextKey = isVertical ? KEYS.ARROW_DOWN : KEYS.ARROW_RIGHT;

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : items.length - 1;
          options?.onNavigate?.(next);
          return loop ? next : prev;
        });
        break;

      case nextKey:
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < items.length - 1 ? prev + 1 : 0;
          options?.onNavigate?.(next);
          return loop ? next : prev;
        });
        break;

      case KEYS.HOME:
        e.preventDefault();
        setFocusedIndex(0);
        options?.onNavigate?.(0);
        break;

      case KEYS.END:
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        options?.onNavigate?.(items.length - 1);
        break;

      case KEYS.ENTER:
      case KEYS.SPACE: {
        const focusedItem = items[focusedIndex];
        focusedItem?.element?.click();
        break;
      }
    }
  };

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

/**
 * Live region announcer component
 */
interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  role?: 'status' | 'alert';
}

export function LiveRegion({ message, priority = 'polite', role = 'status' }: LiveRegionProps) {
  React.useEffect(() => {
    if (message) {
      announceToScreenReader(message, priority);
    }
  }, [message, priority]);

  return (
    <div
      role={role}
      aria-live={priority}
      aria-atomic="true"
      className={srOnly}
    >
      {message}
    </div>
  );
}
