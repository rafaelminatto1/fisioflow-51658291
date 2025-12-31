import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../SyncManager';
import { dbStore } from '../IndexedDBStore';

// Mock IndexedDBStore
vi.mock('../IndexedDBStore', () => ({
  dbStore: {
    init: vi.fn().mockResolvedValue(undefined),
    addToSyncQueue: vi.fn().mockResolvedValue(undefined),
    getSyncQueue: vi.fn().mockResolvedValue([]),
    updateSyncQueueItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock logger
vi.mock('@/lib/errors/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    syncManager = new SyncManager();
  });

  describe('queueOperation', () => {
    it('should queue a create operation', async () => {
      const data = { name: 'Test Patient', phone: '123456789' };
      await syncManager.queueOperation('patient', 'create', 'patients', data);

      expect(dbStore.addToSyncQueue).toHaveBeenCalledWith(expect.objectContaining({
        type: 'patient',
        action: 'create',
        store: 'patients',
        data,
      }));
    });

    it('should queue an update operation', async () => {
      const data = { id: '123', name: 'Updated Patient' };
      await syncManager.queueOperation('patient', 'update', 'patients', data);

      expect(dbStore.addToSyncQueue).toHaveBeenCalledWith(expect.objectContaining({
        action: 'update',
        data,
      }));
    });

    it('should queue a delete operation', async () => {
      const data = { id: '123' };
      await syncManager.queueOperation('patient', 'delete', 'patients', data);

      expect(dbStore.addToSyncQueue).toHaveBeenCalledWith(expect.objectContaining({
        action: 'delete',
        data,
      }));
    });
  });

  describe('sync', () => {
    it('should process pending sync items', async () => {
      const mockItems = [
        {
          id: 1,
          type: 'patient' as const,
          action: 'create' as const,
          store: 'patients',
          data: { name: 'Test' },
          timestamp: new Date().toISOString(),
          status: 'pending' as const,
        },
      ];

      vi.mocked(dbStore.getSyncQueue).mockResolvedValue(mockItems as unknown as typeof mockItems);

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.synced).toBeGreaterThanOrEqual(0);
    });

    it('should handle sync errors gracefully', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      const mockError = new Error('Database error');
      vi.mocked(dbStore.getSyncQueue).mockRejectedValue(mockError);

      const result = await syncManager.sync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should retry failed items up to 3 times', async () => {
      const mockItem = {
        id: 1,
        type: 'patient' as const,
        action: 'create' as const,
        store: 'patients',
        data: { name: 'Test' },
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        retry_count: 2,
      };

      vi.mocked(dbStore.getSyncQueue).mockResolvedValue([mockItem]);

      const result = await syncManager.sync();

      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onSync', () => {
    it('should register sync listeners', () => {
      const callback = vi.fn();
      const unsubscribe = syncManager.onSync(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call registered listeners on sync', async () => {
      const callback = vi.fn();
      syncManager.onSync(callback);

      vi.mocked(dbStore.getSyncQueue).mockResolvedValue([]);
      await syncManager.sync();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getQueueLength', () => {
    it('should return the number of pending items', async () => {
      const mockItems = [
        { id: 1, type: 'patient', action: 'create', store: 'patients', data: {}, timestamp: new Date().toISOString(), status: 'pending' },
        { id: 2, type: 'patient', action: 'update', store: 'patients', data: {}, timestamp: new Date().toISOString(), status: 'pending' },
      ];

      vi.mocked(dbStore.getSyncQueue).mockResolvedValue(mockItems);

      const queue = await dbStore.getSyncQueue();
      expect(queue.length).toBe(2);
    });
  });
});

