import { supabase } from '@/integrations/supabase/client';
import type { ConductTemplate } from '@/types/evolution';

export class ConductReplicationService {
  static async getSavedConducts(patientId: string): Promise<ConductTemplate[]> {
    // For now, we'll get recent SOAP records as conduct templates
    const { data, error } = await supabase
      .from('soap_records')
      .select('*')
      .eq('patient_id', patientId)
      .not('plan', 'is', null)
      .order('record_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      patient_id: record.patient_id,
      template_name: `Conduta de ${record.record_date}`,
      conduct_data: {
        plan: record.plan || '',
        techniques: [],
        exercises: [],
        recommendations: record.assessment || ''
      },
      created_by: record.created_by,
      created_at: record.created_at
    }));
  }

  static async saveConductAsTemplate(
    patientId: string,
    conduct: any,
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

  static async replicateConduct(conductId: string): Promise<any> {
    const { data, error } = await supabase
      .from('soap_records')
      .select('*')
      .eq('id', conductId)
      .single();

    if (error) throw error;

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
    console.log('Delete conduct template:', conductId);
  }
}
