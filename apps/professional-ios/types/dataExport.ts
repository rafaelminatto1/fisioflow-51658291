import { AuditLogEntry } from './audit';
import { Consent } from './consent';

export type ExportFormat = 'json' | 'pdf';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface DataExportRequest {
  id: string;
  userId: string;
  format: ExportFormat;
  options: ExportOptions;
  status: ExportStatus;
  requestedAt: Date;
  completedAt?: Date;
  expiresAt?: Date; // 7 days after completion
  downloadUrl?: string;
  encryptionPassword?: string; // Hashed
  fileSize?: number;
  error?: string;
}

export interface ExportOptions {
  includePatients: boolean;
  includeSOAPNotes: boolean;
  includePhotos: boolean;
  includeProtocols: boolean;
  includeExercises: boolean;
  includeAppointments: boolean;
  includeAuditLog: boolean;
  includeConsents: boolean;
}

export interface ExportedData {
  exportId: string;
  exportedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
  patients?: any[];
  soapNotes?: any[];
  photos?: any[];
  protocols?: any[];
  exercises?: any[];
  appointments?: any[];
  auditLog?: AuditLogEntry[];
  consents?: Consent[];
}
