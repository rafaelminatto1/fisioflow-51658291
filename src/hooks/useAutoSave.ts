import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  maxDelay?: number; // Tempo máximo entre saves mesmo com atividade contínua
  enabled?: boolean;
  showToasts?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 3000,
  maxDelay = 30000, // 30 segundos por padrão para save forçado
  enabled = true,
  showToasts = false // Disabled by default for auto-save
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();
  const lastSaveTimeRef = useRef<number>(Date.now());
  const isSavingRef = useRef(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const save = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;

    const currentData = JSON.stringify(data);

    // Não salvar se não mudou
    if (currentData === lastSavedRef.current) {
      lastSaveTimeRef.current = Date.now(); // Resetar tempo se não houve mudança
      return;
    }

    try {
      isSavingRef.current = true;
      await onSave(data);
      lastSavedRef.current = currentData;
      lastSaveTimeRef.current = Date.now();
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
      // Só mostrar toast de erro se não for erro de rede temporário (opcional)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar automaticamente. Tente salvar manualmente.',
        variant: 'destructive'
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, enabled, toast, showToasts]);

  // Efeito para save por inatividade
  useEffect(() => {
    if (!enabled) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agendar novo save por inatividade
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  // Efeito para save forçado periódico (maxDelay)
  useEffect(() => {
    if (!enabled || !maxDelay) return;

    const interval = setInterval(() => {
      const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
      if (timeSinceLastSave >= maxDelay) {
        save();
      }
    }, Math.min(maxDelay / 2, 5000)); // Checar a cada 5s ou metade do maxDelay

    return () => clearInterval(interval);
  }, [enabled, maxDelay, save]);

  return { save, lastSavedAt };
}
