/**
 * Firestore Fallback
 * Direct Firestore access when Cloud Functions are not available
 */

import { collection, query, where, getDocs, limit as firestoreLimit, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { ApiPatient, ApiAppointment } from './api';

/**
 * List patients from Firestore
 * Simplified query to avoid index requirements
 */
export async function listPatientsFirestore(
  organizationId?: string,
  options?: { limit?: number; status?: string }
): Promise<ApiPatient[]> {
  try {
    const patientsRef = collection(db, 'patients');
    
    // Build query with only one filter to avoid index requirements
    let q = query(patientsRef);

    if (organizationId) {
      q = query(q, where('organization_id', '==', organizationId));
    }

    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit));
    }

    const snapshot = await getDocs(q);
    
    // Filter and sort in memory
    let results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.full_name,
        full_name: data.full_name || data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        birth_date: data.birth_date,
        gender: data.gender,
        main_condition: data.main_condition,
        observations: data.observations,
        status: data.status || 'active',
        progress: data.progress,
        incomplete_registration: data.incomplete_registration,
        is_active: data.is_active !== false,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as ApiPatient;
    });
    
    // Apply status filter in memory if needed
    if (options?.status) {
      results = results.filter(p => p.status === options.status);
    }
    
    // Sort by created_at descending (most recent first)
    results.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    
    return results;
  } catch (error) {
    console.error('[Firestore] Error listing patients:', error);
    return [];
  }
}

/**
 * List appointments from Firestore
 * Simplified query to avoid index requirements
 */
export async function listAppointmentsFirestore(
  organizationId?: string,
  therapistId?: string,
  options?: { limit?: number; dateFrom?: string; dateTo?: string }
): Promise<ApiAppointment[]> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    
    // Build query with only one filter to avoid index requirements
    // Priority: therapistId > organizationId
    let q = query(appointmentsRef);
    
    if (therapistId) {
      q = query(q, where('therapist_id', '==', therapistId));
    } else if (organizationId) {
      q = query(q, where('organization_id', '==', organizationId));
    }

    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit));
    }

    const snapshot = await getDocs(q);
    
    // Map appointments and fetch patient names if missing
    const results = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let patientName = data.patient_name || data.patientName;
      
      // If patient_name is missing or is 'grupo', fetch from patients collection
      if (!patientName || patientName === 'grupo') {
        const patientId = data.patient_id || data.patientId;
        if (patientId) {
          try {
            const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
            const patientRef = firestoreDoc(db, 'patients', patientId);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
              const patientData = patientSnap.data();
              patientName = patientData.name || patientData.full_name || 'Sem nome';
            }
          } catch (error) {
            console.warn('[Firestore] Could not fetch patient name for:', patientId);
          }
        }
      }
      
      return {
        id: doc.id,
        patient_id: data.patient_id,
        patient_name: patientName || 'Sem nome',
        therapist_id: data.therapist_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status || 'agendado',
        type: data.type || data.session_type,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as ApiAppointment;
    }));
    
    // Apply additional filters in memory
    let filteredResults = results;
    if (therapistId && organizationId) {
      filteredResults = results.filter(apt => apt.therapist_id === therapistId);
    }
    
    // Sort by date descending
    filteredResults.sort((a, b) => {
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateB.localeCompare(dateA);
    });
    
    return filteredResults;
  } catch (error) {
    console.error('[Firestore] Error listing appointments:', error);
    return [];
  }
}

/**
 * Get dashboard stats from Firestore
 */
