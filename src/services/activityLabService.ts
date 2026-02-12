import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';
import type { 
  ActivityLabPatient, 
  ActivityLabSession, 
  ActivityLabClinic 
} from '@/types/activityLab';

const PATIENTS_COLLECTION = 'patients';
const SESSIONS_COLLECTION = 'sessions';
const CLINIC_COLLECTION = 'clinic';

function mapPatient(id: string, data: any): ActivityLabPatient {
  return {
    id,
    full_name: data.full_name || data.name || '',
    birth_date: data.birth_date || data.birthDate || '',
    gender: data.gender || 'masculino',
    phone: data.phone || '',
    email: data.email || '',
    cpf: data.cpf || '',
    status: data.status || 'active',
    is_active: data.is_active ?? data.isActive ?? true,
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
    main_condition: data.main_condition || data.notes || '',
    organization_id: data.organization_id || 'default',
    incomplete_registration: !!data.incomplete_registration,
    source: 'activity_lab',
  };
}

function mapSession(id: string, data: any): ActivityLabSession {
  return {
    id,
    patient_id: data.patient_id || data.patientId,
    protocol_name: data.protocol_name || data.protocolName || data.exercise_name || 'Protocolo Desconhecido',
    body_part: data.body_part || data.bodyPart || data.muscle_group || 'N/A',
    side: data.side || 'LEFT',
    test_type: data.test_type || 'isometric',
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
    peak_force: data.peak_force ?? data.peakForce ?? data.max_force ?? 0,
    avg_force: data.avg_force ?? data.avgForce ?? data.mean_force ?? 0,
    duration: data.duration ?? 0,
    rfd: data.rfd ?? data.rateOfForceDevelopment ?? data.rate_of_force_development ?? 0,
    sensitivity: data.sensitivity ?? 3,
    raw_force_data: data.raw_force_data || data.rawForceData || [],
    sample_rate: data.sample_rate || data.sampleRate || 80,
    device_model: data.device_model || data.deviceModel || 'Tindeq',
    device_firmware: data.device_firmware || data.deviceFirmware || '',
    device_battery: data.device_battery ?? data.deviceBattery ?? 0,
    measurement_mode: data.measurement_mode || data.measurementMode || 'isometric',
    is_simulated: !!(data.is_simulated || data.isSimulated),
    notes: data.notes || '',
    organization_id: data.organization_id || 'default',
    source: 'activity_lab',
  };
}

export const activityLabService = {
  /**
   * Get all patients from Activity Lab
   */
  async getPatients(): Promise<ActivityLabPatient[]> {
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where('source', '==', 'activity_lab'),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapPatient(d.id, d.data()));
  },

  /**
   * Get a specific patient by ID
   */
  async getPatientById(id: string): Promise<ActivityLabPatient | null> {
    const ref = doc(db, PATIENTS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data()?.source !== 'activity_lab') return null;
    return mapPatient(snap.id, snap.data());
  },

  /**
   * Get all sessions for a specific patient
   */
  async getSessionsByPatient(patientId: string): Promise<ActivityLabSession[]> {
    // Attempt multiple possible fields for patient reference due to cross-compatibility
    const q = query(
      collection(db, SESSIONS_COLLECTION),
      where('source', '==', 'activity_lab'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapSession(d.id, d.data()));
  },

  /**
   * Get a specific session by ID
   */
  async getSessionById(id: string): Promise<ActivityLabSession | null> {
    const ref = doc(db, SESSIONS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data()?.source !== 'activity_lab') return null;
    return mapSession(snap.id, snap.data());
  },

  /**
   * Get clinic profile
   */
  async getClinicProfile(): Promise<ActivityLabClinic | null> {
    const ref = doc(db, CLINIC_COLLECTION, 'profile');
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data()?.source !== 'activity_lab') return null;
    const data = snap.data();
    return { 
      id: 'profile',
      clinic_name: data.clinic_name || data.name || '',
      professional_name: data.professional_name || data.physioName || '',
      registration_number: data.registration_number || data.crefito || '',
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
      source: 'activity_lab'
    } as ActivityLabClinic;
  }
};
