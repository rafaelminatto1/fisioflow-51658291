import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
  showToasts?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 3000,
  enabled = true,
  showToasts = false // Disabled by default for auto-save
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();
  const isSavingRef = useRef(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const save = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    const currentData = JSON.stringify(data);

    // Não salvar se não mudou
    if (currentData === lastSavedRef.current) return;

    try {
      isSavingRef.current = true;
      await onSave(data);
      lastSavedRef.current = currentData;
      const now = new Date();
      setLastSavedAt(now);

      // Only show toast if explicitly enabled
      if (showToasts) {
        const timeString = format(now, 'HH:mm', { locale: ptBR });
        toast({
          title: 'Salvo automaticamente',
          description: `Salvo às ${timeString}`,
          variant: 'default',
        });
      }
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
  }, [data, onSave, enabled, toast, showToasts]);

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

  return { save, lastSavedAt };
}
