import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Patient, Appointment, Exercise, ExerciseProgram, ProgramExercise, Evolution } from '@/types';

// Re-export types for convenience
export type { Patient, Appointment, Exercise, ExerciseProgram, ProgramExercise, Evolution };

// Local types not in shared types
export interface Professional {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseAssignment {
  id: string;
  patientId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  completed: boolean;
  progress: number;
  notes?: string;
}

// ============================================
// HELPERS
// ============================================

function convertTimestamp(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

// ============================================
// PROFESSIONAL DATA
// ============================================

export async function getProfessionalProfile(userId: string): Promise<Professional | null> {
  try {
    // Try professionals collection first
    const professionalsRef = collection(db, 'professionals');
    const q = query(professionalsRef, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || userId,
        name: data.name || data.displayName || 'Profissional',
        email: data.email || '',
        phone: data.phone,
        specialty: data.specialty,
        licenseNumber: data.licenseNumber,
        status: data.status || 'active',
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    }

    // Fallback to users collection
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userDoc.id,
        userId: userDoc.id,
        name: data.name || data.displayName || 'Profissional',
        email: data.email || '',
        phone: data.phone,
        specialty: data.specialty,
        licenseNumber: data.licenseNumber,
        status: 'active',
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching professional profile:', error);
    return null;
  }
}

// ============================================
// PATIENTS MANAGEMENT
// ============================================

export async function getPatients(
  professionalId?: string,
  options?: { status?: 'active' | 'inactive' | 'Em Tratamento'; limit?: number; organizationId?: string }
): Promise<Patient[]> {
  try {
    const patientsRef = collection(db, 'patients');
    let q;

    // Try multiple field name formats for backwards compatibility
    // The data may use professionalId (camelCase), professional_id (snake_case), or therapist_id
    // Also support filtering by organization_id as fallback
    if (professionalId) {
      // First try with professionalId (camelCase) - app's preferred format
      try {
        if (options?.status) {
          q = query(
            patientsRef,
            where('professionalId', '==', professionalId),
            where('status', '==', options.status),
            orderBy('name', 'asc'),
            limit(options.limit || 50)
          );
        } else {
          q = query(
            patientsRef,
            where('professionalId', '==', professionalId),
            orderBy('name', 'asc'),
            limit(options?.limit || 50)
          );
        }
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return mapPatients(snapshot);
        }
      } catch (e) {
        // Index may not exist, try next format
      }

      // Try with professional_id (snake_case)
      try {
        if (options?.status) {
          q = query(
            patientsRef,
            where('professional_id', '==', professionalId),
            where('status', '==', options.status),
            orderBy('name', 'asc'),
            limit(options.limit || 50)
          );
        } else {
          q = query(
            patientsRef,
            where('professional_id', '==', professionalId),
            orderBy('name', 'asc'),
            limit(options?.limit || 50)
          );
        }
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return mapPatients(snapshot);
        }
      } catch (e) {
        // Index may not exist, try next format
      }

      // Try with therapist_id (older format)
      try {
        if (options?.status) {
          q = query(
            patientsRef,
            where('therapist_id', '==', professionalId),
            where('status', '==', options.status),
            orderBy('name', 'asc'),
            limit(options.limit || 50)
          );
        } else {
          q = query(
            patientsRef,
            where('therapist_id', '==', professionalId),
            orderBy('name', 'asc'),
            limit(options?.limit || 50)
          );
        }
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return mapPatients(snapshot);
        }
      } catch (e) {
        // Index may not exist, try organization fallback
      }
    }

    // Fallback: Filter by organization_id if provided
    if (options?.organizationId) {
      try {
        if (options?.status) {
          q = query(
            patientsRef,
            where('organization_id', '==', options.organizationId),
            where('status', '==', options.status),
            orderBy('name', 'asc'),
            limit(options.limit || 50)
          );
        } else {
          q = query(
            patientsRef,
            where('organization_id', '==', options.organizationId),
            orderBy('name', 'asc'),
            limit(options?.limit || 50)
          );
        }
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return mapPatients(snapshot);
        }
      } catch (e) {
        console.log('Organization query failed, returning empty');
      }
    }

    // Final fallback: Get all patients with status filter
    if (options?.status) {
      q = query(
        patientsRef,
        where('status', '==', options.status),
        orderBy('name', 'asc'),
        limit(options.limit || 50)
      );
    } else {
      q = query(
        patientsRef,
        orderBy('name', 'asc'),
        limit(options?.limit || 50)
      );
    }

    const snapshot = await getDocs(q);
    return mapPatients(snapshot);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

