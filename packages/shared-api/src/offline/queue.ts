import { nanoid } from 'nanoid';
import { addPendingOperation, removePendingOperation, getPendingOperations } from './storage';

export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'patch';

export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  collection: string;
  documentId?: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: OperationStatus;
  error?: string;
}

/**
 * Sync Queue for offline-first operations
 */
class SyncQueue {
  private isProcessing = false;

  /**
   * Add an operation to the sync queue
   */
  async add(
    type: OperationType,
    collection: string,
    data: any,
    documentId?: string
  ): Promise<string> {
    const operation: QueuedOperation = {
      id: nanoid(),
      type,
      collection,
      documentId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await addPendingOperation(operation);
    return operation.id;
  }

  /**
   * Process all pending operations in the queue
   */
  async process(
    executor: (operation: QueuedOperation) => Promise<void>
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    if (this.isProcessing) {
      console.log('SyncQueue: Already processing, skipping');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isProcessing = true;

    try {
      const operations = await getPendingOperations();
      const pending = operations.filter(op => op.status === 'pending');

      if (pending.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      console.log(`SyncQueue: Processing ${pending.length} operations`);

      let succeeded = 0;
      let failed = 0;

      for (const operation of pending) {
        try {
          await executor(operation);
          await removePendingOperation(operation.id);
          succeeded++;
        } catch (error) {
          console.error(`SyncQueue: Failed to process operation ${operation.id}:`, error);
          failed++;
        }
      }

      return {
        processed: pending.length,
        succeeded,
        failed,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear all operations from the queue
   */
  async clear(): Promise<void> {
    const { clearPendingOperations } = await import('./storage');
    await clearPendingOperations();
  }

  /**
   * Get the number of pending operations
   */
  async getPendingCount(): Promise<number> {
    const operations = await getPendingOperations();
    return operations.filter(op => op.status === 'pending').length;
  }

  /**
   * Check if there are any pending operations
   */
  async hasPendingOperations(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count > 0;
  }

  /**
   * Retry failed operations
   */
  async retryFailed(
    executor: (operation: QueuedOperation) => Promise<void>
  ): Promise<void> {
    const operations = await getPendingOperations();
    const failed = operations.filter(op => op.status === 'failed');

    for (const operation of failed) {
      operation.status = 'pending';
      operation.retryCount++;
      await addPendingOperation(operation);
    }

    await this.process(executor);
  }
}

export const syncQueue = new SyncQueue();

/**
 * Helper functions for common operations
 */

export async function queueCreate(
  collection: string,
  data: any
): Promise<string> {
  return syncQueue.add('create', collection, data);
}

export async function queueUpdate(
  collection: string,
  documentId: string,
  data: any
): Promise<string> {
  return syncQueue.add('update', collection, data, documentId);
}

export async function queuePatch(
  collection: string,
  documentId: string,
  data: any
): Promise<string> {
  return syncQueue.add('patch', collection, data, documentId);
}

export async function queueDelete(
  collection: string,
  documentId: string
): Promise<string> {
  return syncQueue.add('delete', collection, null, documentId);
}

export async function processPendingSync(
  executor: (operation: QueuedOperation) => Promise<void>
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  return syncQueue.process(executor);
}

export async function getPendingOperationsCount(): Promise<number> {
  return syncQueue.getPendingCount();
}

export async function hasPendingSync(): Promise<boolean> {
  return syncQueue.hasPendingOperations();
}

export async function clearSyncQueue(): Promise<void> {
  return syncQueue.clear();
}
