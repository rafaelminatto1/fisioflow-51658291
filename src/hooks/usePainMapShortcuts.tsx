/* eslint-disable react-refresh/only-export-components */
import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  onToggleView?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAll?: () => void;
  onAddPoint?: () => void;
  onToggleFilter?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  onSave?: () => void;
  intensityUp?: () => void;
  intensityDown?: () => void;
}

export function usePainMapShortcuts(config: ShortcutConfig, enabled: boolean = true) {
  const {
    onToggleView,
    onUndo,
    onRedo,
    onClearAll,
    onAddPoint,
    onToggleFilter,
    onExport,
    onHelp,
    onSave,
    intensityUp,
    intensityDown,
  } = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignorar se estiver em um input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Atalhos básicos
    switch (true) {
      // Toggle View (V)
      case key === 'v' && !ctrl && !shift:
        e.preventDefault();
        onToggleView?.();
        break;

      // Undo (Ctrl+Z)
      case key === 'z' && ctrl && !shift:
        e.preventDefault();
        onUndo?.();
        break;

      // Redo (Ctrl+Shift+Z ou Ctrl+Y)
      case (key === 'z' && ctrl && shift) || (key === 'y' && ctrl):
        e.preventDefault();
        onRedo?.();
        break;

      // Clear All (Delete ou Backspace)
      case key === 'delete' || key === 'backspace':
        e.preventDefault();
        onClearAll?.();
        break;

      // Add Point (A)
      case key === 'a' && !ctrl && !shift:
        e.preventDefault();
        onAddPoint?.();
        break;

      // Toggle Filter (F)
      case key === 'f' && !ctrl && !shift:
        e.preventDefault();
        onToggleFilter?.();
        break;

      // Export (Ctrl+E)
      case key === 'e' && ctrl:
        e.preventDefault();
        onExport?.();
        break;

      // Help (?)
      case key === '?':
        e.preventDefault();
        onHelp?.();
        break;

      // Save (Ctrl+S)
      case key === 's' && ctrl:
        e.preventDefault();
        onSave?.();
        break;

      // Intensity Up (↑ ou +)
      case key === 'arrowup' || (key === '+' && !ctrl):
        e.preventDefault();
        intensityUp?.();
        break;

      // Intensity Down (↓ ou -)
      case key === 'arrowdown' || (key === '-' && !ctrl):
        e.preventDefault();
        intensityDown?.();
        break;

      // Escape (fechar modais)
      case key === 'escape':
        // Deixar o comportamento padrão do Escape
        break;
    }
  }, [
    enabled,
    intensityUp,
    intensityDown,
    onAddPoint,
    onUndo,
    onRedo,
    onClearAll,
    onSave,
    onExport,
    onToggleView,
    onToggleFilter,
    onHelp,
  ]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return null;
}

// Componente para exibir ajuda de atalhos
export interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  if (!open) return null;

  const shortcuts = [
    { key: 'V', description: 'Alternar vista (Frente/Costas)' },
    { key: 'A', description: 'Adicionar ponto' },
    { key: 'F', description: 'Alternar filtros' },
    { key: '↑ / +', description: 'Aumentar intensidade' },
    { key: '↓ / -', description: 'Diminuir intensidade' },
    { key: 'Ctrl+Z', description: 'Desfazer' },
    { key: 'Ctrl+Shift+Z', description: 'Refazer' },
    { key: 'Ctrl+S', description: 'Salvar' },
    { key: 'Ctrl+E', description: 'Exportar' },
    { key: 'Delete', description: 'Limpar tudo' },
    { key: '?', description: 'Mostrar ajuda' },
    { key: 'Esc', description: 'Fechar' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Atalhos de Teclado</h2>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                  {shortcut.key}
                </kbd>
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
