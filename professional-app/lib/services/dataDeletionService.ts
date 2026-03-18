import { fetchApi } from '@/lib/api';
import { fisioLogger } from '../errors/logger';
import { auditLogger } from './auditLogger';
import { DataDeletionRequest } from '@/types/dataDeletion';

class DataDeletionService {
  private static instance: DataDeletionService;

  private constructor() {}

  static getInstance(): DataDeletionService {
    if (!DataDeletionService.instance) {
      DataDeletionService.instance = new DataDeletionService();
    }
    return DataDeletionService.instance;
  }

  async getDeletionStatus(userId: string): Promise<DataDeletionRequest | null> {
    try {
      const data = await fetchApi<DataDeletionRequest>(`/api/users/${userId}/deletion-status`);
      return data;
    } catch {
      return null;
    }
  }

  async requestDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      const data = await fetchApi<DataDeletionRequest>(`/api/users/${userId}/delete`, {
        method: 'POST',
        data: { reason }
      });

      await auditLogger.logEvent({
        userId,
        action: 'delete',
        resourceType: 'auth',
        details: { reason }
      });
      
      return data;
    } catch (error) {
      fisioLogger.error('Account deletion request failed', error, 'DataDeletionService');
      throw error;
    }
  }

  async cancelDeletion(requestId: string, userId: string): Promise<void> {
    try {
      await fetchApi(`/api/users/${userId}/cancel-deletion`, {
        method: 'POST'
      });
    } catch (error) {
      fisioLogger.error('Cancel deletion request failed', error, 'DataDeletionService');
      throw error;
    }
  }

  async requestAccountDeletion(reason?: string): Promise<void> {
    try {
      const user = await authApi.getMe();
      if (!user) throw new Error('Not authenticated');
      await this.requestDeletion(user.id, reason);
      await authApi.logout();
    } catch (error) {
      fisioLogger.error('Account deletion request failed', error, 'DataDeletionService');
      throw error;
    }
  }
}

export const dataDeletionService = DataDeletionService.getInstance();
