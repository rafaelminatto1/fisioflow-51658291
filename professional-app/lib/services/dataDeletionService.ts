import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';
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
      const token = await authApi.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`${config.apiUrl}/api/users/${userId}/deletion-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to get status');
      }
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  async requestDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      const token = await authApi.getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${config.apiUrl}/api/users/${userId}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (!res.ok) throw new Error('Failed to request account deletion');

      await auditLogger.logEvent({
        userId,
        action: 'delete',
        resourceType: 'auth',
        details: { reason }
      });
      
      return res.json();
    } catch (error) {
      fisioLogger.error('Account deletion request failed', error, 'DataDeletionService');
      throw error;
    }
  }

  async cancelDeletion(requestId: string, userId: string): Promise<void> {
    try {
      const token = await authApi.getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${config.apiUrl}/api/users/${userId}/cancel-deletion`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to cancel deletion');
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
