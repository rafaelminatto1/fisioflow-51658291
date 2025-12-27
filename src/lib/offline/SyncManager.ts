// Gerenciador de sincronização offline
import { dbStore } from './IndexedDBStore';
import { supabase } from '@/integrations/supabase/client';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export class SyncManager {
  private isSyncing = false;
  private syncListeners: Array<(result: SyncResult) => void> = [];

  constructor() {
    // Inicializar IndexedDB
    dbStore.init().catch(console.error);

    // Sincronizar quando voltar online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.sync();
      });
    }
  }

  /**
   * Adiciona listener para eventos de sincronização
   */
  onSync(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifica listeners sobre resultado de sincronização
   */
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach((listener) => listener(result));
  }

  /**
   * Sincroniza dados pendentes
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, errors: ['Sincronização já em andamento'] };
    }

    if (!navigator.onLine) {
      return { success: false, synced: 0, failed: 0, errors: ['Sem conexão com internet'] };
    }

    this.isSyncing = true;

    try {
      const queue = await dbStore.getSyncQueue();
      const result: SyncResult = {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };

      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await dbStore.updateSyncQueueItem(item.id, { status: 'completed', completed_at: new Date().toISOString() });
          result.synced++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(errorMessage);
          result.failed++;

          // Incrementar retry count
          const retryCount = (item.retry_count || 0) + 1;
          if (retryCount < 3) {
            await dbStore.updateSyncQueueItem(item.id, {
              retry_count: retryCount,
              last_retry_at: new Date().toISOString(),
            });
          } else {
            // Marcar como falha permanente após 3 tentativas
            await dbStore.updateSyncQueueItem(item.id, {
              status: 'failed',
              error_message: errorMessage,
            });
          }
        }
      }

      this.notifyListeners(result);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Processa um item da fila de sincronização
   */
  private async processSyncItem(item: any): Promise<void> {
    const { type, action, store, data } = item;

    switch (type) {
      case 'patient':
        if (action === 'create') {
          await supabase.from('patients').insert(data);
        } else if (action === 'update') {
          await supabase.from('patients').update(data).eq('id', data.id);
        } else if (action === 'delete') {
          await supabase.from('patients').delete().eq('id', data.id);
        }
        break;

      case 'appointment':
        if (action === 'create') {
          await supabase.from('appointments').insert(data);
        } else if (action === 'update') {
          await supabase.from('appointments').update(data).eq('id', data.id);
        } else if (action === 'delete') {
          await supabase.from('appointments').delete().eq('id', data.id);
        }
        break;

      case 'session':
        if (action === 'create') {
          await supabase.from('sessions').insert(data);
        } else if (action === 'update') {
          await supabase.from('sessions').update(data).eq('id', data.id);
        }
        break;

      default:
        throw new Error(`Tipo de sincronização não suportado: ${type}`);
    }
  }

  /**
   * Cacheia dados críticos para uso offline
   */
  async cacheCriticalData(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      // Cache de pacientes do dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .eq('status', 'scheduled');

      if (appointments) {
        // Extrair pacientes únicos
        const patients = appointments
          .map((apt: any) => apt.patients)
          .filter((p: any, index: number, self: any[]) => self.findIndex((x: any) => x?.id === p?.id) === index);

        await dbStore.putAll('patients', patients);
        await dbStore.putAll('appointments', appointments);
      }

      // Cache de exercícios prescritos
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .limit(100);

      if (exercises) {
        await dbStore.putAll('exercises', exercises);
      }
    } catch (error) {
      console.error('Erro ao cachear dados críticos:', error);
    }
  }

  /**
   * Obtém dados do cache offline
   */
  async getCachedData<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
    return dbStore.getAll<T>(storeName, indexName, query);
  }

  /**
   * Adiciona operação à fila de sincronização
   */
  async queueOperation(
    type: string,
    action: 'create' | 'update' | 'delete',
    store: string,
    data: any
  ): Promise<void> {
    await dbStore.addToSyncQueue({
      type,
      action,
      store,
      data,
      timestamp: new Date().toISOString(),
    });

    // Tentar sincronizar imediatamente se online
    if (navigator.onLine) {
      this.sync().catch(console.error);
    }
  }
}

// Instância singleton
export const syncManager = new SyncManager();

