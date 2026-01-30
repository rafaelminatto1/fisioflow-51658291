import { db } from '@/integrations/firebase/app';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import type { ConductTemplate } from '@/types/evolution';
import { logger } from '@/lib/errors/logger';

export interface ConductData {
  plan?: string;
  techniques?: string[];
  exercises?: string[];
  recommendations?: string;
  [key: string]: unknown;
}

export class ConductReplicationService {
  // Optimized: Select only required columns instead of *
  static async getSavedConducts(patientId: string): Promise<ConductTemplate[]> {
    // For now, we'll get recent SOAP records as conduct templates
    const q = query(
      collection(db, 'soap_records'),
      where('patient_id', '==', patientId),
      where('plan', '!=', null),
      orderBy('record_date', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(recordSnap => {
      const data = recordSnap.data();
      return {
        id: recordSnap.id,
        patient_id: data.patient_id,
        template_name: `Conduta de ${data.record_date}`,
        conduct_data: {
          plan: data.plan || '',
          techniques: [],
          exercises: [],
          recommendations: data.assessment || ''
        },
        created_by: data.created_by,
        created_at: data.created_at
      } as ConductTemplate;
    });
  }

  static async saveConductAsTemplate(
    patientId: string,
    conduct: ConductData,
    name: string
  ): Promise<ConductTemplate> {
    // This would ideally save to a separate templates table
    // For now, we'll return a formatted template
    const template: ConductTemplate = {
      id: `template_${Date.now()}`,
      patient_id: patientId,
      template_name: name,
      conduct_data: conduct,
      created_by: '', // Will be filled by the calling function
      created_at: new Date().toISOString()
    };

    return template;
  }

  static async replicateConduct(conductId: string): Promise<{ plan: string | null; assessment: string | null; techniques: unknown[]; exercises: unknown[] }> {
    const docRef = doc(db, 'soap_records', conductId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('SOAP record not found');
    }

    const data = docSnap.data();

    return {
      plan: data.plan,
      assessment: data.assessment,
      techniques: [],
      exercises: []
    };
  }

  static async deleteConduct(conductId: string): Promise<void> {
    // For now, this is a no-op since we're using SOAP records
    // In a full implementation, this would delete from a templates table
    logger.debug('Delete conduct template', { conductId }, 'conductReplicationService');
  }
}
