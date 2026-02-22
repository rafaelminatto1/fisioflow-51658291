import { DeviceInfo } from './legal';

export type AuditAction = 
  | 'login' 
  | 'logout' 
  | 'view' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'export'
  | 'consent-granted'
  | 'consent-withdrawn'
  | 'settings-changed';

export type AuditResourceType = 
  | 'patient' 
  | 'soap_note' 
  | 'photo' 
  | 'protocol' 
  | 'exercise'
  | 'appointment'
  | 'settings'
  | 'consent';

export interface AuditLogEntry {
  id: string;
  userId: string;
  timestamp: Date;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  deviceInfo: DeviceInfo;
  ipAddress?: string;
  metadata?: Record<string, any>;
  // Immutable - no update or delete operations allowed
}

export interface AuditLogQuery {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  actions?: AuditAction[];
  resourceTypes?: AuditResourceType[];
  limit?: number;
  offset?: number;
}