export async function getDashboardStatsFirestore(organizationId?: string) {
  try {
    console.log('[Firestore] Getting dashboard stats for org:', organizationId);
    
    // Get active patients count
    const patientsRef = collection(db, 'patients');
    let patientsQuery = query(patientsRef);
    if (organizationId) {
      patientsQuery = query(patientsQuery, where('organization_id', '==', organizationId));
    }
    // We want active patients. Assuming is_active is true or undefined (field might be missing)
    // Firestore doesn't support "not equal false" easily without index.
    // So we fetch and filter or just count all for now as fallback.
    const patientsSnapshot = await getDocs(patientsQuery);
    const totalPatients = patientsSnapshot.size;
    const activePatients = patientsSnapshot.docs.filter(d => d.data().is_active !== false && (d.data().status === 'active' || !d.data().status)).length;

    // Get appointments counts
    const appointmentsRef = collection(db, 'appointments');
    let appointmentsQuery = query(appointmentsRef);
    if (organizationId) {
      appointmentsQuery = query(appointmentsQuery, where('organization_id', '==', organizationId));
    }
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let appointmentsToday = 0;
    let appointmentsThisWeek = 0;
    let appointmentsThisMonth = 0;

    appointmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      if (!date) return;

      if (date === today) {
        appointmentsToday++;
      }
      
      const aptDate = new Date(date);
      if (aptDate >= startOfWeek) {
        appointmentsThisWeek++;
      }
      if (aptDate >= startOfMonth) {
        appointmentsThisMonth++;
      }
    });

    return {
      totalPatients,
      activePatients,
      appointmentsToday,
      appointmentsThisWeek,
      appointmentsThisMonth,
    };
  } catch (error) {
    console.error('[Firestore] Error getting dashboard stats:', error);
    return {
      totalPatients: 0,
      activePatients: 0,
      appointmentsToday: 0,
      appointmentsThisWeek: 0,
      appointmentsThisMonth: 0,
    };
  }
}

/**
 * Get a single appointment by ID from Firestore
 */
export async function getAppointmentByIdFirestore(appointmentId: string): Promise<any | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const snapshot = await getDoc(appointmentRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      patient_id: data.patient_id,
      patient_name: data.patient_name,
      therapist_id: data.therapist_id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status || 'agendado',
      type: data.type || data.session_type,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('[Firestore] Error getting appointment by ID:', error);
    return null;
  }
}

/**
 * Get a single patient by ID from Firestore
 */
export async function getPatientByIdFirestore(patientId: string): Promise<any | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const patientRef = doc(db, 'patients', patientId);
    const snapshot = await getDoc(patientRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name || data.full_name,
      full_name: data.full_name || data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birth_date: data.birth_date,
      gender: data.gender,
      main_condition: data.main_condition,
      observations: data.observations,
      status: data.status || 'active',
      progress: data.progress,
      incomplete_registration: data.incomplete_registration,
      is_active: data.is_active !== false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('[Firestore] Error getting patient by ID:', error);
    return null;
  }
}

/**
 * List evolutions from Firestore
 * Simplified query to avoid index requirements
 */
export async function listEvolutionsFirestore(patientId: string): Promise<any[]> {
  try {
    const evolutionsRef = collection(db, 'evolutions');
    
    // Simple query with only patient_id filter to avoid index requirement
    const q = query(
      evolutionsRef,
      where('patient_id', '==', patientId),
      firestoreLimit(100)
    );

    const snapshot = await getDocs(q);
    
    // Sort in memory instead of using orderBy (which requires index)
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        patient_id: data.patient_id,
        therapist_id: data.therapist_id,
        appointment_id: data.appointment_id,
        date: data.date,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        pain_level: data.pain_level,
        attachments: data.attachments || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    });
    
    // Sort by date descending in memory
    results.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return String(dateB).localeCompare(String(dateA));
    });
    
    return results;
  } catch (error: any) {
    console.error('[Firestore] Error listing evolutions:', error);
    
    // Return empty array on permission errors
    if (error?.code === 'permission-denied') {
      console.warn('[Firestore] Permission denied for evolutions. User may not have access.');
      return [];
    }
    
    return [];
  }
}

/**
 * Get patient financial records from Firestore
 * Simplified query to avoid index requirements
 */
export async function listPatientFinancialRecordsFirestore(
  patientId: string,
  options?: { limit?: number }
): Promise<any[]> {
  try {
    const recordsRef = collection(db, 'financial_records');
    
    // Simple query with only patient_id filter to avoid index requirement
    const q = query(
      recordsRef,
      where('patient_id', '==', patientId),
      firestoreLimit(options?.limit || 100)
    );

    const snapshot = await getDocs(q);
    
    // Map and sort in memory
    const results = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        organization_id: data.organization_id,
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        session_date: data.session_date,
        session_value: data.session_value || 0,
        discount_value: data.discount_value || 0,
        discount_type: data.discount_type,
        partnership_id: data.partnership_id,
        final_value: data.final_value || 0,
        payment_method: data.payment_method,
        payment_status: data.payment_status || 'pending',
        paid_amount: data.paid_amount || 0,
        paid_date: data.paid_date,
        notes: data.notes,
        is_barter: data.is_barter || false,
        barter_notes: data.barter_notes,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    });
    
    // Sort by session_date descending in memory
    results.sort((a, b) => {
      const dateA = a.session_date || '';
      const dateB = b.session_date || '';
      return String(dateB).localeCompare(String(dateA));
    });
    
    return results;
  } catch (error: any) {
    console.error('[Firestore] Error listing financial records:', error);
    
    // Return empty array on permission errors
    if (error?.code === 'permission-denied') {
      console.warn('[Firestore] Permission denied for financial_records. User may not have access.');
      return [];
    }
    
    return [];
  }
}

