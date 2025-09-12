import { supabase } from '@/integrations/supabase/client';
import type { 
  Appointment, 
  CreateAppointmentData, 
  UpdateAppointmentData, 
  AgendaFilters,
  WeeklyCalendarData 
} from '@/types/agenda';
import { 
  createAppointmentSchema, 
  updateAppointmentSchema, 
  agendaFiltersSchema 
} from '@/lib/validations/agenda';
import { 
  getWeekStart, 
  getWeekEnd, 
  formatDate 
} from '@/utils/agendaUtils';

export class AppointmentService {
  /**
   * Get appointments for a specific week
   */
  static async getWeeklyAppointments(weekStart: Date): Promise<WeeklyCalendarData> {
    const weekEnd = getWeekEnd(weekStart);
    const startDate = formatDate(weekStart);
    const endDate = formatDate(weekEnd);

    const { data, error } = await supabase
      .from('therapist_dashboard')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch weekly appointments: ${error.message}`);
    }

    return {
      weekStart,
      weekEnd,
      appointments: data || [],
      timeSlots: this.generateTimeSlots()
    };
  }

  /**
   * Get appointments with filters
   */
  static async getAppointments(filters: AgendaFilters = {}): Promise<Appointment[]> {
    // Validate filters
    const validatedFilters = agendaFiltersSchema.parse(filters);

    let query = supabase
      .from('therapist_dashboard')
      .select('*');

    // Apply filters
    if (validatedFilters.therapist_id) {
      query = query.eq('therapist_id', validatedFilters.therapist_id);
    }

    if (validatedFilters.status && validatedFilters.status.length > 0) {
      query = query.in('status', validatedFilters.status);
    }

    if (validatedFilters.payment_status && validatedFilters.payment_status.length > 0) {
      query = query.in('payment_status', validatedFilters.payment_status);
    }

    if (validatedFilters.date_from) {
      query = query.gte('date', validatedFilters.date_from);
    }

    if (validatedFilters.date_to) {
      query = query.lte('date', validatedFilters.date_to);
    }

    // Default ordering
    query = query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single appointment by ID
   */
  static async getAppointment(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('therapist_dashboard')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch appointment: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    // Validate input data
    const validatedData = createAppointmentSchema.parse(appointmentData);

    // Check for conflicts before creating
    const hasConflict = await this.checkTimeConflict(
      validatedData.therapist_id,
      validatedData.date,
      validatedData.start_time,
      validatedData.end_time
    );

    if (hasConflict) {
      throw new Error('Time slot conflicts with existing appointment');
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing appointment
   */
  static async updateAppointment(id: string, updates: UpdateAppointmentData): Promise<Appointment> {
    // Validate input data
    const validatedUpdates = updateAppointmentSchema.parse(updates);

    // If updating time, check for conflicts
    if (validatedUpdates.date || validatedUpdates.start_time || validatedUpdates.end_time) {
      const currentAppointment = await this.getAppointment(id);
      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }

      const date = validatedUpdates.date || currentAppointment.date;
      const startTime = validatedUpdates.start_time || currentAppointment.start_time;
      const endTime = validatedUpdates.end_time || currentAppointment.end_time;

      const hasConflict = await this.checkTimeConflict(
        currentAppointment.therapist_id,
        date,
        startTime,
        endTime,
        id
      );

      if (hasConflict) {
        throw new Error('Updated time slot conflicts with existing appointment');
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(validatedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update appointment: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete an appointment
   */
  static async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }
  }

  /**
   * Check for time conflicts
   */
  static async checkTimeConflict(
    therapistId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_appointment_conflict', {
        p_therapist_id: therapistId,
        p_date: date,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_id: excludeId || null
      });

    if (error) {
      throw new Error(`Failed to check time conflict: ${error.message}`);
    }

    return data || false;
  }

  /**
   * Get available time slots for a therapist on a specific date
   */
  static async getAvailableTimeSlots(
    therapistId: string,
    date: string,
    durationMinutes: number = 60
  ): Promise<string[]> {
    const { data, error } = await supabase
      .rpc('get_available_time_slots', {
        p_therapist_id: therapistId,
        p_date: date,
        p_duration_minutes: durationMinutes
      });

    if (error) {
      throw new Error(`Failed to get available time slots: ${error.message}`);
    }

    return (data || []).map((slot: { time_slot: string }) => slot.time_slot);
  }

  /**
   * Get appointments for a specific patient
   */
  static async getPatientAppointments(
    patientId: string,
    filters: Partial<AgendaFilters> = {}
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        therapist:auth.users(*)
      `)
      .eq('patient_id', patientId);

    // Apply additional filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }

    query = query
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch patient appointments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get appointments for a specific therapist
   */
  static async getTherapistAppointments(
    therapistId: string,
    filters: Partial<AgendaFilters> = {}
  ): Promise<Appointment[]> {
    const appointmentFilters: AgendaFilters = {
      ...filters,
      therapist_id: therapistId
    };

    return this.getAppointments(appointmentFilters);
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(
    id: string,
    status: Appointment['status']
  ): Promise<Appointment> {
    return this.updateAppointment(id, { status });
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    id: string,
    paymentStatus: Appointment['payment_status']
  ): Promise<Appointment> {
    return this.updateAppointment(id, { payment_status: paymentStatus });
  }

  /**
   * Reschedule an appointment
   */
  static async rescheduleAppointment(
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<Appointment> {
    // First mark as rescheduled
    await this.updateAppointmentStatus(id, 'rescheduled');

    // Then update with new time
    return this.updateAppointment(id, {
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      status: 'scheduled'
    });
  }

  /**
   * Get appointment statistics for a date range
   */
  static async getAppointmentStats(dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('status, payment_status')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (error) {
      throw new Error(`Failed to fetch appointment stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      scheduled: 0,
      completed: 0,
      missed: 0,
      cancelled: 0,
      rescheduled: 0,
      paid: 0,
      pending: 0,
      partial: 0
    };

    data.forEach(appointment => {
      stats[appointment.status as keyof typeof stats]++;
      stats[appointment.payment_status as keyof typeof stats]++;
    });

    return stats;
  }

  /**
   * Generate time slots (helper method)
   */
  private static generateTimeSlots(): string[] {
    const slots: string[] = [];
    const startHour = 7;
    const endHour = 19;
    const slotDuration = 30;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    
    return slots;
  }

  /**
   * Subscribe to real-time appointment changes
   */
  static subscribeToAppointments(
    callback: (payload: any) => void,
    filters?: { therapist_id?: string; date?: string }
  ) {
    let channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: filters?.therapist_id ? `therapist_id=eq.${filters.therapist_id}` : undefined
        },
        callback
      );

    if (filters?.date) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `date=eq.${filters.date}`
        },
        callback
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}