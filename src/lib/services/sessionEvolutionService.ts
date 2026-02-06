import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from '@/integrations/firebase/app';
import type { SessionEvolution } from '@/types/evolution';

export class SessionEvolutionService {
  static async calculateSessionNumber(patientId: string, recordDate: string): Promise<number> {
    const q = query(
      collection(db, 'soap_records'),
      where('patient_id', '==', patientId),
      where('record_date', '<', recordDate),
      orderBy('record_date', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.length + 1;
  }

  // Optimized: Select only required columns instead of *
  static async getSessionEvolution(sessionId: string): Promise<SessionEvolution | null> {
    const docRef = doc(db, 'soap_records', sessionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // Get test results for this session - optimized query
    const measurementsQ = query(
      collection(db, 'evolution_measurements'),
      where('soap_record_id', '==', sessionId)
    );
    const measurementsSnap = await getDocs(measurementsQ);

    const testResults = measurementsSnap.docs.map(m => {
      const mData = m.data();
      return {
        id: m.id,
        session_id: sessionId,
        patient_id: mData.patient_id,
        test_name: mData.measurement_name,
        test_type: mData.measurement_type,
        value: Number(mData.value),
        unit: mData.unit || undefined,
        notes: mData.notes || undefined,
        measured_by: mData.created_by,
        measured_at: mData.measured_at,
        created_at: mData.created_at
      };
    });

    const sessionNumber = await this.calculateSessionNumber(data.patient_id, data.record_date);

    return {
      id: docSnap.id,
      session_id: data.appointment_id || sessionId,
      patient_id: data.patient_id,
      session_date: data.record_date,
      session_number: sessionNumber,
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
    } as SessionEvolution;
  }

  static async saveSessionEvolution(data: SessionEvolutionFormData): Promise<SessionEvolution> {
    const now = new Date().toISOString();

    const soapRecordData = {
      patient_id: data.patient_id,
      appointment_id: data.session_id,
      record_date: data.session_date,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'soap_records'), soapRecordData);

    // Save test results if any
    if (data.test_results && data.test_results.length > 0) {
      const measurementsToInsert = data.test_results.map(tr => ({
        patient_id: data.patient_id,
        soap_record_id: docRef.id,
        measurement_name: tr.test_name,
        measurement_type: tr.test_type,
        value: tr.value,
        unit: tr.unit,
        notes: tr.notes,
        measured_at: tr.measured_at,
        created_by: tr.measured_by,
        created_at: now,
      }));

      for (const measurement of measurementsToInsert) {
        await addDoc(collection(db, 'evolution_measurements'), measurement);
      }
    }

    return this.getSessionEvolution(docRef.id) as Promise<SessionEvolution>;
  }

  static async updateSessionEvolution(sessionId: string, data: Partial<SessionEvolutionFormData>): Promise<SessionEvolution> {
    const docRef = doc(db, 'soap_records', sessionId);

    const updates: Partial<SessionEvolutionFormData & { updated_at: string }> = {};
    if (data.subjective !== undefined) updates.subjective = data.subjective;
    if (data.objective !== undefined) updates.objective = data.objective;
    if (data.assessment !== undefined) updates.assessment = data.assessment;
    if (data.plan !== undefined) updates.plan = data.plan;
    if (data.session_date !== undefined) updates.record_date = data.session_date;
    updates.updated_at = new Date().toISOString();

    await updateDoc(docRef, updates);

    return this.getSessionEvolution(sessionId) as Promise<SessionEvolution>;
  }

  static async deleteSessionEvolution(sessionId: string): Promise<void> {

    // Delete measurements first (cascade)
    const measurementsQ = query(
      collection(db, 'evolution_measurements'),
      where('soap_record_id', '==', sessionId)
    );
    const measurementsSnap = await getDocs(measurementsQ);

    for (const doc of measurementsSnap.docs) {
      await deleteDoc(doc.ref);
    }

    // Delete the SOAP record
    const docRef = doc(db, 'soap_records', sessionId);
    await deleteDoc(docRef);
  }

  static async getEvolutionsByPatientId(patientId: string): Promise<SessionEvolution[]> {
    const q = query(
      collection(db, 'soap_records'),
      where('patient_id', '==', patientId),
      orderBy('record_date', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);

    const evolutions = await Promise.all(
      snapshot.docs.map(async (docSnap, index) => {
        const evolution = await this.getSessionEvolution(docSnap.id);
        if (evolution) {
          evolution.session_number = snapshot.docs.length - index;
        }
        return evolution;
      })
    );

    return evolutions.filter(Boolean) as SessionEvolution[];
  }
}
