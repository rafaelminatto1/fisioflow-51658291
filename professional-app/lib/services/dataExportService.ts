import { authApi } from '@/lib/auth-api';
import { config } from '@/lib/config';
import { fisioLogger } from '../errors/logger';
import { auditLogger } from './auditLogger';

export type ExportFormat = 'json' | 'pdf' | 'csv';

export interface ExportRequest {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  types: ('appointments' | 'evolutions' | 'exercises' | 'profile')[];
}

class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  async requestExport(request: ExportRequest): Promise<{ status: string; url?: string }> {
    try {
      const user = await authApi.getMe();
      if (!user) throw new Error('Not authenticated');

      const token = await authApi.getToken();

      const res = await fetch(`${config.apiUrl}/api/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
           userId: user.id,
           format: request.format,
           types: request.types,
           dateRange: request.dateRange ? {
               start: request.dateRange.start.toISOString(),
               end: request.dateRange.end.toISOString()
           } : undefined
        })
      });

      if (!res.ok) {
        throw new Error('Falha ao solicitar exportação');
      }

      await auditLogger.logExport(user.id, 'patient', request.format);
      
      const data = await res.json();
      return data;
    } catch (error) {
      fisioLogger.error('Export request failed', error, 'DataExportService');
      throw error;
    }
  }
}

export const dataExportService = DataExportService.getInstance();
