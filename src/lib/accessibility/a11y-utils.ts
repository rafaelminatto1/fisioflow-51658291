/**
 * Biblioteca de utilitários de acessibilidade
 * @module lib/accessibility/a11y-utils
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// =====================================================================
// FOCUS MANAGEMENT
// =====================================================================

/**
 * Tenta focar em um elemento por seletor
 */
export function focusBySelector(selector: string, fallbackIndex?: number): boolean {
  const element = document.querySelector(selector) as HTMLElement | null;

  if (element) {
    element.focus();
    return true;
  }

  if (fallbackIndex !== undefined) {
    const focusableElements = getFocusableElements();
    if (focusableElements[fallbackIndex]) {
      focusableElements[fallbackIndex].focus();
      return true;
    }
  }

  return false;
}

/**
 * Retorna todos os elementos focáveis dentro de um container
 */
export function getFocusableElements(container: HTMLElement | Document = document): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
}

/**
 * Trapa o foco dentro de um elemento (para modais, dialogs, etc)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = getFocusableElements(element);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
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

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Restaura o foco para um elemento anterior
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element) {
    element.focus();
  }
}

// =====================================================================
// SCREEN READER ANNOUNCEMENTS
// =====================================================================

let liveRegion: HTMLElement | null = null;

/**
 * Cria ou retorna a região de live para anúncios de screen reader
 */
function getLiveRegion(): HTMLElement {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

/**
 * Anuncia uma mensagem para leitores de tela
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const region = getLiveRegion();

  // Update aria-live based on priority
  region.setAttribute('aria-live', priority);

  // Clear previous message
  region.textContent = '';

  // Set new message after a small delay to ensure screen readers pick it up
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/**
 * Anuncia uma mensagem assertiva (interrupção imediata)
 */
export function announceAssertive(message: string): void {
  announce(message, 'assertive');
}

// =====================================================================
// REACT HOOKS
// =====================================================================

/**
 * Hook para trap focus em um elemento (modais, dialogs, etc)
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Trap focus
    const cleanup = trapFocus(containerRef.current);

    return () => {
      cleanup();
      // Restore focus
      previousActiveElementRef.current?.focus();
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Hook para restaurar foco ao desmontar
 */
export function useRestoreFocus(enabled: boolean = true) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;

    return () => {
      previousActiveElementRef.current?.focus();
    };
  }, [enabled]);
}

/**
 * Hook para anúnciar mudanças para screen readers
 */
export function useAnnounce() {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, []);
}

/**
 * Hook para gerenciar focus em modais
 */
export function useModalFocus() {
  const modalRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isOpenRef = useRef(false);

  const open = useCallback(() => {
    if (!modalRef.current) return;

    // Store the trigger element
    triggerRef.current = document.activeElement as HTMLElement;
    isOpenRef.current = true;

    // Focus first focusable element in modal
    const focusableElements = getFocusableElements(modalRef.current);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    announce('Modal aberto', 'polite');
  }, []);

  const close = useCallback(() => {
    if (!isOpenRef.current) return;

    isOpenRef.current = false;

    // Restore focus to trigger
    if (triggerRef.current) {
      triggerRef.current.focus();
    }

    announce('Modal fechado', 'polite');
  }, []);

  return { modalRef, open, close };
}

// =====================================================================
// KEYBOARD NAVIGATION
// =====================================================================

/**
 * Hook para navegação por teclado em listas
 */
export function useKeyboardNavigation(options: {
  itemCount: number;
  onSelect: (index: number) => void;
  onFocus?: (index: number) => void;
  loop?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'both';
}) {
  const { itemCount, onSelect, onFocus, loop = true, orientation = 'vertical' } = options;
  const selectedIndexRef = useRef(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = selectedIndexRef.current;

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex + 1;
          if (loop && newIndex >= itemCount) {
            newIndex = 0;
          } else if (newIndex >= itemCount) {
            newIndex = itemCount - 1;
          }
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex - 1;
          if (loop && newIndex < 0) {
            newIndex = itemCount - 1;
          } else if (newIndex < 0) {
            newIndex = 0;
          }
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex + 1;
          if (loop && newIndex >= itemCount) {
            newIndex = 0;
          } else if (newIndex >= itemCount) {
            newIndex = itemCount - 1;
          }
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex - 1;
          if (loop && newIndex < 0) {
            newIndex = itemCount - 1;
          } else if (newIndex < 0) {
            newIndex = 0;
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        newIndex = itemCount - 1;
        break;

      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          e.preventDefault();
          onSelect(currentIndex);
        }
        return;

      default:
        return;
    }

    if (newIndex !== currentIndex) {
      selectedIndexRef.current = newIndex;
      onFocus?.(newIndex);
    }
  }, [itemCount, onSelect, onFocus, loop, orientation]);

  const setSelectedIndex = useCallback((index: number) => {
    selectedIndexRef.current = index;
  }, []);

  return {
    handleKeyDown,
    selectedIndex: selectedIndexRef.current,
    setSelectedIndex,
  };
}

// =====================================================================
// ARIA HELPERS
// =====================================================================

/**
 * Gera IDs únicos para elementos ARIA
 */
let ariaIdCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++ariaIdCounter}`;
}

/**
 * Hook para gerar IDs ARIA conectados
 */
export function useAriaIds(prefix: string, count: number) {
  return useRef(
    Array.from({ length: count }, () => generateAriaId(prefix))
  ).current;
}

// =====================================================================
// REDUCED MOTION
// =====================================================================

/**
 * Verifica se o usuário prefere movimento reduzido
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook para detectar preferência de movimento reduzido
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      setPrefersReduced(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReduced;
}

// =====================================================================
// VISIBLE FOCUS
// =====================================================================

/**
 * Hook para mostrar foco apenas ao navegar por teclado
 */
export function useKeyboardOnlyFocus() {
  useEffect(() => {
    let isUsingKeyboard = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true;
        document.body.classList.add('using-keyboard');
      }
    };

    const handleMouseDown = () => {
      isUsingKeyboard = false;
      document.body.classList.remove('using-keyboard');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.classList.remove('using-keyboard');
    };
  }, []);
}

// =====================================================================
// EXPORTS
// =====================================================================

export default {
  focusBySelector,
  getFocusableElements,
  trapFocus,
  restoreFocus,
  announce,
  announceAssertive,
  useFocusTrap,
  useRestoreFocus,
  useAnnounce,
  useModalFocus,
  useKeyboardNavigation,
  generateAriaId,
  useAriaIds,
  prefersReducedMotion,
  useReducedMotion,
  useKeyboardOnlyFocus,
};