function mapPatients(snapshot: any): Patient[] {
  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId || data.user_id || '',
      name: data.name || data.full_name || data.displayName || 'Paciente',
      email: data.email || '',
      phone: data.phone,
      birthDate: data.birthDate || data.birth_date,
      condition: data.condition || data.main_condition,
      diagnosis: data.diagnosis,
      notes: data.notes || data.medical_history,
      status: data.status || 'active',
      lastVisit: data.lastVisit ? convertTimestamp(data.lastVisit) : undefined,
      createdAt: convertTimestamp(data.createdAt || data.created_at),
      updatedAt: convertTimestamp(data.updatedAt || data.updated_at),
    };
  });
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  try {
    const docRef = doc(db, 'patients', patientId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId || '',
        name: data.name || data.displayName || 'Paciente',
        email: data.email || '',
        phone: data.phone,
        birthDate: data.birthDate,
        condition: data.condition,
        diagnosis: data.diagnosis,
        notes: data.notes,
        status: data.status || 'active',
        lastVisit: data.lastVisit ? convertTimestamp(data.lastVisit) : undefined,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching patient:', error);
    return null;
  }
}

export async function createPatient(
  professionalId: string,
  patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const patientsRef = collection(db, 'patients');
    const docRef = await addDoc(patientsRef, {
      ...patientData,
      professionalId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
}

export async function updatePatient(
  patientId: string,
  data: Partial<Patient>
): Promise<void> {
  try {
    const docRef = doc(db, 'patients', patientId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
}

export async function deletePatient(patientId: string): Promise<void> {
  try {
    const docRef = doc(db, 'patients', patientId);
    await updateDoc(docRef, {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
}

export function subscribeToPatients(
  professionalId: string,
  callback: (patients: Patient[]) => void
): () => void {
  const patientsRef = collection(db, 'patients');
  const q = query(
    patientsRef,
    where('professionalId', '==', professionalId),
    where('status', '==', 'active'),
    orderBy('name', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '',
        name: data.name || data.displayName || 'Paciente',
        email: data.email || '',
        phone: data.phone,
        birthDate: data.birthDate,
        condition: data.condition,
        diagnosis: data.diagnosis,
        notes: data.notes,
        status: data.status || 'active',
        lastVisit: data.lastVisit ? convertTimestamp(data.lastVisit) : undefined,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    });
    callback(patients);
  });
}

// ============================================
// APPOINTMENTS MANAGEMENT
// ============================================

export async function getAppointments(
  professionalId: string,
  options?: { startDate?: Date; endDate?: Date; status?: string; limit?: number; organizationId?: string }
): Promise<Appointment[]> {
  try {
    console.log('[getAppointments] Fetching for professionalId:', professionalId, 'options:', options);
    const appointmentsRef = collection(db, 'appointments');
    let q;

    // Helper to try query and return results, or null if error
    const tryQuery = async (queryFn: () => any, label: string) => {
      try {
        const snapshot = await getDocs(queryFn());
        console.log(`[tryQuery ${label}] Snapshot size:`, snapshot.size, 'empty:', snapshot.empty);
        if (!snapshot.empty) {
          const result = mapAppointments(snapshot);
          console.log(`[tryQuery ${label}] Returning ${result.length} appointments`);
          return result;
        }
      } catch (e: any) {
        // Query failed (likely missing index), log and return null
        console.log(`[tryQuery ${label}] Query failed:`, e.message);
      }
      return null;
    };

    // Try multiple field name formats for backwards compatibility
    if (options?.startDate && options?.endDate) {
      // Date range queries
      const results = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professionalId', '==', professionalId),
          where('date', '>=', options.startDate!),
          where('date', '<=', options.endDate!),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'dateRange-professionalId');
      if (results) return results;

      // Try with professional_id
      const results2 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professional_id', '==', professionalId),
          where('date', '>=', options.startDate!),
          where('date', '<=', options.endDate!),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'dateRange-professional_id');
      if (results2) return results2;

      // Try with therapist_id
      const results3 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('therapist_id', '==', professionalId),
          where('date', '>=', options.startDate!),
          where('date', '<=', options.endDate!),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'dateRange-therapist_id');
      if (results3) return results3;
    } else if (options?.status) {
      // Status filtered queries
      const results = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professionalId', '==', professionalId),
          where('status', '==', options.status),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'status-professionalId');
      if (results) return results;

      // Try with professional_id
      const results2 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professional_id', '==', professionalId),
          where('status', '==', options.status),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'status-professional_id');
      if (results2) return results2;

      // Try with therapist_id
      const results3 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('therapist_id', '==', professionalId),
          where('status', '==', options.status),
          orderBy('date', 'asc'),
          limit(options.limit || 50)
        )
      , 'status-therapist_id');
      if (results3) return results3;
    } else {
      // Default queries
      const results = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professionalId', '==', professionalId),
          orderBy('date', 'desc'),
          limit(options?.limit || 50)
        )
      , 'default-professionalId');
      if (results) return results;

      // Try with professional_id
      const results2 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('professional_id', '==', professionalId),
          orderBy('date', 'desc'),
          limit(options?.limit || 50)
        )
      , 'default-professional_id');
      if (results2) return results2;

      // Try with therapist_id
      const results3 = await tryQuery(() =>
        query(
          appointmentsRef,
          where('therapist_id', '==', professionalId),
          orderBy('date', 'desc'),
          limit(options?.limit || 50)
        )
      , 'default-therapist_id');
      if (results3) return results3;
    }

    // Fallback: try organization_id if provided
    if (options?.organizationId) {
      console.log('[getAppointments] Trying organization fallback:', options.organizationId);
      const results = await tryQuery(() =>
        query(
          appointmentsRef,
          where('organization_id', '==', options.organizationId),
          orderBy('date', 'desc'),
          limit(options?.limit || 50)
        )
      , 'org-fallback');
      if (results) return results;
    }

    console.log('[getAppointments] No appointments found, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

function mapAppointments(snapshot: any): Appointment[] {
  console.log('[mapAppointments] Mapping', snapshot.size, 'appointments');
  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      patientId: data.patientId || data.patient_id,
      patientName: data.patientName || data.patient_name,
      professionalId: data.professionalId || data.professional_id || data.therapist_id,
      type: data.type || 'Fisioterapia',
      date: convertTimestamp(data.date),
      duration: data.duration || 45,
      status: data.status || 'scheduled',
      notes: data.notes,
      createdAt: convertTimestamp(data.createdAt || data.created_at),
      updatedAt: convertTimestamp(data.updatedAt || data.updated_at),
    };
  });
}

