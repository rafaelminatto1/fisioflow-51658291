/**
 * Keyboard Shortcuts Enhanced - Atalhos de teclado melhorados
 *
 * Atalhos globais para navegação rápida na agenda:
 * - N: Novo agendamento
 * - E: Editar agendamento selecionado
 * - D: Visualizar por dia
 * - W: Visualizar por semana
 * - M: Visualizar por mês
 * - T: Ir para hoje
 * - F: Buscar por nome do paciente
 * - A: Modo de seleção (multi-select)
 * - Ctrl/Cmd + [Seta esquerda/direita]: Navegar rapidamente
 * - ESC: Fechar modal / sair do modo de seleção
 * - / ou ?: Abrir help de atalhos
 */

import React, { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Square,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  FileText,
  Settings as SettingsIcon,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Shortcut {
  key: string;
  label: string;
  icon: any;
  keys: string[];
  category: 'navigation' | 'actions' | 'editing' | 'search';
  description?: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    key: 'today',
    label: 'Ir para Hoje',
    icon: Clock,
    keys: ['T'],
    category: 'navigation',
    description: 'Navega diretamente para os agendamentos de hoje',
  },
  {
    key: 'prevDay',
    label: 'Dia Anterior',
    icon: ChevronLeft,
    keys: ['↑', '←'],
    category: 'navigation',
    description: 'Navega para o dia anterior',
  },
  {
    key: 'nextDay',
    label: 'Próximo Dia',
    icon: ChevronRight,
    keys: ['↓', '→'],
    category: 'navigation',
    description: 'Navega para o próximo dia',
  },
  {
    key: 'prevWeek',
    label: 'Semana Anterior',
    icon: ChevronLeft,
    keys: ['←', 'Shift+←'],
    category: 'navigation',
    description: 'Navega para a semana anterior',
  },
  {
    key: 'nextWeek',
    label: 'Próxima Semana',
    icon: ChevronRight,
    keys: ['→', 'Shift+→'],
    category: 'navigation',
    description: 'Navega para a próxima semana',
  },

  // View Modes
  {
    key: 'dayView',
    label: 'Visualização Diária',
    icon: Calendar,
    keys: ['D'],
    category: 'navigation',
    description: 'Visualiza agendamentos do dia',
  },
  {
    key: 'weekView',
    label: 'Visualização Semanal',
    icon: Layers,
    keys: ['W'],
    category: 'navigation',
    description: 'Visualiza agendamentos da semana',
  },
  {
    key: 'monthView',
    label: 'Visualização Mensal',
    icon: Calendar,
    keys: ['M'],
    category: 'navigation',
    description: 'Visualiza agendamentos do mês',
  },

  // Actions
  {
    key: 'newAppointment',
    label: 'Novo Agendamento',
    icon: Plus,
    keys: ['N'],
    category: 'actions',
    description: 'Criar um novo agendamento',
  },
  {
    key: 'selectionMode',
    label: 'Modo de Seleção',
    icon: CheckSquare,
    keys: ['A'],
    category: 'actions',
    description: 'Ativar/desativar modo de seleção múltipla',
  },

  // Editing
  {
    key: 'editAppointment',
    label: 'Editar Agendamento',
    icon: FileText,
    keys: ['E'],
    category: 'editing',
    description: 'Editar o agendamento selecionado',
  },
  {
    key: 'deleteAppointment',
    label: 'Excluir Agendamento',
    icon: Trash2,
    keys: ['Delete', 'Backspace'],
    category: 'editing',
    description: 'Excluir o(s) agendamento(s) selecionado(s)',
  },

  // Search
  {
    key: 'search',
    label: 'Buscar Paciente',
    icon: Search,
    keys: ['F', 'Ctrl+F', 'Cmd+F'],
    category: 'search',
    description: 'Focar na busca de pacientes',
  },

  // General
  {
    key: 'close',
    label: 'Fechar / Cancelar',
    icon: X,
    keys: ['Escape'],
    category: 'actions',
    description: 'Fechar modal ou cancelar ação',
  },
  {
    key: 'help',
    label: 'Ver Atalhos',
    icon: HelpCircle,
    keys: ['/', '?'],
    category: 'actions',
    description: 'Mostrar esta lista de atalhos',
  },
  {
    key: 'settings',
    label: 'Configurações',
    icon: SettingsIcon,
    keys: ['Ctrl+,', 'Cmd+,', 'S'],
    category: 'actions',
    description: 'Abrir configurações da agenda',
  },
];