/**
 * Get all financial records from Firestore
 * Simplified query to avoid index requirements
 */
export async function listAllFinancialRecordsFirestore(
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<any[]> {
  try {
    const recordsRef = collection(db, 'financial_records');
    
    // Simple query without complex filters to avoid index requirement
    // We'll fetch more than needed and filter in memory since we can't easily query by date range without index
    const q = query(
      recordsRef,
      firestoreLimit(200) // Fetch a reasonable amount to filter
    );

    const snapshot = await getDocs(q);
    
    // Map records
    const results = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Fetch patient name
      let patientName = 'Paciente';
      if (data.patient_id) {
        try {
          const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
          const patientRef = firestoreDoc(db, 'patients', data.patient_id);
          const patientSnap = await getDoc(patientRef);
          if (patientSnap.exists()) {
            const patientData = patientSnap.data();
            patientName = patientData.name || patientData.full_name || 'Paciente';
          }
        } catch (e) {
          // Ignore error fetching patient
        }
      }

      return {
        id: doc.id,
        organization_id: data.organization_id,
        patient_id: data.patient_id,
        patient_name: patientName,
        appointment_id: data.appointment_id,
        session_date: data.session_date,
        session_value: data.session_value || 0,
        discount_value: data.discount_value || 0,
        discount_type: data.discount_type,
        partnership_id: data.partnership_id,
        final_value: data.final_value || 0,
        payment_method: data.payment_method,
        payment_status: data.payment_status || 'pending',
        paid_amount: data.paid_amount || 0,
        paid_date: data.paid_date,
        notes: data.notes,
        is_barter: data.is_barter || false,
        barter_notes: data.barter_notes,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }));

    // Filter by date range in memory
    let filteredResults = results;
    
    if (options?.startDate) {
      filteredResults = filteredResults.filter(r => r.session_date >= options.startDate!);
    }
    
    if (options?.endDate) {
      filteredResults = filteredResults.filter(r => r.session_date <= options.endDate!);
    }
    
    // Sort by session_date descending
    filteredResults.sort((a, b) => {
      const dateA = a.session_date || '';
      const dateB = b.session_date || '';
      return String(dateB).localeCompare(String(dateA));
    });

    // Apply limit
    if (options?.limit) {
      filteredResults = filteredResults.slice(0, options.limit);
    }
    
    return filteredResults;
  } catch (error: any) {
    console.error('[Firestore] Error listing all financial records:', error);
    
    if (error?.code === 'permission-denied') {
      console.warn('[Firestore] Permission denied for financial_records.');
      return [];
    }
    
    return [];
  }
}

/**
 * Get patient financial summary from Firestore
 */
export async function getPatientFinancialSummaryFirestore(patientId: string): Promise<any> {
  try {
    const records = await listPatientFinancialRecordsFirestore(patientId);
    
    const summary = {
      total_sessions: records.length,
      paid_sessions: records.filter(r => r.payment_status === 'paid').length,
      pending_sessions: records.filter(r => r.payment_status === 'pending').length,
      total_value: records.reduce((sum, r) => sum + (r.final_value || 0), 0),
      total_paid: records.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
      total_pending: 0,
      average_session_value: 0,
    };
    
    summary.total_pending = summary.total_value - summary.total_paid;
    summary.average_session_value = summary.total_sessions > 0 
      ? summary.total_value / summary.total_sessions 
      : 0;
    
    return summary;
  } catch (error: any) {
    console.error('[Firestore] Error getting financial summary:', error);
    
    // Return empty summary on permission errors
    if (error?.code === 'permission-denied') {
      console.warn('[Firestore] Permission denied for financial summary. User may not have access.');
    }
    
    return {
      total_sessions: 0,
      paid_sessions: 0,
      pending_sessions: 0,
      total_value: 0,
      total_paid: 0,
      total_pending: 0,
      average_session_value: 0,
    };
  }
}
