import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Lazy import para evitar erros se expo-application não estiver instalado
let Application: any = null;
try {
  Application = require('expo-application');
} catch (e) {
  // expo-application não está instalado, usar fallback
}

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'print'
  | 'share';

export type ResourceType = 
  | 'patient'
  | 'evolution'
  | 'appointment'
  | 'financial'
  | 'report'
  | 'settings'
  | 'auth'
  | 'consent'
  | 'policy'
  | 'biometrics';

export interface AuditEvent {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  timestamp: string;
  deviceInfo: {
    os: string;
    osVersion: string;
    model: string;
    appVersion: string;
  };
  ipAddress?: string;
}

class AuditLogger {
  private async getDeviceInfo() {
    let model = 'Unknown';
    try {
      // Device.modelName pode ser null em alguns casos
      model = (await Device.modelName) || 'Unknown';
    } catch {
      model = Device.modelName || 'Unknown';
    }
    
    return {
      os: Platform.OS,
      osVersion: Platform.Version.toString(),
      model,
      appVersion: Application?.nativeApplicationVersion || '1.0.0',
    };
  }

  async logEvent(event: Omit<AuditEvent, 'timestamp' | 'deviceInfo'>): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const token = await authApi.getToken();
      
      const fullEvent: AuditEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        deviceInfo,
      };

      if (!token) {
        console.log('[AuditLogger] No token, skipping log (might be pre-login):', fullEvent.action);
        return;
      }

      await fetch(`${config.apiUrl}/api/audit/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fullEvent)
      });
    } catch (error) {
      console.error('[AuditLogger] Error logging event:', error);
      // Failsafe: don't crash the app if audit logging fails
    }
  }

  // Helper methods for common events
  async logPHIModification(
    userId: string, 
    action: 'create' | 'update' | 'delete', 
    resourceType: ResourceType, 
    resourceId: string, 
    changes?: Record<string, any>
  ) {
    return this.logEvent({
      userId,
      action,
      resourceType,
      resourceId,
      details: {
        isPHI: true,
        changes
      }
    });
  }

  async logPHIAccess(
    userId: string, 
    resourceType: ResourceType, 
    resourceId: string,
    purpose: string = 'treatment'
  ) {
    return this.logEvent({
      userId,
      action: 'view',
      resourceType,
      resourceId,
      details: {
        isPHI: true,
        purpose
      }
    });
  }

  async logLogin(userId: string) {
    return this.logEvent({
      userId,
      action: 'login',
      resourceType: 'auth'
    });
  }

  async logLogout(userId: string) {
    return this.logEvent({
      userId,
      action: 'logout',
      resourceType: 'auth'
    });
  }

  async logExport(userId: string, resourceType: ResourceType, format: string) {
    return this.logEvent({
      userId,
      action: 'export',
      resourceType,
      details: { format }
    });
  }

  async query(options: { userId: string; limit?: number }) {
    try {
      const token = await authApi.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch(`${config.apiUrl}/api/audit/logs?userId=${options.userId}&limit=${options.limit || 50}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.logs || [];
    } catch {
      return [];
    }
  }
}

export const auditLogger = new AuditLogger();
