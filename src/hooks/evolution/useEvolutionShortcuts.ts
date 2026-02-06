import { useEffect } from 'react';

// Hook para gerenciar atalhos globais
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
