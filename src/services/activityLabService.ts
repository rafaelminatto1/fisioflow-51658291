import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';
import { patientsApi } from '@/integrations/firebase/functions';
import type { 
  ActivityLabPatient, 
  ActivityLabSession, 
  ActivityLabClinic 
} from '@/types/activityLab';

const PATIENTS_COLLECTION = 'patients';
const SESSIONS_COLLECTION = 'sessions';
const CLINIC_COLLECTION = 'clinic';

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const sortPatientsByName = (patients: ActivityLabPatient[]) =>
  [...patients].sort((a, b) => {
    const aName = (a.full_name || a.name || '').toLowerCase();
    const bName = (b.full_name || b.name || '').toLowerCase();
    return aName.localeCompare(bName, 'pt-BR');
  });

const filterPatientsByTerm = (patients: ActivityLabPatient[], term: string) => {
  const normalizedTerm = normalizeSearch(term);
  const numericTerm = term.replace(/\D/g, '');

  return patients.filter((patient) => {
    const patientName = normalizeSearch(patient.full_name || patient.name || '');
    const patientCpf = (patient.cpf || '').replace(/\D/g, '');

    return (
      patientName.includes(normalizedTerm) ||
      (numericTerm ? patientCpf.includes(numericTerm) : false)
    );
  });
};

const loadPatientsFromFirestore = async (): Promise<ActivityLabPatient[]> => {
  const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
  return snapshot.docs
    .map((docSnap) => mapPatient(docSnap.id, docSnap.data()))
    .filter((patient) => patient.is_active !== false && patient.status !== 'inactive');
};

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
  async getPatients(searchTerm?: string): Promise<ActivityLabPatient[]> {
    const term = searchTerm?.trim();

    try {
      // Use API V2 to keep patient search available for all allowed roles
      // (Firestore direct reads are restricted for some roles, e.g. recepcionista).
      const apiResponse = await patientsApi.list({
        status: 'active',
        search: term || undefined,
        limit: 200,
        offset: 0,
      });

      const rows = Array.isArray(apiResponse.data) ? apiResponse.data : [];
      const mapped = rows
        .map((row) => mapPatient(String(row.id || ''), row))
        .filter((patient) => !!patient.id);

      if (!term || mapped.length > 0) {
        return sortPatientsByName(mapped);
      }

      // Fallback for accent-insensitive typing: if backend search returns no rows,
      // load a larger active list and filter locally with normalized text.
      const fallbackResponse = await patientsApi.list({
        status: 'active',
        limit: 2000,
        offset: 0,
      });

      const fallbackRows = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
      const fallbackMapped = fallbackRows
        .map((row) => mapPatient(String(row.id || ''), row))
        .filter((patient) => !!patient.id);

      return sortPatientsByName(filterPatientsByTerm(fallbackMapped, term));
    } catch {
      // Local dev fallback (e.g., CORS on Cloud Functions) to keep autocomplete usable.
      const firestorePatients = await loadPatientsFromFirestore();
      if (!term) return sortPatientsByName(firestorePatients);
      return sortPatientsByName(filterPatientsByTerm(firestorePatients, term));
    }
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
