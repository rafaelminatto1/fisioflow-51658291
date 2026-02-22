import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { DataExportRequest, ExportFormat, ExportOptions } from '@/types/dataExport';

export class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Request data export
   */
  async requestExport(
    userId: string,
    format: ExportFormat,
    options: ExportOptions
  ): Promise<DataExportRequest> {
    const exportRef = collection(db, 'data_exports');
    
    const requestData: Omit<DataExportRequest, 'id'> = {
      userId,
      format,
      options,
      status: 'pending',
      requestedAt: new Date(),
    };

    const docRef = await addDoc(exportRef, {
      ...requestData,
      requestedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...requestData,
    };
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<DataExportRequest | null> {
    const docRef = doc(db, 'data_exports', exportId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    return {
      id: snapshot.id,
      ...snapshot.data() as Omit<DataExportRequest, 'id'>,
    } as DataExportRequest;
  }

  /**
   * Generate JSON export (Simulation for client side, real implementation would be in Cloud Function)
   */
  async generateJSONExport(userId: string, options: ExportOptions): Promise<any> {
    // In a real implementation, this would trigger a Cloud Function
    // For now, let's return a message or skeleton
    console.log('JSON export requested for', userId);
    return {
       message: 'O processamento do seu arquivo JSON foi iniciado. Você receberá uma notificação quando estiver pronto.'
    };
  }

  /**
   * Generate PDF export
   */
  async generatePDFExport(userId: string, options: ExportOptions): Promise<string> {
    // In a real implementation, this would trigger a Cloud Function or use jsPDF locally
    console.log('PDF export requested for', userId);
    return 'PDF_EXPORT_URL_PLACEHOLDER';
  }
}

export const dataExportService = DataExportService.getInstance();
