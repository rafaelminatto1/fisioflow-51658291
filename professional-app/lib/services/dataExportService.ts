import { fetchApi } from '@/lib/api';
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
      const data = await fetchApi<any>('/api/export', {
        method: 'POST',
        data: {
           format: request.format,
           types: request.types,
           dateRange: request.dateRange ? {
               start: request.dateRange.start.toISOString(),
               end: request.dateRange.end.toISOString()
           } : undefined
        }
      });

      // Log export event
      // Note: we can get user ID from fetchApi result if needed, but for now assuming successful call
      // await auditLogger.logExport(userId, 'patient', request.format);
      
      return data;
    } catch (error) {
      fisioLogger.error('Export request failed', error, 'DataExportService');
      throw error;
    }
  }
}

export const dataExportService = DataExportService.getInstance();
