import type { 
  Patient,
  Appointment,
  PaymentStatus 
} from '@/types/agenda';

export interface PatientSearchResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  session_price: number;
  remaining_sessions: number;
  status: 'active' | 'inactive';
}

export interface PatientFinancialData {
  patient_id: string;
  session_price: number;
  package_sessions: number;
  remaining_sessions: number;
  total_sessions_purchased: number;
  total_sessions_used: number;
  total_amount_paid: number;
  pending_payments_count: number;
  last_payment_date: string | null;
  average_monthly_sessions: number;
}

export interface PatientAppointmentSummary {
  patient_id: string;
  total_appointments: number;
  completed_sessions: number;
  missed_sessions: number;
  cancelled_sessions: number;
  pending_sessions: number;
  next_appointment: Appointment | null;
  last_appointment: Appointment | null;
}

export interface CreatePatientData {
  name: string;
  phone: string;
  email: string;
  session_price: number;
  package_sessions?: number;
  important_notes?: string;
}

export interface UpdatePatientData {
  name?: string;
  phone?: string;
  email?: string;
  session_price?: number;
  package_sessions?: number;
  important_notes?: string;
  status?: 'active' | 'inactive';
}

// Lazy import supabase to handle test environment
const getSupabase = async () => {
  try {
    const module = await import('@/integrations/supabase/client');
    return module.supabase as any;
  } catch (error) {
    throw new Error('Database connection not available');
  }
};

