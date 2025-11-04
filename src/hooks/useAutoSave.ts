import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 3000,
  enabled = true
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    const currentData = JSON.stringify(data);
    
    // Não salvar se não mudou
    if (currentData === lastSavedRef.current) return;

    try {
      isSavingRef.current = true;
      await onSave(data);
      lastSavedRef.current = currentData;
      
      toast({
        title: 'Salvo automaticamente',
        description: 'Suas alterações foram salvas'
      });
    } catch (error) {
      logger.error('Erro no auto-save', error as Error, 'useAutoSave');
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar automaticamente. Tente salvar manualmente.',
        variant: 'destructive'
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, enabled, toast]);

  useEffect(() => {
    if (!enabled) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo save
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return { save };
}