export async function createAppointment(
  appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, {
      ...appointmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Appointment>
): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
}

export function subscribeToAppointments(
  professionalId: string,
  callback: (appointments: Appointment[]) => void
): () => void {
  const appointmentsRef = collection(db, 'appointments');
  const q = query(
    appointmentsRef,
    where('professionalId', '==', professionalId),
    orderBy('date', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        patientName: data.patientName,
        professionalId: data.professionalId,
        type: data.type || 'Fisioterapia',
        date: convertTimestamp(data.date),
        duration: data.duration || 45,
        status: data.status || 'scheduled',
        notes: data.notes,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    });
    callback(appointments);
  });
}

// ============================================
// EXERCISES LIBRARY
// ============================================

export async function getExercisesLibrary(options?: {
  category?: string;
  difficulty?: string;
  limit?: number;
}): Promise<Exercise[]> {
  try {
    const exercisesRef = collection(db, 'exercises');
    let q;

    if (options?.category) {
      q = query(
        exercisesRef,
        where('category', '==', options.category),
        limit(options.limit || 50)
      );
    } else if (options?.difficulty) {
      q = query(
        exercisesRef,
        where('difficulty', '==', options.difficulty),
        limit(options.limit || 50)
      );
    } else {
      q = query(exercisesRef, limit(options?.limit || 50));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        category: data.category,
        difficulty: data.difficulty,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl,
        sets: data.sets,
        reps: data.reps,
        duration: data.duration,
        createdBy: data.createdBy,
      };
    });
  } catch (error) {
    console.error('Error fetching exercises library:', error);
    return [];
  }
}

