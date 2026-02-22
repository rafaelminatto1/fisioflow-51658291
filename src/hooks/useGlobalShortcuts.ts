/**
 * useGlobalShortcuts - Global keyboard shortcuts for evolution panel
 *
 * Features:
 * - Ctrl/Cmd + S: Save
 * - Ctrl/Cmd + N: New section
 * - Ctrl/Cmd + /: Show shortcuts modal
 * - Escape: Close modals
 * - Ctrl/Cmd + 1-7: Jump to sections
 */

import { useEffect, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

interface UseGlobalShortcutsOptions {
  onSave?: () => void;
  onNewSection?: () => void;
  onShowShortcuts?: () => void;
  onJumpToSection?: (sectionNumber: number) => void;
  enabled?: boolean;
}

export const useGlobalShortcuts = ({
  onSave,
  onNewSection,
  onShowShortcuts,
  onJumpToSection,
  enabled = true,
}: UseGlobalShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if user is typing in input field
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target.isContentEditable;

      // Allow standard shortcuts in inputs
      if (isTyping) {
        // Only handle Ctrl+S for save
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 's' &&
          onSave
        ) {
          event.preventDefault();
          onSave();
        }
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // Global shortcuts (only when Ctrl/Cmd is pressed)
      if (!isCtrlOrCmd) return;

      switch (event.key.toLowerCase()) {
        case 's':
          // Ctrl/Cmd + S: Save
          event.preventDefault();
          onSave?.();
          break;

        case 'n':
          // Ctrl/Cmd + N: New section
          event.preventDefault();
          onNewSection?.();
          break;

        case '/':
          // Ctrl/Cmd + /: Show shortcuts modal
          event.preventDefault();
          onShowShortcuts?.();
          break;

        case 'escape':
          // Escape: Close modals
          event.preventDefault();
          // Let the modal handle escape internally
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
          // Ctrl/Cmd + 1-7: Jump to sections
          event.preventDefault();
          const sectionNumber = parseInt(event.key);
          onJumpToSection?.(sectionNumber);
          break;
      }
    },
    [enabled, onSave, onNewSection, onShowShortcuts, onJumpToSection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { handleKeyDown };
};

// Helper function to check if a key event matches a shortcut
export const matchesShortcut = (
  event: KeyboardEvent,
  key: string,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
): boolean => {
  const ctrlMatch = options.ctrl === undefined || event.ctrlKey === options.ctrl || event.metaKey === options.ctrl;
  const shiftMatch = options.shift === undefined || event.shiftKey === options.shift;
  const altMatch = options.alt === undefined || event.altKey === options.alt;
  const keyMatch = event.key.toLowerCase() === key.toLowerCase();

  return ctrlMatch && shiftMatch && altMatch && keyMatch;
};

// Keyboard shortcut help text
export const SHORTCUTS_HELP = [
  { key: 'Ctrl+S', action: 'Salvar evolução' },
  { key: 'Ctrl+N', action: 'Nova seção' },
  { key: 'Ctrl+/', action: 'Mostrar atalhos' },
  { key: 'Escape', action: 'Fechar modal' },
  { key: 'Ctrl+1 a 7', action: 'Pular para seção' },
];
