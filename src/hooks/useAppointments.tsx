import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { errorLogger } from '@/lib/errors/logger';

export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: 'consultation' | 'treatment' | 'evaluation' | 'follow_up' | 'group_session';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  notes?: string;
  room?: string;
  recurring_pattern?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurring_end_date?: string;
  parent_appointment_id?: string;
  is_recurring: boolean;
  patient?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  therapist?: {
    id: string;
    full_name: string;
    role: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentData {
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: Appointment['type'];
  notes?: string;
  room?: string;
  recurring_pattern?: Appointment['recurring_pattern'];
  recurring_end_date?: string;
}

export interface UpdateAppointmentData {
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  type?: Appointment['type'];
  status?: Appointment['status'];
  notes?: string;
  room?: string;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  // Fetch appointments
  const fetchAppointments = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients!inner(
            id,
            full_name,
            email,
            phone
          ),
          therapist:profiles!appointments_therapist_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Filter by date range if provided
      if (startDate && endDate) {
        query = query
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);
      }

      // If user is therapist/student, filter by their appointments
      if (profile && ['fisioterapeuta', 'estagiario'].includes(profile.role)) {
        query = query.eq('therapist_id', profile.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setAppointments(data || []);
      errorLogger.logInfo('Appointments fetched successfully', {
        count: data?.length || 0,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all'
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar agendamentos';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useAppointments.fetchAppointments',
        startDate,
        endDate
      });
      toast({
        title: "Erro ao carregar agendamentos",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile, checkAppointmentConflict, createRecurringAppointments]);

  // Create appointment
  const createAppointment = useCallback(async (data: CreateAppointmentData) => {
    if (!profile) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setError(null);

      // Check for conflicts
      const conflictCheck = await checkAppointmentConflict(
        data.appointment_date,
        data.start_time,
        data.end_time,
        profile.id
      );

      if (conflictCheck.hasConflict) {
        throw new Error(`Conflito de horário detectado: ${conflictCheck.message}`);
      }

      const appointmentData = {
        ...data,
        therapist_id: profile.id,
        status: 'scheduled' as const,
        is_recurring: data.recurring_pattern !== 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newAppointment, error: createError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select(`
          *,
          patient:patients!inner(
            id,
            full_name,
            email,
            phone
          ),
          therapist:profiles!appointments_therapist_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .single();

      if (createError) {
        throw createError;
      }

      // Handle recurring appointments
      if (data.recurring_pattern !== 'none' && data.recurring_end_date) {
        await createRecurringAppointments(newAppointment, data.recurring_pattern, data.recurring_end_date);
      }

      setAppointments(prev => [...prev, newAppointment]);

      errorLogger.logInfo('Appointment created successfully', {
        appointmentId: newAppointment.id,
        patientId: data.patient_id,
        date: data.appointment_date,
        time: data.start_time
      });

      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      });

      return newAppointment;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar agendamento';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useAppointments.createAppointment',
        data
      });
      throw new Error(message);
    }
  }, [profile]);

  // Update appointment
  const updateAppointment = useCallback(async (id: string, data: UpdateAppointmentData) => {
    try {
      setError(null);

      // Check for conflicts if updating time/date
      if (profile && (data.appointment_date || data.start_time || data.end_time)) {
        const appointment = appointments.find(a => a.id === id);
        if (appointment) {
          const conflictCheck = await checkAppointmentConflict(
            data.appointment_date || appointment.appointment_date,
            data.start_time || appointment.start_time,
            data.end_time || appointment.end_time,
            profile.id,
            id
          );

          if (conflictCheck.hasConflict) {
            throw new Error(`Conflito de horário detectado: ${conflictCheck.message}`);
          }
        }
      }

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          patient:patients!inner(
            id,
            full_name,
            email,
            phone
          ),
          therapist:profiles!appointments_therapist_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setAppointments(prev => prev.map(apt => 
        apt.id === id ? updatedAppointment : apt
      ));

      errorLogger.logInfo('Appointment updated successfully', {
        appointmentId: id,
        changes: Object.keys(data)
      });

      toast({
        title: "Agendamento atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      return updatedAppointment;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar agendamento';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useAppointments.updateAppointment',
        appointmentId: id,
        data
      });
      throw new Error(message);
    }
  }, [appointments, profile, checkAppointmentConflict]);

  // Delete appointment
  const deleteAppointment = useCallback(async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setAppointments(prev => prev.filter(apt => apt.id !== id));

      errorLogger.logInfo('Appointment deleted successfully', {
        appointmentId: id
      });

      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso.",
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar agendamento';
      setError(message);
      errorLogger.logError(err instanceof Error ? err : new Error(message), {
        context: 'useAppointments.deleteAppointment',
        appointmentId: id
      });
      throw new Error(message);
    }
  }, []);

  // Check appointment conflicts
  const checkAppointmentConflict = useCallback(async (
    date: string, 
    startTime: string, 
    endTime: string, 
    therapistId: string, 
    excludeId?: string
  ) => {
    try {
      let query = supabase
        .from('appointments')
        .select('id, start_time, end_time, patient(full_name)')
        .eq('appointment_date', date)
        .eq('therapist_id', therapistId)
        .in('status', ['scheduled', 'confirmed', 'in_progress']);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data: conflictingAppointments } = await query;

      if (!conflictingAppointments || conflictingAppointments.length === 0) {
        return { hasConflict: false };
      }

      // Check time overlap
      for (const apt of conflictingAppointments) {
        const aptStart = apt.start_time;
        const aptEnd = apt.end_time;

        // Check if times overlap
        if (
          (startTime < aptEnd && endTime > aptStart) ||
          (aptStart < endTime && aptEnd > startTime)
        ) {
          return {
            hasConflict: true,
            message: `Conflito com agendamento das ${aptStart} às ${aptEnd}`,
            conflictingAppointment: apt
          };
        }
      }

      return { hasConflict: false };

    } catch (err) {
      errorLogger.logError(err instanceof Error ? err : new Error('Erro ao verificar conflitos'), {
        context: 'useAppointments.checkAppointmentConflict'
      });
      return { hasConflict: false }; // Allow creation if conflict check fails
    }
  }, []);

  // Create recurring appointments
  const createRecurringAppointments = useCallback(async (
    parentAppointment: Appointment,
    pattern: 'daily' | 'weekly' | 'monthly',
    endDate: string
  ) => {
    try {
      const recurringAppointments = [];
      const startDate = new Date(parentAppointment.appointment_date);
      const end = new Date(endDate);
      const currentDate = new Date(startDate);

      // Generate recurring dates
      while (currentDate <= end) {
        switch (pattern) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        }

        if (currentDate <= end) {
          recurringAppointments.push({
            ...parentAppointment,
            id: undefined,
            appointment_date: currentDate.toISOString().split('T')[0],
            parent_appointment_id: parentAppointment.id,
            is_recurring: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      if (recurringAppointments.length > 0) {
        const { error } = await supabase
          .from('appointments')
          .insert(recurringAppointments);

        if (error) {
          throw error;
        }

        errorLogger.logInfo('Recurring appointments created', {
          parentId: parentAppointment.id,
          count: recurringAppointments.length,
          pattern
        });
      }

    } catch (err) {
      errorLogger.logError(err instanceof Error ? err : new Error('Erro ao criar agendamentos recorrentes'), {
        context: 'useAppointments.createRecurringAppointments',
        parentId: parentAppointment.id
      });
      // Don't throw here, parent appointment was already created
    }
  }, []);

  // Get appointments by date
  const getAppointmentsByDate = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === dateString);
  }, [appointments]);

  // Get appointments by week
  const getAppointmentsByWeek = useCallback((weekStart: Date) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);

    const startString = start.toISOString().split('T')[0];
    const endString = end.toISOString().split('T')[0];

    return appointments.filter(apt => 
      apt.appointment_date >= startString && apt.appointment_date <= endString
    );
  }, [appointments]);

  // Subscribe to real-time changes
  useEffect(() => {
    fetchAppointments();

    const subscription = supabase
      .channel('appointments_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments' 
        }, 
        (_payload) => {
          // Refetch appointments on any change
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    checkAppointmentConflict,
    getAppointmentsByDate,
    getAppointmentsByWeek
  };
}