export async function createExercise(
  professionalId: string,
  exerciseData: Omit<Exercise, 'id' | 'createdBy'>
): Promise<string> {
  try {
    const exercisesRef = collection(db, 'exercises');
    const docRef = await addDoc(exercisesRef, {
      ...exerciseData,
      createdBy: professionalId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating exercise:', error);
    throw error;
  }
}

// ============================================
// PATIENT EXERCISE ASSIGNMENTS
// ============================================

export async function assignExerciseToPatient(
  professionalId: string,
  patientId: string,
  assignment: Omit<ExerciseAssignment, 'id'>
): Promise<string> {
  try {
    const assignmentsRef = collection(db, 'patient_exercises');
    const docRef = await addDoc(assignmentsRef, {
      ...assignment,
      patientId,
      assignedBy: professionalId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error assigning exercise:', error);
    throw error;
  }
}

export async function getPatientExerciseAssignments(
  patientId: string
): Promise<ExerciseAssignment[]> {
  try {
    const assignmentsRef = collection(db, 'patient_exercises');
    const q = query(
      assignmentsRef,
      where('patientId', '==', patientId),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        exerciseId: data.exerciseId,
        exercise: data.exercise,
        sets: data.sets || 3,
        reps: data.reps || 10,
        frequency: data.frequency || 'daily',
        startDate: convertTimestamp(data.startDate),
        endDate: data.endDate ? convertTimestamp(data.endDate) : undefined,
        completed: data.completed || false,
        progress: data.progress || 0,
        notes: data.notes,
      };
    });
  } catch (error) {
    console.error('Error fetching exercise assignments:', error);
    return [];
  }
}

// ============================================
// EVOLUTIONS / SESSION NOTES
// ============================================

export async function createEvolution(
  professionalId: string,
  evolutionData: Omit<Evolution, 'id' | 'professionalId' | 'createdAt'>
): Promise<string> {
  try {
    const evolutionsRef = collection(db, 'evolutions');
    const docRef = await addDoc(evolutionsRef, {
      ...evolutionData,
      professionalId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating evolution:', error);
    throw error;
  }
}

export async function getPatientEvolutions(
  patientId: string,
  limitCount: number = 20
): Promise<Evolution[]> {
  try {
    const evolutionsRef = collection(db, 'evolutions');
    const q = query(
      evolutionsRef,
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        professionalId: data.therapistId || data.professionalId,
        notes: data.notes,
        painLevel: data.painLevel,
        exercises: data.exercises,
        attachments: data.attachments,
        createdAt: convertTimestamp(data.createdAt),
      };
    });
  } catch (error) {
    console.error('Error fetching evolutions:', error);
    return [];
  }
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

export async function getProfessionalStats(professionalId: string): Promise<{
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointmentsThisMonth: number;
}> {
  try {
    // Get patients count
    const patientsRef = collection(db, 'patients');
    const patientsQ = query(
      patientsRef,
      where('professionalId', '==', professionalId)
    );
    const patientsSnap = await getDocs(patientsQ);

    const activePatientsQ = query(
      patientsRef,
      where('professionalId', '==', professionalId),
      where('status', '==', 'active')
    );
    const activePatientsSnap = await getDocs(activePatientsQ);

    // Get appointments
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsQ = query(
      appointmentsRef,
      where('professionalId', '==', professionalId)
    );
    const appointmentsSnap = await getDocs(appointmentsQ);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const upcomingQ = query(
      appointmentsRef,
      where('professionalId', '==', professionalId),
      where('date', '>=', now),
      where('status', '==', 'scheduled')
    );
    const upcomingSnap = await getDocs(upcomingQ);

    const completedQ = query(
      appointmentsRef,
      where('professionalId', '==', professionalId),
      where('date', '>=', startOfMonth),
      where('status', '==', 'completed')
    );
    const completedSnap = await getDocs(completedQ);

    return {
      totalPatients: patientsSnap.size,
      activePatients: activePatientsSnap.size,
      totalAppointments: appointmentsSnap.size,
      upcomingAppointments: upcomingSnap.size,
      completedAppointmentsThisMonth: completedSnap.size,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalPatients: 0,
      activePatients: 0,
      totalAppointments: 0,
      upcomingAppointments: 0,
      completedAppointmentsThisMonth: 0,
    };
  }
}

export async function updateProfessionalProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    specialty?: string;
    crefito?: string;
    phone?: string;
    clinicName?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    avatarUrl?: string;
  }
): Promise<Professional | null> {
  try {
    // Try professionals collection first
    const professionalsRef = collection(db, 'professionals');
    const q = query(professionalsRef, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);

    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    // Map crefito to licenseNumber for consistency
    if (data.crefito) {
      updateData.licenseNumber = data.crefito;
    }

    if (!snapshot.empty) {
      // Update in professionals collection
      const docRef = doc(db, 'professionals', snapshot.docs[0].id);
      await updateDoc(docRef, updateData);

      // Return updated data
      return {
        id: snapshot.docs[0].id,
        userId,
        name: data.name || snapshot.docs[0].data().name || 'Profissional',
        email: data.email || snapshot.docs[0].data().email || '',
        specialty: data.specialty,
        licenseNumber: data.crefito,
        phone: data.phone,
        status: 'active',
        createdAt: snapshot.docs[0].data().createdAt
          ? convertTimestamp(snapshot.docs[0].data().createdAt)
          : new Date(),
        updatedAt: new Date(),
      };
    }

    // Fallback: update in users collection
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      await updateDoc(userDocRef, updateData);
      const updatedData = userDoc.data();
      return {
        id: userDoc.id,
        userId,
        name: data.name || updatedData.name || 'Profissional',
        email: data.email || updatedData.email || '',
        specialty: data.specialty,
        licenseNumber: data.crefito,
        phone: data.phone,
        status: 'active',
        createdAt: updatedData.createdAt
          ? convertTimestamp(updatedData.createdAt)
          : new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error updating professional profile:', error);
    throw error;
  }
}