export class PatientService {
  /**
   * Search patients with quick filters for agenda
   */
  static async searchPatients(
    query: string, 
    limit: number = 10,
    activeOnly: boolean = true
  ): Promise<PatientSearchResult[]> {
    const supabase = await getSupabase();
    
    let dbQuery = supabase
      .from('patients')
      .select('id, name, phone, email, session_price, remaining_sessions, status')
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (activeOnly) {
      dbQuery = dbQuery.eq('status', 'active');
    }

    dbQuery = dbQuery.order('name', { ascending: true });

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to search patients: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get patient by ID with complete information
   */
  static async getPatient(patientId: string): Promise<Patient | null> {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all active patients for agenda
   */
  static async getActivePatients(): Promise<PatientSearchResult[]> {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, phone, email, session_price, remaining_sessions, status')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active patients: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new patient
   */
  static async createPatient(patientData: CreatePatientData): Promise<Patient> {
    const supabase = await getSupabase();
    
    // Basic validation
    if (!patientData.name || !patientData.phone || !patientData.email) {
      throw new Error('Name, phone, and email are required');
    }

    if (patientData.session_price <= 0) {
      throw new Error('Session price must be greater than 0');
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([{
        ...patientData,
        package_sessions: patientData.package_sessions || 0,
        remaining_sessions: patientData.package_sessions || 0,
        important_notes: patientData.important_notes || '',
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    return data;
  }

  /**
   * Update patient information
   */
  static async updatePatient(patientId: string, updates: UpdatePatientData): Promise<Patient> {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return data;
  }

  /**
   * Get patient financial data for agenda
   */
  static async getPatientFinancialData(patientId: string): Promise<PatientFinancialData> {
    const supabase = await getSupabase();
    
    // Get basic patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, session_price, package_sessions, remaining_sessions')
      .eq('id', patientId)
      .single();

    if (patientError) {
      throw new Error(`Failed to fetch patient data: ${patientError.message}`);
    }

    // Get financial summary from PaymentService function
    const { data: financialSummary, error: summaryError } = await supabase
      .rpc('get_patient_financial_summary', {
        p_patient_id: patientId
      });

    if (summaryError) {
      throw new Error(`Failed to get financial summary: ${summaryError.message}`);
    }

    const summary = financialSummary[0] || {
      total_sessions_purchased: 0,
      total_sessions_used: 0,
      total_sessions_remaining: 0,
      total_amount_paid: 0,
      pending_payments_count: 0,
      last_payment_date: null
    };

    // Calculate average monthly sessions (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: recentAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'completed')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

    if (appointmentsError) {
      throw new Error(`Failed to calculate monthly average: ${appointmentsError.message}`);
    }

    const monthlyAverage = (recentAppointments?.length || 0) / 6;

    return {
      patient_id: patientId,
      session_price: patient.session_price,
      package_sessions: patient.package_sessions,
      remaining_sessions: patient.remaining_sessions,
      total_sessions_purchased: summary.total_sessions_purchased,
      total_sessions_used: summary.total_sessions_used,
      total_amount_paid: summary.total_amount_paid,
      pending_payments_count: summary.pending_payments_count,
      last_payment_date: summary.last_payment_date,
      average_monthly_sessions: Math.round(monthlyAverage * 10) / 10 // Round to 1 decimal
    };
  }

  /**
   * Get patient appointment summary
   */
  static async getPatientAppointmentSummary(patientId: string): Promise<PatientAppointmentSummary> {
    const supabase = await getSupabase();
    
    // Get all appointments for the patient
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch patient appointments: ${error.message}`);
    }

    const allAppointments = appointments || [];
    
    // Calculate statistics
    const completed = allAppointments.filter(apt => apt.status === 'completed').length;
    const missed = allAppointments.filter(apt => apt.status === 'missed').length;
    const cancelled = allAppointments.filter(apt => apt.status === 'cancelled').length;
    const pending = allAppointments.filter(apt => 
      apt.status === 'scheduled' && new Date(apt.date) >= new Date()
    ).length;

    // Find next and last appointments
    const today = new Date().toISOString().split('T')[0];
    const futureAppointments = allAppointments
      .filter(apt => apt.date >= today && apt.status === 'scheduled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const pastAppointments = allAppointments
      .filter(apt => apt.date < today || apt.status !== 'scheduled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      patient_id: patientId,
      total_appointments: allAppointments.length,
      completed_sessions: completed,
      missed_sessions: missed,
      cancelled_sessions: cancelled,
      pending_sessions: pending,
      next_appointment: futureAppointments[0] || null,
      last_appointment: pastAppointments[0] || null
    };
  }

  /**
   * Get patients with pending payments
   */
  static async getPatientsWithPendingPayments(): Promise<PatientSearchResult[]> {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        patient:patients(
          id,
          name,
          phone,
          email,
          session_price,
          remaining_sessions,
          status
        )
      `)
      .eq('payment_status', 'pending')
      .eq('patient.status', 'active');

    if (error) {
      throw new Error(`Failed to fetch patients with pending payments: ${error.message}`);
    }

    // Remove duplicates and format response
    const uniquePatients = new Map();
    (data || []).forEach(item => {
      if (item.patient && !uniquePatients.has(item.patient.id)) {
        uniquePatients.set(item.patient.id, item.patient);
      }
    });

    return Array.from(uniquePatients.values());
  }

  /**
   * Update patient session count (when using packages)
   */
  static async updatePatientSessions(
    patientId: string, 
    sessionsUsed: number
  ): Promise<Patient> {
    const supabase = await getSupabase();
    
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('remaining_sessions')
      .eq('id', patientId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch patient sessions: ${fetchError.message}`);
    }

    const newRemaining = Math.max(0, patient.remaining_sessions - sessionsUsed);

    const { data, error } = await supabase
      .from('patients')
      .update({ remaining_sessions: newRemaining })
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update patient sessions: ${error.message}`);
    }

    return data;
  }

  /**
   * Add sessions to patient package
   */
  static async addSessionsToPatient(
    patientId: string, 
    sessionsToAdd: number
  ): Promise<Patient> {
    const supabase = await getSupabase();
    
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('package_sessions, remaining_sessions')
      .eq('id', patientId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch patient sessions: ${fetchError.message}`);
    }

    const { data, error } = await supabase
      .from('patients')
      .update({ 
        package_sessions: patient.package_sessions + sessionsToAdd,
        remaining_sessions: patient.remaining_sessions + sessionsToAdd
      })
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add sessions to patient: ${error.message}`);
    }

    return data;
  }

  /**
   * Get patient statistics for dashboard
   */
  static async getPatientStats(): Promise<{
    total_active: number;
    total_inactive: number;
    with_pending_payments: number;
    with_remaining_sessions: number;
  }> {
    const supabase = await getSupabase();
    
    // Get total counts
    const { data: totalData, error: totalError } = await supabase
      .from('patients')
      .select('status, remaining_sessions')
      .in('status', ['active', 'inactive']);

    if (totalError) {
      throw new Error(`Failed to fetch patient statistics: ${totalError.message}`);
    }

    // Get pending payments count
    const { data: pendingData, error: pendingError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('payment_status', 'pending');

    if (pendingError) {
      throw new Error(`Failed to fetch pending payments: ${pendingError.message}`);
    }

    const uniquePendingPatients = new Set(
      (pendingData || []).map(item => item.patient_id)
    );

    const stats = (totalData || []).reduce((acc, patient) => {
      if (patient.status === 'active') {
        acc.total_active++;
        if (patient.remaining_sessions > 0) {
          acc.with_remaining_sessions++;
        }
      } else {
        acc.total_inactive++;
      }
      return acc;
    }, {
      total_active: 0,
      total_inactive: 0,
      with_pending_payments: uniquePendingPatients.size,
      with_remaining_sessions: 0
    });

    return stats;
  }

  /**
   * Deactivate patient (soft delete)
   */
  static async deactivatePatient(patientId: string): Promise<Patient> {
    return this.updatePatient(patientId, { status: 'inactive' });
  }

  /**
   * Reactivate patient
   */
  static async reactivatePatient(patientId: string): Promise<Patient> {
    return this.updatePatient(patientId, { status: 'active' });
  }

  /**
   * Get patients by therapist (based on recent appointments)
   */
  static async getPatientsByTherapist(
    therapistId: string,
    limit: number = 50
  ): Promise<PatientSearchResult[]> {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        patient:patients(
          id,
          name,
          phone,
          email,
          session_price,
          remaining_sessions,
          status
        )
      `)
      .eq('therapist_id', therapistId)
      .eq('patient.status', 'active')
      .order('date', { ascending: false })
      .limit(limit * 2); // Get more to account for duplicates

    if (error) {
      throw new Error(`Failed to fetch therapist patients: ${error.message}`);
    }

    // Remove duplicates and limit results
    const uniquePatients = new Map();
    (data || []).forEach(item => {
      if (item.patient && !uniquePatients.has(item.patient.id)) {
        uniquePatients.set(item.patient.id, item.patient);
      }
    });

    return Array.from(uniquePatients.values()).slice(0, limit);
  }
}