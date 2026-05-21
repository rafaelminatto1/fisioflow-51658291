import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  maxDelay = 30000, // Tempo máximo entre saves mesmo com atividade contínua
  enabled = true,
  showToasts = false,
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const _maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();
  const lastSaveTimeRef = useRef<number>(Date.now());
  const isSavingRef = useRef(false);
  const needsSaveRef = useRef(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (dataToSave: T = data) => {
      if (!enabled) return;

      if (isSavingRef.current) {
        needsSaveRef.current = true;
        return;
      }

      const currentData = JSON.stringify(dataToSave);

      // Não salvar se não mudou
      if (currentData === lastSavedRef.current) {
        lastSaveTimeRef.current = Date.now(); // Resetar tempo se não houve mudança
        return;
      }

      try {
        isSavingRef.current = true;
        setIsSaving(true);
        needsSaveRef.current = false;
        await onSaveRef.current(dataToSave);
        lastSavedRef.current = currentData;
        lastSaveTimeRef.current = Date.now();
        const now = new Date();
        setLastSavedAt(now);
        setIsDirty(false);

        // Only show toast if explicitly enabled
        if (showToasts) {
          const timeString = format(now, "HH:mm", { locale: ptBR });
          toast({
            title: "Salvo automaticamente",
            description: `Salvo às ${timeString}`,
            variant: "default",
          });
        }
      } catch (error) {
        // Distingue offline real de erro de servidor. Offline não merece toast
        // de erro — a fila offline (offlineSync) replicará o save depois.
        // Ref: navigator.onLine é hint, não verdade; TypeError de fetch é o
        // sinal real de "requisição nunca saiu do device".
        const err = error as Error;
        const isOffline =
          (typeof navigator !== "undefined" && navigator.onLine === false) ||
          (err instanceof TypeError && /fetch|network/i.test(err.message));
        logger.error("Erro no auto-save", err, "useAutoSave");
        if (!isOffline) {
          toast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar automaticamente. Tente salvar manualmente.",
            variant: "destructive",
          });
        }
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
        if (needsSaveRef.current) {
          save(dataRef.current);
        }
      }
    },
    [data, enabled, toast, showToasts],
  );

  // Detecta "dirty" comparando o snapshot atual ao último salvo.
  useEffect(() => {
    if (!enabled || lastSavedRef.current === undefined) return;
    setIsDirty(JSON.stringify(data) !== lastSavedRef.current);
  }, [data, enabled]);

  // Guard de saída: avisa o usuário se há mudanças pendentes não salvas.
  // Ref: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty || isSavingRef.current) {
        e.preventDefault();
        // Maioria dos browsers ignora a string, mas é exigida pelo spec antigo.
        e.returnValue = "Há alterações não salvas.";
        return e.returnValue;
      }
      return undefined;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, isDirty]);

  // Keep refs for unmount save
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    dataRef.current = data;
    onSaveRef.current = onSave;
    enabledRef.current = enabled;
  }, [data, onSave, enabled]);

  // Inicializa lastSavedRef com o primeiro dado carregado quando enabled passa a ser true
  useEffect(() => {
    if (enabled && lastSavedRef.current === undefined) {
      lastSavedRef.current = JSON.stringify(dataRef.current);
    }
  }, [enabled]);

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

  // Final save on unmount
  useEffect(() => {
    return () => {
      if (enabledRef.current) {
        const currentData = JSON.stringify(dataRef.current);
        if (currentData !== lastSavedRef.current) {
          onSaveRef.current(dataRef.current).catch((error) => {
            logger.error("Erro no auto-save (unmount)", error as Error, "useAutoSave");
          });
        }
      }
    };
  }, []);

  // Efeito para save forçado periódico (maxDelay)
  useEffect(() => {
    if (!enabled || !maxDelay) return;

    const interval = setInterval(
      () => {
        const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
        if (timeSinceLastSave >= maxDelay) {
          save();
        }
      },
      Math.min(maxDelay / 2, 5000),
    ); // Checar a cada 5s ou metade do maxDelay

    return () => clearInterval(interval);
  }, [enabled, maxDelay, save]);

  return { save, lastSavedAt, isDirty, isSaving };
}
