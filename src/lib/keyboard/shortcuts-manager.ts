/**
 * Biblioteca de gerenciamento de atalhos de teclado globais
 * @module lib/keyboard/shortcuts-manager
 */


// =====================================================================
// TYPES
// =====================================================================

import { useCallback, useEffect, useRef } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: (event: KeyboardEvent) => void | boolean;
  category?: 'global' | 'navigation' | 'actions' | 'forms' | 'schedule' | 'patients';
  enabled?: boolean;
  preventDefault?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutConfig {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  ignoreInputs?: boolean;
  debug?: boolean;
}

// =====================================================================
// DEFAULT SHORTCUTS
// =====================================================================

export const DEFAULT_SHORTCUTS: Record<string, KeyboardShortcut[]> = {
  global: [
    {
      key: '?',
      description: 'Mostrar atalhos disponíveis',
      action: () => {
        // Dispatch custom event to show help
        window.dispatchEvent(new CustomEvent('shortcuts:show-help'));
      },
      category: 'global',
      preventDefault: true,
    },
    {
      key: 'k',
      ctrlKey: true,
      metaKey: true,
      description: 'Focar busca global',
      action: () => {
        // Dispatch custom event to focus search
        window.dispatchEvent(new CustomEvent('search:focus'));
      },
      category: 'global',
      preventDefault: true,
    },
  ],

  navigation: [
    {
      key: 'g',
      shiftKey: true,
      description: 'Ir para...',
      action: () => {
        window.dispatchEvent(new CustomEvent('navigation:go-to'));
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'h',
      shiftKey: true,
      description: 'Ir para Home/Dashboard',
      action: () => {
        window.location.href = '/';
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'a',
      shiftKey: true,
      description: 'Ir para Agenda',
      action: () => {
        window.location.href = '/schedule';
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'p',
      shiftKey: true,
      description: 'Ir para Pacientes',
      action: () => {
        window.location.href = '/patients';
      },
      category: 'navigation',
      preventDefault: true,
    },
    {
      key: 'w',
      shiftKey: true,
      description: 'Ir para Lista de Espera',
      action: () => {
        window.location.href = '/waitlist';
      },
      category: 'navigation',
      preventDefault: true,
    },
  ],

  actions: [
    {
      key: 'n',
      description: 'Novo agendamento',
      action: () => {
        window.dispatchEvent(new CustomEvent('appointment:new'));
      },
      category: 'actions',
      preventDefault: true,
    },
    {
      key: 'n',
      shiftKey: true,
      description: 'Novo paciente',
      action: () => {
        window.dispatchEvent(new CustomEvent('patient:new'));
      },
      category: 'actions',
      preventDefault: true,
    },
    {
      key: 's',
      ctrlKey: true,
      metaKey: true,
      description: 'Salvar',
      action: () => {
        window.dispatchEvent(new CustomEvent('form:save'));
      },
      category: 'actions',
      preventDefault: true,
    },
    {
      key: 'Escape',
      description: 'Fechar modal ou cancelar',
      action: () => {
        window.dispatchEvent(new CustomEvent('modal:close'));
      },
      category: 'actions',
      preventDefault: false,
    },
  ],

  schedule: [
    {
      key: 'd',
      description: 'Visão de Dia',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:view-change', { detail: 'day' }));
      },
      category: 'schedule',
      preventDefault: true,
    },
    {
      key: 'w',
      description: 'Visão de Semana',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:view-change', { detail: 'week' }));
      },
      category: 'schedule',
      preventDefault: true,
    },
    {
      key: 'm',
      description: 'Visão de Mês',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:view-change', { detail: 'month' }));
      },
      category: 'schedule',
      preventDefault: true,
    },
    {
      key: 't',
      description: 'Ir para Hoje',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:go-today'));
      },
      category: 'schedule',
      preventDefault: true,
    },
    {
      key: 'ArrowLeft',
      ctrlKey: true,
      metaKey: true,
      description: 'Navegar para trás',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:navigate', { detail: 'back' }));
      },
      category: 'schedule',
      preventDefault: true,
    },
    {
      key: 'ArrowRight',
      ctrlKey: true,
      metaKey: true,
      description: 'Navegar para frente',
      action: () => {
        window.dispatchEvent(new CustomEvent('schedule:navigate', { detail: 'forward' }));
      },
      category: 'schedule',
      preventDefault: true,
    },
  ],

  patients: [
    {
      key: 'f',
      description: 'Focar busca de pacientes',
      action: () => {
        window.dispatchEvent(new CustomEvent('patients:focus-search'));
      },
      category: 'patients',
      preventDefault: true,
    },
    {
      key: 'e',
      description: 'Nova evolução',
      action: () => {
        window.dispatchEvent(new CustomEvent('patient:new-evolution'));
      },
      category: 'patients',
      preventDefault: true,
    },
    {
      key: 'r',
      description: 'Novo registro SOAP',
      action: () => {
        window.dispatchEvent(new CustomEvent('patient:new-soap'));
      },
      category: 'patients',
      preventDefault: true,
    },
  ],

  forms: [
    {
      key: 'Tab',
      shiftKey: true,
      description: 'Campo anterior',
      action: () => {
        // Let browser handle this naturally
        return false;
      },
      category: 'forms',
      preventDefault: false,
    },
    {
      key: 'Enter',
      ctrlKey: true,
      metaKey: true,
      description: 'Submeter formulário',
      action: () => {
        window.dispatchEvent(new CustomEvent('form:submit'));
      },
      category: 'forms',
      preventDefault: true,
    },
  ],
};

