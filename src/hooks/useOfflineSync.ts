import { useEffect, useCallback, useState } from 'react';
import { offlineStorage } from '@/lib/services/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const syncPendingData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      const pending = await offlineStorage.getPendingSync<any>();

      if (pending.length === 0) return;

      console.log(`Sincronizando ${pending.length} itens pendentes...`);

      for (const item of pending) {
        try {
          const { table, operation, data } = item;

          switch (operation) {
            case 'insert':
              await supabase.from(table).insert(data);
              break;
            case 'update':
              await supabase.from(table).update(data).eq('id', data.id);
              break;
            case 'delete':
              await supabase.from(table).delete().eq('id', data.id);
              break;
          }

          await offlineStorage.clearPendingSync(item.id);
        } catch (error) {
          console.error('Erro ao sincronizar item:', error);
        }
      }

      // Invalidar cache do React Query
      queryClient.invalidateQueries();
      toast.success('Dados sincronizados com sucesso!');
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conectado! Sincronizando dados...');
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Modo offline. Suas alterações serão salvas localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicializar IndexedDB
    offlineStorage.init().catch(console.error);

    // Sincronizar ao carregar se estiver online
    if (isOnline) {
      syncPendingData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingData, isOnline]);

  return {
    isOnline,
    isSyncing,
    syncPendingData,
  };
};
