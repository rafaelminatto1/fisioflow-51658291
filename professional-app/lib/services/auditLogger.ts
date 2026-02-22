import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AuditLogEntry, AuditLogQuery, AuditAction, AuditResourceType } from '@/types/audit';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { DeviceInfo } from '@/types/legal';

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'deviceInfo'>): Promise<void> {
    try {
      const logsRef = collection(db, 'audit_logs');
      const deviceInfo = await this.getDeviceInfo();
      
      await addDoc(logsRef, {
        ...entry,
        deviceInfo,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      // Fail silently but log to console in dev
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string): Promise<void> {
    await this.log({
      userId,
      action: 'login',
      resourceType: 'settings', // Or create a more specific type
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string): Promise<void> {
    await this.log({
      userId,
      action: 'logout',
      resourceType: 'settings',
    });
  }

  /**
   * Log PHI access (view)
   */
  async logPHIAccess(
    userId: string,
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'view',
      resourceType,
      resourceId,
    });
  }

  /**
   * Log PHI modification (create, update, delete)
   */
  async logPHIModification(
    userId: string,
    action: 'create' | 'update' | 'delete',
    resourceType: AuditResourceType,
    resourceId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
    });
  }

  /**
   * Query audit log
   */
  async query(logQuery: AuditLogQuery): Promise<AuditLogEntry[]> {
    let q = query(
      collection(db, 'audit_logs'),
      where('userId', '==', logQuery.userId),
      orderBy('timestamp', 'desc'),
      limit(logQuery.limit || 50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
      } as AuditLogEntry;
    });
  }

  /**
   * Get device information using expo-device
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      model: Device.modelName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      platform: Device.osName === 'iOS' ? 'ios' : 'android' as any,
    };
  }
}

export const auditLogger = AuditLogger.getInstance();
