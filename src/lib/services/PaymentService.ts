// PaymentService implementation for agenda system

export interface PatientSessionPackage {
  id: string;
  patient_id: string;
  payment_id: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientFinancialSummary {
  total_sessions_purchased: number;
  total_sessions_used: number;
  total_sessions_remaining: number;
  total_amount_paid: number;
  pending_payments_count: number;
  last_payment_date: string | null;
}

export interface PaymentStats {
  total_amount: number;
  session_payments: number;
  package_payments: number;
  cash_payments: number;
  card_payments: number;
  pix_payments: number;
  transfer_payments: number;
}

export class PaymentService {
  /**
   * Create a new payment record
   */
  static async createPayment(paymentData: any): Promise<any> {
    // Basic validation
    if (!paymentData.appointment_id || !paymentData.amount || !paymentData.payment_type || !paymentData.payment_method) {
      throw new Error('Missing required payment data');
    }

    if (paymentData.payment_type === 'package' && !paymentData.sessions_count) {
      throw new Error('Sessions count is required for package payments');
    }

    // Lazy load supabase to avoid import issues in tests
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;

    // Verify appointment exists
    const { data: appointment, error: appointmentError } = await db
      .from('appointments')
      .select('id, patient_id, therapist_id')
      .eq('id', paymentData.appointment_id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found');
    }

    // Create payment record
    const { data, error } = await db
      .from('payments')
      .insert([{
        ...paymentData,
        paid_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all payments for an appointment
   */
  static async getAppointmentPayments(appointmentId: string): Promise<any[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('paid_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch appointment payments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get patient session packages
   */
  static async getPatientSessionPackages(patientId: string): Promise<PatientSessionPackage[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    const { data, error } = await db
      .from('patient_sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch patient session packages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get active session packages (with remaining sessions)
   */
  static async getActiveSessionPackages(patientId: string): Promise<PatientSessionPackage[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    const { data, error } = await db
      .from('patient_sessions')
      .select('*')
      .eq('patient_id', patientId)
      .gt('remaining_sessions', 0)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active session packages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Use a session from patient's package
   */
  static async useSessionFromPackage(patientId: string): Promise<boolean> {
    const activePackages = await this.getActiveSessionPackages(patientId);
    
    if (activePackages.length === 0) {
      return false;
    }

    const packageToUse = activePackages[0];
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;

    const { error } = await db
      .from('patient_sessions')
      .update({ 
        used_sessions: packageToUse.used_sessions + 1 
      })
      .eq('id', packageToUse.id);

    if (error) {
      throw new Error(`Failed to use session from package: ${error.message}`);
    }

    return true;
  }

  /**
   * Return a session to patient's package
   */
  static async returnSessionToPackage(patientId: string): Promise<boolean> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    const { data, error } = await db
      .from('patient_sessions')
      .select('*')
      .eq('patient_id', patientId)
      .gt('used_sessions', 0)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to find package to return session: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return false;
    }

    const packageToUpdate = data[0];

    const { error: updateError } = await db
      .from('patient_sessions')
      .update({ 
        used_sessions: packageToUpdate.used_sessions - 1 
      })
      .eq('id', packageToUpdate.id);

    if (updateError) {
      throw new Error(`Failed to return session to package: ${updateError.message}`);
    }

    return true;
  }

  /**
   * Get patient financial summary
   */
  static async getPatientFinancialSummary(patientId: string): Promise<PatientFinancialSummary> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    const { data, error } = await db
      .rpc('get_patient_financial_summary', {
        p_patient_id: patientId
      });

    if (error) {
      throw new Error(`Failed to get patient financial summary: ${error.message}`);
    }

    return data[0] || {
      total_sessions_purchased: 0,
      total_sessions_used: 0,
      total_sessions_remaining: 0,
      total_amount_paid: 0,
      pending_payments_count: 0,
      last_payment_date: null
    };
  }

  /**
   * Mark appointment as paid
   */
  static async markAppointmentAsPaid(
    appointmentId: string,
    amount: number,
    paymentType: string,
    paymentMethod: string,
    sessionsCount?: number,
    notes?: string
  ): Promise<any> {
    const paymentData = {
      appointment_id: appointmentId,
      amount,
      payment_type: paymentType,
      payment_method: paymentMethod,
      sessions_count: sessionsCount,
      notes: notes || ''
    };

    return this.createPayment(paymentData);
  }

  /**
   * Calculate remaining sessions for a patient
   */
  static async calculateRemainingSessionsForPatient(patientId: string): Promise<number> {
    const activePackages = await this.getActiveSessionPackages(patientId);
    return activePackages.reduce((total, pkg) => total + pkg.remaining_sessions, 0);
  }

  /**
   * Get payment statistics for a date range
   */
  static async getPaymentStats(
    dateFrom: string, 
    dateTo: string,
    therapistId?: string
  ): Promise<PaymentStats> {
    const { supabase } = await import('@/integrations/supabase/client');
    const db = supabase as any;
    
    let query = db
      .from('payments')
      .select(`
        amount,
        payment_type,
        payment_method,
        appointment:appointments(therapist_id)
      `)
      .gte('paid_at', dateFrom)
      .lte('paid_at', dateTo);

    if (therapistId) {
      query = query.eq('appointment.therapist_id', therapistId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get payment statistics: ${error.message}`);
    }

    const stats: PaymentStats = {
      total_amount: 0,
      session_payments: 0,
      package_payments: 0,
      cash_payments: 0,
      card_payments: 0,
      pix_payments: 0,
      transfer_payments: 0
    };

    (data || []).forEach((payment: any) => {
      stats.total_amount += payment.amount;
      
      if (payment.payment_type === 'session') {
        stats.session_payments += payment.amount;
      } else {
        stats.package_payments += payment.amount;
      }

      switch (payment.payment_method) {
        case 'cash':
          stats.cash_payments += payment.amount;
          break;
        case 'card':
          stats.card_payments += payment.amount;
          break;
        case 'pix':
          stats.pix_payments += payment.amount;
          break;
        case 'transfer':
          stats.transfer_payments += payment.amount;
          break;
      }
    });

    return stats;
  }
}