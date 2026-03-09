import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

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
    return {
      os: Platform.OS,
      osVersion: Platform.Version.toString(),
      model: Device.modelName || 'Unknown',
      appVersion: Application.nativeApplicationVersion || 'Unknown',
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
}

export const auditLogger = new AuditLogger();