const CATEGORY_COLORS = {
  navigation: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  actions: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  editing: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  search: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

interface KeyboardShortcutsEnhancedProps {
  open: boolean;
  onClose: () => void;
}

const KeyboardShortcutsEnhanced = memo(({
  open,
  onClose
}: KeyboardShortcutsEnhancedProps) => {
  // Executar ação quando uma tecla é pressionada
  const handleShortcutAction = useCallback((shortcutKey: string) => {
    // Disparar feedback háptico
    if ('vibrate' in navigator && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Dispatch custom event para que o componente pai possa ouvir
    const event = new CustomEvent('keyboard-shortcut', {
      detail: { shortcut: shortcutKey }
    });
    window.dispatchEvent(event);

    onClose();
  }, [onClose]);

  // Agrupar atalhos por categoria
  const navigationShortcuts = SHORTCUTS.filter(s => s.category === 'navigation');
  const actionsShortcuts = SHORTCUTS.filter(s => s.category === 'actions');
  const editingShortcuts = SHORTCUTS.filter(s => s.category === 'editing');
  const searchShortcuts = SHORTCUTS.filter(s => s.category === 'search');

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:right-1/2 md:bottom-1/2
            md:max-w-md md:max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Atalhos de Teclado
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Atalhos globais disponíveis na agenda
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/** Navigation Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Navegação
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {navigationShortcuts.map(shortcut => (
                      <button
                        key={shortcut.key}
                        onClick={() => handleShortcutAction(shortcut.key)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95',
                          'flex flex-col items-start gap-3 text-left',
                          CATEGORY_COLORS[shortcut.category]
                        )}
                      >
                        <shortcut.icon className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {shortcut.label}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {shortcut.keys.map(key => (
                              <kbd
                                key={key}
                                className="font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/** Actions Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Ações
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {actionsShortcuts.map(shortcut => (
                      <button
                        key={shortcut.key}
                        onClick={() => handleShortcutAction(shortcut.key)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95',
                          'flex flex-col items-start gap-3 text-left',
                          CATEGORY_COLORS[shortcut.category]
                        )}
                      >
                        <shortcut.icon className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {shortcut.label}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {shortcut.keys.map(key => (
                              <kbd
                                key={key}
                                className="font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/** Editing Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Edição
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {editingShortcuts.map(shortcut => (
                      <button
                        key={shortcut.key}
                        onClick={() => handleShortcutAction(shortcut.key)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95',
                          'flex flex-col items-start gap-3 text-left',
                          CATEGORY_COLORS[shortcut.category]
                        )}
                      >
                        <shortcut.icon className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {shortcut.label}
                          </div>
                          {shortcut.description && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {shortcut.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {shortcut.keys.map(key => (
                              <kbd
                                key={key}
                                className="font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/** Search Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Busca
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {searchShortcuts.map(shortcut => (
                      <button
                        key={shortcut.key}
                        onClick={() => handleShortcutAction(shortcut.key)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all hover:scale-105 active:scale-95',
                          'flex flex-col items-start gap-3 text-left',
                          CATEGORY_COLORS[shortcut.category]
                        )}
                      >
                        <shortcut.icon className="w-6 h-6 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {shortcut.label}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {shortcut.keys.map(key => (
                              <kbd
                                key={key}
                                className="font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    <kbd className="font-mono px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded">ESC</kbd> para fechar
                  </p>
                </div>
              </div>
            </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

KeyboardShortcutsEnhanced.displayName = 'KeyboardShortcutsEnhanced';

export { KeyboardShortcutsEnhanced, SHORTCUTS };