// =====================================================================
// SHORTCUT MANAGER CLASS
// =====================================================================

class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;
  private ignoreInputs = true;
  private debug = false;
  private listeners: Array<() => void> = [];

  constructor(config?: ShortcutConfig) {
    if (config) {
      this.ignoreInputs = config.ignoreInputs ?? true;
      this.debug = config.debug ?? false;
      this.enabled = config.enabled ?? true;

      if (config.shortcuts) {
        this.registerShortcuts(config.shortcuts);
      }
    }
  }

  /**
   * Registra múltiplos atalhos
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  /**
   * Registra um atalho individual
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, { ...shortcut, enabled: shortcut.enabled ?? true });
    this.log(`Registered shortcut: ${key} - ${shortcut.description}`);
  }

  /**
   * Remove um atalho
   */
  unregisterShortcut(shortcut: Omit<KeyboardShortcut, 'action'>): void {
    const key = this.getShortcutKey(shortcut as KeyboardShortcut);
    this.shortcuts.delete(key);
    this.log(`Unregistered shortcut: ${key}`);
  }

  /**
   * Habilita um atalho
   */
  enableShortcut(shortcut: Omit<KeyboardShortcut, 'action'>): void {
    const key = this.getShortcutKey(shortcut as KeyboardShortcut);
    const existing = this.shortcuts.get(key);
    if (existing) {
      existing.enabled = true;
    }
  }

  /**
   * Desabilita um atalho
   */
  disableShortcut(shortcut: Omit<KeyboardShortcut, 'action'>): void {
    const key = this.getShortcutKey(shortcut as KeyboardShortcut);
    const existing = this.shortcuts.get(key);
    if (existing) {
      existing.enabled = false;
    }
  }

  /**
   * Ativa/desativa o gerenciador
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.log(`Shortcuts ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Inicia o gerenciador
   */
  start(): () => void {
    const handler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', handler);
    this.listeners.push(() => window.removeEventListener('keydown', handler));

    this.log('Keyboard shortcut manager started');

    return () => {
      this.listeners.forEach(unregister => unregister());
      this.listeners = [];
      this.log('Keyboard shortcut manager stopped');
    };
  }

  /**
   * Retorna todos os atalhos registrados
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Retorna atalhos por categoria
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Gera a chave única para um atalho
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.metaKey) parts.push('meta');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Verifica se um evento corresponde a um atalho
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;
    if (shortcut.ctrlKey !== event.ctrlKey) return false;
    if (shortcut.metaKey !== event.metaKey) return false;
    if (shortcut.altKey !== event.altKey) return false;
    if (shortcut.shiftKey !== event.shiftKey) return false;
    return true;
  }

  /**
   * Manipula eventos de teclado
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Check if we should ignore input elements
    if (this.ignoreInputs && this.isInputElement(event.target as HTMLElement)) {
      return;
    }

    // Find matching shortcut
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.enabled && this.matchesShortcut(event, shortcut)) {
        this.log(`Shortcut triggered: ${this.getShortcutKey(shortcut)} - ${shortcut.description}`);

        const result = shortcut.action(event);

        // Prevent default if specified or if action returns true
        if (shortcut.preventDefault || result === true) {
          event.preventDefault();
          event.stopPropagation();
        }

        break; // Only trigger the first matching shortcut
      }
    }
  }

  /**
   * Verifica se é um elemento de input
   */
  private isInputElement(element: HTMLElement): boolean {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    const isInput = ['input', 'textarea', 'select'].includes(tagName);

    const isEditable = element.getAttribute('contenteditable') === 'true';

    return isInput || isEditable;
  }

  /**
   * Log de debug
   */
  private log(message: string): void {
    if (this.debug) {
      logger.debug(`[KeyboardShortcuts] ${message}`, undefined, 'shortcuts-manager');
    }
  }
}

