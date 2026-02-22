/**
 * BackgroundSync - Serviço de sincronização em segundo plano
 *
 * Performance: Sincroniza dados offline automaticamente
 * - Service Worker registration
 * - Background Sync API
 * - Queue de operações offline
 * - Retry com backoff exponencial
 * - Notificações de progresso
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export type SyncOperation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'success' | 'error';
  error?: string;
};

interface BackgroundSyncOptions {
  enabled?: boolean;
  syncInterval?: number; // ms
  maxRetries?: number;
  retryDelay?: number; // ms initial delay
  onSyncStart?: () => void;
  onSyncComplete?: (operations: SyncOperation[]) => void;
  onSyncError?: (error: Error) => void;
}

interface BackgroundSyncState {
  isOnline: boolean;
  pendingOperations: number;
  syncing: boolean;
  lastSyncTime: Date | null;
  syncProgress: number;
}

export const useBackgroundSync = (options: BackgroundSyncOptions = {}) => {
  const {
    enabled = true,
    syncInterval = 30000, // 30 segundos
    maxRetries = 3,
    retryDelay = 1000,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [state, setState] = useState<BackgroundSyncState>({
    isOnline: navigator.onLine,
    pendingOperations: 0,
    syncing: false,
    lastSyncTime: null,
    syncProgress: 0,
  });

  const syncQueueRef = useRef<SyncOperation[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Carregar operações pendentes do localStorage
  const loadPendingOperations = useCallback(() => {
    try {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        syncQueueRef.current = JSON.parse(stored);
        setState(prev => ({ ...prev, pendingOperations: syncQueueRef.current.length }));
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }, []);

  // Salvar operações no localStorage
  const savePendingOperations = useCallback(() => {
    try {
      localStorage.setItem('sync_queue', JSON.stringify(syncQueueRef.current));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }, []);

  // Adicionar operação à fila
  const queueOperation = useCallback((
    type: SyncOperation['type'],
    collection: string,
    data: any
  ) => {
    const operation: SyncOperation = {
      id: `${type}_${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      collection,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    syncQueueRef.current.push(operation);
    savePendingOperations();

    setState(prev => ({ ...prev, pendingOperations: syncQueueRef.current.length }));

    toast({
      title: 'Operação agendada',
      description: 'Sincronizando quando conectar...',
      variant: 'default',
    });

    return operation.id;
  }, [savePendingOperations]);

  // Executar operação individual
  const executeOperation = useCallback(async (
    operation: SyncOperation
  ): Promise<boolean> => {
    try {
      // Simular chamada API - substituir por chamada real
      // switch (operation.type) {
      //   case 'create':
      //     await addDoc(collection(db, operation.collection), operation.data);
      //     break;
      //   case 'update':
      //     await updateDoc(doc(db, operation.collection, operation.data.id), operation.data);
      //     break;
      //   case 'delete':
      //     await deleteDoc(doc(db, operation.collection, operation.data.id));
      //     break;
      // }

      // Simulação para teste
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error('Failed to execute operation:', operation.id, error);
      throw error;
    }
  }, []);

  // Processar fila de sincronização
  const processQueue = useCallback(async () => {
    if (!enabled || !state.isOnline || state.syncing) return;

    const pendingOps = syncQueueRef.current.filter(op => op.status === 'pending');
    if (pendingOps.length === 0) return;

    setState(prev => ({ ...prev, syncing: true, syncProgress: 0 }));
    onSyncStart?.();

    abortControllerRef.current = new AbortController();

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pendingOps.length; i++) {
      if (abortControllerRef.current.signal.aborted) break;

      const operation = pendingOps[i];

      try {
        operation.status = 'syncing';
        syncQueueRef.current = [...syncQueueRef.current];
        savePendingOperations();

        await executeOperation(operation);

        operation.status = 'success';
        successCount++;

        // Remover operação bem-sucedida
        syncQueueRef.current = syncQueueRef.current.filter(op => op.id !== operation.id);

      } catch (error) {
        operation.retries++;
        if (operation.retries >= maxRetries) {
          operation.status = 'error';
          operation.error = error instanceof Error ? error.message : 'Unknown error';
          errorCount++;
        } else {
          operation.status = 'pending';
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * Math.pow(2, operation.retries))
          );
        }
      }

      savePendingOperations();
      setState(prev => ({
        ...prev,
        syncProgress: Math.round(((i + 1) / pendingOps.length) * 100),
        pendingOperations: syncQueueRef.current.length,
      }));
    }

    setState(prev => ({
      ...prev,
      syncing: false,
      lastSyncTime: new Date(),
    }));

    savePendingOperations();

    onSyncComplete?.(syncQueueRef.current);

    if (successCount > 0) {
      toast({
        title: 'Sincronização completa',
        description: `${successCount} operação(ões) sincronizada(s)`,
        variant: 'default',
      });
    }

    if (errorCount > 0) {
      toast({
        title: 'Erro na sincronização',
        description: `${errorCount} operação(ões) falhou(falharam)`,
        variant: 'destructive',
      });
    }

    abortControllerRef.current = null;
  }, [enabled, state.isOnline, state.syncing, maxRetries, retryDelay, executeOperation, savePendingOperations, onSyncStart, onSyncComplete]);

  // Iniciar timer de sincronização
  useEffect(() => {
    if (!enabled) return;

    syncTimerRef.current = setInterval(() => {
      if (state.isOnline && syncQueueRef.current.length > 0) {
        processQueue();
      }
    }, syncInterval);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [enabled, state.isOnline, syncInterval, processQueue]);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast({
        title: 'Conexão restaurada',
        description: 'Sincronizando dados...',
        variant: 'default',
      });
      processQueue();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast({
        title: 'Modo offline',
        description: 'As alterações serão salvas localmente',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  // Inicialização
  useEffect(() => {
    loadPendingOperations();
  }, [loadPendingOperations]);

  // Limpar operações com erro antigas (mais de 24h)
  const cleanupOldErrors = useCallback(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    syncQueueRef.current = syncQueueRef.current.filter(
      op => !(op.status === 'error' && op.timestamp < oneDayAgo)
    );
    savePendingOperations();
    setState(prev => ({ ...prev, pendingOperations: syncQueueRef.current.length }));
  }, [savePendingOperations]);

  return {
    ...state,
    queueOperation,
    syncNow: processQueue,
    cleanupOldErrors,
    clearQueue: () => {
      syncQueueRef.current = [];
      savePendingOperations();
      setState(prev => ({ ...prev, pendingOperations: 0 }));
    },
  };
};

// Componente provider para contexto global
interface BackgroundSyncProviderProps {
  children: React.ReactNode;
  options?: BackgroundSyncOptions;
}

export const BackgroundSyncProvider = ({ children, options }: BackgroundSyncProviderProps) => {
  return <>{children}</>; // Contexto pode ser adicionado se necessário
};

// Hook simplificado para uso em componentes individuais
export const useOfflineQueue = () => {
  return useBackgroundSync();
};

// Função utilitária para registrar service worker (opcional)
export const registerSyncServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Solicitar permissão para notificações
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      return registration;
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  }
  return null;
};
