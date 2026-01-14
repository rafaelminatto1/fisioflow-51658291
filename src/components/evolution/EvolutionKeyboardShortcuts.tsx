/**
 * EvolutionKeyboardShortcuts - Atalhos de teclado específicos para página de Evolução
 *
 * Atalhos disponíveis:
 * - Ctrl/Cmd + S: Salvar evolução
 * - Ctrl/Cmd + Enter: Concluir sessão
 * - 1-4: Navegar entre campos SOAP
 * - Ctrl/Cmd + K: Buscar paciente
 * - Alt + T: Abrir templates
 * - Alt + M: Ir para medições
 * - Alt + H: Ver histórico
 * - ?: Mostrar ajuda
 */

import React, { memo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard, FileText, Save, CheckCircle, Search, Clock, Activity, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItemProps {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
  category?: string;
}

const ShortcutItem = memo(({ keys, description, icon }: ShortcutItemProps) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex items-center gap-2 flex-1">
      {icon}
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-xs text-muted-foreground mx-1">+</span>}
          <kbd
            className={cn(
              "min-w-[24px] px-2 py-1 text-xs font-medium",
              "bg-muted border border-border rounded-md",
              "text-foreground shadow-sm",
              "font-mono"
            )}
          >
            {key}
          </kbd>
        </span>
      ))}
    </div>
  </div>
));

ShortcutItem.displayName = 'ShortcutItem';

interface EvolutionKeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = {
  saving: {
    label: 'Salvar',
    icon: <Save className="h-4 w-4 text-green-500" />,
    items: [
      { keys: ['Ctrl', 'S'], description: 'Salvar evolução', icon: <Save className="h-3 w-3" /> },
      { keys: ['⌘', 'S'], description: 'Salvar evolução (Mac)', icon: <Save className="h-3 w-3" /> },
    ]
  },
  completion: {
    label: 'Concluir',
    icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Concluir sessão', icon: <CheckCircle className="h-3 w-3" /> },
      { keys: ['⌘', 'Enter'], description: 'Concluir sessão (Mac)', icon: <CheckCircle className="h-3 w-3" /> },
    ]
  },
  navigation: {
    label: 'Navegação',
    icon: <FileText className="h-4 w-4 text-purple-500" />,
    items: [
      { keys: ['1'], description: 'Ir para Subjetivo', icon: <span className="w-4 h-4 text-[10px] font-bold flex items-center justify-center bg-blue-500 text-white rounded">S</span> },
      { keys: ['2'], description: 'Ir para Objetivo', icon: <span className="w-4 h-4 text-[10px] font-bold flex items-center justify-center bg-green-500 text-white rounded">O</span> },
      { keys: ['3'], description: 'Ir para Avaliação', icon: <span className="w-4 h-4 text-[10px] font-bold flex items-center justify-center bg-purple-500 text-white rounded">A</span> },
      { keys: ['4'], description: 'Ir para Plano', icon: <span className="w-4 h-4 text-[10px] font-bold flex items-center justify-center bg-orange-500 text-white rounded">P</span> },
      { keys: ['Alt', 'M'], description: 'Ir para Medições', icon: <Activity className="h-3 w-3" /> },
      { keys: ['Alt', 'H'], description: 'Ver Histórico', icon: <Clock className="h-3 w-3" /> },
      { keys: ['Alt', 'T'], description: 'Abrir Templates', icon: <Search className="h-3 w-3" /> },
    ]
  },
  ai: {
    label: 'IA Assistant',
    icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    items: [
      { keys: ['Alt', 'A'], description: 'Abrir IA Assistant', icon: <Sparkles className="h-3 w-3" /> },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Salvar + Analisar com IA', icon: <Wand2 className="h-3 w-3" /> },
    ]
  },
  general: {
    label: 'Geral',
    icon: <Keyboard className="h-4 w-4 text-gray-500" />,
    items: [
      { keys: ['Ctrl', 'K'], description: 'Busca rápida', icon: <Search className="h-3 w-3" /> },
      { keys: ['Esc'], description: 'Fechar modal/dialog' },
      { keys: ['?'], description: 'Mostrar esta ajuda' },
    ]
  }
};

export const EvolutionKeyboardShortcuts = memo(({ open, onOpenChange }: EvolutionKeyboardShortcutsProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Atalhos de Teclado</DialogTitle>
              <DialogDescription>
                Ações rápidas para registro de evolução
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.values(SHORTCUTS).map((category) => (
            <div key={category.label}>
              <div className="flex items-center gap-2 mb-3">
                {category.icon}
                <h3 className="font-semibold text-sm">{category.label}</h3>
              </div>
              <div className="space-y-1 pl-6">
                {category.items.map((shortcut, index) => (
                  <ShortcutItem
                    key={index}
                    keys={shortcut.keys}
                    description={shortcut.description}
                    icon={shortcut.icon}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* SOAP color legend */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Cores SOAP:</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">S - Subjetivo</Badge>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">O - Objetivo</Badge>
            <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">A - Avaliação</Badge>
            <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">P - Plano</Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Pressione <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] mx-1">?</kbd> em qualquer lugar para abrir esta ajuda.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

EvolutionKeyboardShortcuts.displayName = 'EvolutionKeyboardShortcuts';

// Hook para gerenciar atalhos globais
/* eslint-disable-next-line react-refresh/only-export-components */
export const useEvolutionShortcuts = (
  onSave?: () => void,
  onComplete?: () => void,
  onNavigate?: (section: 'subjective' | 'objective' | 'assessment' | 'plan' | 'measurements' | 'history' | 'ai') => void,
  onOpenHelp?: () => void,
  onOpenTemplates?: () => void,
  onSaveAndAnalyze?: () => void
) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorar se estiver em um input/textarea (exceto se for Ctrl/Cmd)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      const isModifierKey = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + S para salvar
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl/Cmd + Shift + S para salvar e analisar com IA
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        onSaveAndAnalyze?.();
        return;
      }

      // Ctrl/Cmd + Enter para concluir
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onComplete?.();
        return;
      }

      // Se estiver digitando, não processar outros atalhos
      if (isInput && !isModifierKey) return;

      // ? para ajuda
      if (e.key === '?') {
        e.preventDefault();
        onOpenHelp?.();
        return;
      }

      // Navegação por número
      if (e.key === '1') onNavigate?.('subjective');
      if (e.key === '2') onNavigate?.('objective');
      if (e.key === '3') onNavigate?.('assessment');
      if (e.key === '4') onNavigate?.('plan');

      // Alt + M para medições
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        onNavigate?.('measurements');
      }

      // Alt + H para histórico
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        onNavigate?.('history');
      }

      // Alt + A para IA Assistant
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        onNavigate?.('ai');
      }

      // Alt + T para templates
      if (e.altKey && e.key === 't') {
        e.preventDefault();
        onOpenTemplates?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSave, onComplete, onNavigate, onOpenHelp, onOpenTemplates, onSaveAndAnalyze]);

  return null;
};

 
export type { EvolutionKeyboardShortcutsProps, ShortcutItemProps };
 
