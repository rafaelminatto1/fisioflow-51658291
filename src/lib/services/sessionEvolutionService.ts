import { supabase } from '@/integrations/supabase/client';
import type { SessionEvolution, SessionEvolutionFormData } from '@/types/evolution';

export class SessionEvolutionService {
  static async getSessionEvolution(sessionId: string): Promise<SessionEvolution | null> {
    const { data, error } = await supabase
      .from('soap_records')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Get test results for this session
    const { data: measurements } = await supabase
      .from('evolution_measurements')
      .select('*')
      .eq('soap_record_id', sessionId);

    const testResults = (measurements || []).map(m => ({
      id: m.id,
      session_id: sessionId,
      patient_id: m.patient_id,
      test_name: m.measurement_name,
      test_type: m.measurement_type,
      value: Number(m.value),
      unit: m.unit || undefined,
      notes: m.notes || undefined,
      measured_by: m.created_by,
      measured_at: m.measured_at,
      created_at: m.created_at
    }));

    return {
      id: data.id,
      session_id: data.appointment_id || sessionId,
      patient_id: data.patient_id,
      session_date: data.record_date,
      session_number: 1, // TODO: Calculate based on patient history
      subjective: data.subjective || '',
      objective: data.objective || '',
      assessment: data.assessment || '',
      plan: data.plan || '',
      pain_level: undefined,
      evolution_notes: undefined,
      test_results: testResults,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  static async saveSessionEvolution(data: SessionEvolutionFormData): Promise<SessionEvolution> {
    const { data: soapRecord, error } = await supabase
      .from('soap_records')
      .insert({
        patient_id: data.patient_id,
        appointment_id: data.session_id,
        record_date: data.session_date,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        created_by: data.created_by
      })
      .select()
      .single();

    if (error) throw error;

    // Save test results if any
    if (data.test_results && data.test_results.length > 0) {
      const measurementsToInsert = data.test_results.map(tr => ({
        patient_id: data.patient_id,
        soap_record_id: soapRecord.id,
        measurement_name: tr.test_name,
        measurement_type: tr.test_type,
        value: tr.value,
        unit: tr.unit,
        notes: tr.notes,
        measured_at: tr.measured_at,
        created_by: tr.measured_by
      }));

      const { error: measurementsError } = await supabase
        .from('evolution_measurements')
        .insert(measurementsToInsert);

      if (measurementsError) throw measurementsError;
    }

    return this.getSessionEvolution(soapRecord.id) as Promise<SessionEvolution>;
  }

  static async updateSessionEvolution(sessionId: string, data: Partial<SessionEvolutionFormData>): Promise<SessionEvolution> {
    const updates: any = {};
    if (data.subjective !== undefined) updates.subjective = data.subjective;
    if (data.objective !== undefined) updates.objective = data.objective;
    if (data.assessment !== undefined) updates.assessment = data.assessment;
    if (data.plan !== undefined) updates.plan = data.plan;
    if (data.session_date !== undefined) updates.record_date = data.session_date;

    const { error } = await supabase
      .from('soap_records')
      .update(updates)
      .eq('id', sessionId);

    if (error) throw error;

    return this.getSessionEvolution(sessionId) as Promise<SessionEvolution>;
  }

  static async deleteSessionEvolution(sessionId: string): Promise<void> {
    // Delete measurements first (cascade)
    await supabase
      .from('evolution_measurements')
      .delete()
      .eq('soap_record_id', sessionId);

    const { error } = await supabase
      .from('soap_records')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  static async getEvolutionsByPatientId(patientId: string): Promise<SessionEvolution[]> {
    const { data, error } = await supabase
      .from('soap_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    const evolutions = await Promise.all(
      (data || []).map(async (record, index) => {
        const evolution = await this.getSessionEvolution(record.id);
        if (evolution) {
          evolution.session_number = data.length - index;
        }
        return evolution;
      })
    );

    return evolutions.filter(Boolean) as SessionEvolution[];
  }
}