// =====================================================================
// REACT HOOK
// =====================================================================

export interface UseKeyboardShortcutsOptions extends ShortcutConfig {
  dependencies?: unknown[];
}

/**
 * Hook para usar atalhos de teclado em componentes React
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const managerRef = useRef<KeyboardShortcutManager | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Create manager on first render
    if (!managerRef.current) {
      managerRef.current = new KeyboardShortcutManager(options);
      stopRef.current = managerRef.current.start();
    }

    return () => {
      stopRef.current?.();
      managerRef.current = null;
      stopRef.current = null;
    };
  }, []);

  // Update shortcuts when dependencies change
  useEffect(() => {
    if (managerRef.current && options.shortcuts) {
      // Clear existing shortcuts
      managerRef.current.getShortcuts().forEach(s => {
        managerRef.current?.unregisterShortcut(s);
      });

      // Register new shortcuts
      managerRef.current.registerShortcuts(options.shortcuts);
    }
  }, [options.shortcuts, ...(options.dependencies || [])]);

  // Actions
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    managerRef.current?.registerShortcut(shortcut);
  }, []);

  const unregisterShortcut = useCallback((shortcut: Omit<KeyboardShortcut, 'action'>) => {
    managerRef.current?.unregisterShortcut(shortcut);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    managerRef.current?.setEnabled(enabled);
  }, []);

  const getShortcuts = useCallback(() => {
    return managerRef.current?.getShortcuts() || [];
  }, []);

  const getShortcutsByCategory = useCallback((category: KeyboardShortcut['category']) => {
    return managerRef.current?.getShortcutsByCategory(category) || [];
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    setEnabled,
    getShortcuts,
    getShortcutsByCategory,
  };
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Formata a descrição de um atalho para exibição
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('⌘');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');

  // Format key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';
  if (key === 'Escape') key = 'Esc';

  parts.push(key);

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? parts.join('') : parts.join('+');
}

/**
 * Agrupa atalhos por categoria
 */
export function groupShortcutsByCategory(shortcuts: KeyboardShortcut[]): ShortcutGroup[] {
  const groups = new Map<string, KeyboardShortcut[]>();

  shortcuts.forEach(shortcut => {
    const category = shortcut.category || 'global';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(shortcut);
  });

  return Array.from(groups.entries()).map(([name, shortcuts]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    shortcuts,
  }));
}

// =====================================================================
// EXPORTS
// =====================================================================

export { KeyboardShortcutManager };
export default useKeyboardShortcuts;
