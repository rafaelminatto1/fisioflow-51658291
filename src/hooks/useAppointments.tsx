import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppointmentBase, AppointmentFormData, AppointmentFilters, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { checkAppointmentConflict } from '@/utils/appointmentValidation';
import { logger } from '@/lib/errors/logger';

interface UseAppointmentsReturn {
  appointments: AppointmentBase[];
  loading: boolean;
  initialLoad: boolean;
  error: string | null;
  
  // CRUD Operations
  createAppointment: (data: AppointmentFormData) => Promise<AppointmentBase | null>;
  updateAppointment: (id: string, data: Partial<AppointmentFormData>) => Promise<AppointmentBase | null>;
  deleteAppointment: (id: string) => Promise<boolean>;
  confirmAppointment: (id: string) => Promise<boolean>;
  cancelAppointment: (id: string, reason?: string) => Promise<boolean>;
  
  // Queries
  getAppointmentsByDateRange: (startDate: Date, endDate: Date) => AppointmentBase[];
  getAppointmentsByPatient: (patientId: string) => AppointmentBase[];
  getAppointmentsByTherapist: (therapistId: string) => AppointmentBase[];
  searchAppointments: (query: string) => AppointmentBase[];
  
  // Conflict Detection
  checkConflict: (date: Date, time: string, duration: number, excludeId?: string) => { hasConflict: boolean; conflictingAppointment?: AppointmentBase };
  getAvailableSlots: (date: Date, duration: number) => string[];
  
  // Filters
  filteredAppointments: AppointmentBase[];
  setFilters: (filters: AppointmentFilters) => void;
  clearFilters: () => void;
  
  // Stats
  getAppointmentStats: () => {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    today: number;
  };
  
  // Utilities
  refreshAppointments: () => Promise<void>;
}

export const useAppointments = (): UseAppointmentsReturn => {
  const [appointments, setAppointments] = useState<AppointmentBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filters, setFiltersState] = useState<AppointmentFilters>({});
  const { toast } = useToast();

  // Standard business hours for slot generation
  const businessHours = {
    start: '08:00',
    end: '18:00',
    slotDuration: 30 // minutes
  };

  // Fetch appointments from Supabase
  const fetchAppointments = useCallback(async () => {
    const timer = logger.startTimer('fetchAppointments');
    
    try {
      setLoading(true);
      setError(null);
      
      logger.info('Iniciando busca de agendamentos', {}, 'useAppointments');
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(
            id,
            name,
            phone,
            email
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (fetchError) {
        logger.error('Erro na consulta Supabase', fetchError, 'useAppointments');
        throw fetchError;
      }

      // Transform data to match AppointmentBase interface
      const transformedAppointments = data?.map(apt => {
        try {
          return {
            id: apt.id,
            patientId: apt.patient_id,
            patientName: apt.patients?.name || 'Nome não disponível',
            phone: apt.patients?.phone || '',
            date: new Date(apt.appointment_date),
            time: apt.appointment_time || '00:00',
            duration: apt.duration || 60,
            type: (apt.type as AppointmentType) || 'Consulta Inicial',
            status: (apt.status as AppointmentStatus) || 'Scheduled',
            notes: apt.notes || '',
            createdAt: new Date(apt.created_at),
            updatedAt: new Date(apt.updated_at)
          };
        } catch (transformError) {
          logger.error('Erro ao transformar agendamento', { apt, error: transformError }, 'useAppointments');
          return null;
        }
      }).filter(Boolean) || [];

      logger.info(`Agendamentos carregados com sucesso: ${transformedAppointments.length} registros`, { count: transformedAppointments.length }, 'useAppointments');
      setAppointments(transformedAppointments);
    } catch (err) {
      logger.error('Erro ao carregar agendamentos', err, 'useAppointments');
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
      timer();
    }
  }, [toast]);

  // Create new appointment
  const createAppointment = useCallback(async (data: AppointmentFormData): Promise<AppointmentBase | null> => {
    const timer = logger.startTimer('createAppointment');
    
    try {
      logger.info('Criando novo agendamento', { patientId: data.patientId, date: data.date }, 'useAppointments');

      // Check for conflicts
      const conflict = checkAppointmentConflict({
        date: data.date,
        time: data.time,
        duration: data.duration,
        appointments
      });

      if (conflict.hasConflict) {
        logger.warn('Conflito de horário detectado', { appointmentData: data }, 'useAppointments');
        toast({
          title: "Conflito de Horário",
          description: `Já existe um agendamento neste horário`,
          variant: "destructive"
        });
        return null;
      }

      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: data.patientId,
          appointment_date: data.date.toISOString().split('T')[0],
          appointment_time: data.time,
          duration: data.duration,
          type: data.type,
          status: data.status,
          notes: data.notes
        })
        .select(`
          *,
          patients!inner(
            id,
            name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Erro ao inserir agendamento no Supabase', error, 'useAppointments');
        throw error;
      }

      const appointment: AppointmentBase = {
        id: newAppointment.id,
        patientId: newAppointment.patient_id,
        patientName: newAppointment.patients.name,
        phone: newAppointment.patients.phone,
        date: new Date(newAppointment.appointment_date),
        time: newAppointment.appointment_time,
        duration: newAppointment.duration,
        type: newAppointment.type as AppointmentType,
        status: newAppointment.status as AppointmentStatus,
        notes: newAppointment.notes,
        createdAt: new Date(newAppointment.created_at),
        updatedAt: new Date(newAppointment.updated_at)
      };

      logger.info('Agendamento criado com sucesso', { appointmentId: appointment.id }, 'useAppointments');
      setAppointments(prev => [...prev, appointment]);
      
      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso"
      });

      return appointment;
    } catch (err) {
      logger.error('Erro ao criar agendamento', err, 'useAppointments');
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento",
        variant: "destructive"
      });
      return null;
    } finally {
      timer();
    }
  }, [appointments, toast]);

  // Update appointment
  const updateAppointment = useCallback(async (id: string, data: Partial<AppointmentFormData>): Promise<AppointmentBase | null> => {
    const timer = logger.startTimer('updateAppointment');
    
    try {
      logger.info('Atualizando agendamento', { appointmentId: id, updates: data }, 'useAppointments');

      // Check for conflicts if date/time is being changed
      if (data.date || data.time || data.duration) {
        const existing = appointments.find(apt => apt.id === id);
        if (existing) {
          const conflict = checkAppointmentConflict({
            date: data.date || existing.date,
            time: data.time || existing.time,
            duration: data.duration || existing.duration,
            excludeId: id,
            appointments
          });

          if (conflict.hasConflict) {
            toast({
              title: "Conflito de Horário",
              description: `Já existe um agendamento neste horário`,
              variant: "destructive"
            });
            return null;
          }
        }
      }

      const updateData: any = {};
      if (data.patientId) updateData.patient_id = data.patientId;
      if (data.date) updateData.appointment_date = data.date.toISOString().split('T')[0];
      if (data.time) updateData.appointment_time = data.time;
      if (data.duration) updateData.duration = data.duration;
      if (data.type) updateData.type = data.type;
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { data: updatedAppointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          patients!inner(
            id,
            name,
            phone,
            email
          )
        `)
        .single();

      if (error) {
        logger.error('Erro ao atualizar agendamento no Supabase', error, 'useAppointments');
        throw error;
      }

      const appointment: AppointmentBase = {
        id: updatedAppointment.id,
        patientId: updatedAppointment.patient_id,
        patientName: updatedAppointment.patients.name,
        phone: updatedAppointment.patients.phone,
        date: new Date(updatedAppointment.appointment_date),
        time: updatedAppointment.appointment_time,
        duration: updatedAppointment.duration,
        type: updatedAppointment.type as AppointmentType,
        status: updatedAppointment.status as AppointmentStatus,
        notes: updatedAppointment.notes,
        createdAt: new Date(updatedAppointment.created_at),
        updatedAt: new Date(updatedAppointment.updated_at)
      };

      logger.info('Agendamento atualizado com sucesso', { appointmentId: id }, 'useAppointments');
      setAppointments(prev => prev.map(apt => apt.id === id ? appointment : apt));
      
      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso"
      });

      return appointment;
    } catch (err) {
      logger.error('Erro ao atualizar agendamento', err, 'useAppointments');
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agendamento",
        variant: "destructive"
      });
      return null;
    } finally {
      timer();
    }
  }, [appointments, toast]);

  // Delete appointment
  const deleteAppointment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.filter(apt => apt.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Agendamento excluído com sucesso"
      });

      return true;
    } catch (err) {
      console.error('Error deleting appointment:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agendamento",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Confirm appointment
  const confirmAppointment = useCallback(async (id: string): Promise<boolean> => {
    const result = await updateAppointment(id, { status: 'Confirmed' });
    return result !== null;
  }, [updateAppointment]);

  // Cancel appointment
  const cancelAppointment = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    const result = await updateAppointment(id, { 
      status: 'Cancelled',
      notes: reason ? `Cancelado: ${reason}` : 'Cancelado'
    });
    return result !== null;
  }, [updateAppointment]);

  // Query functions
  const getAppointmentsByDateRange = useCallback((startDate: Date, endDate: Date): AppointmentBase[] => {
    return appointments.filter(apt => 
      apt.date >= startDate && apt.date <= endDate
    );
  }, [appointments]);

  const getAppointmentsByPatient = useCallback((patientId: string): AppointmentBase[] => {
    return appointments.filter(apt => apt.patientId === patientId);
  }, [appointments]);

  const getAppointmentsByTherapist = useCallback((therapistId: string): AppointmentBase[] => {
    return [];
  }, []);

  const searchAppointments = useCallback((query: string): AppointmentBase[] => {
    const lowerQuery = query.toLowerCase();
    return appointments.filter(apt => 
      apt.patientName.toLowerCase().includes(lowerQuery) ||
      apt.type.toLowerCase().includes(lowerQuery) ||
      apt.notes?.toLowerCase().includes(lowerQuery) ||
      apt.status.toLowerCase().includes(lowerQuery)
    );
  }, [appointments]);

  // Conflict detection
  const checkConflict = useCallback((date: Date, time: string, duration: number, excludeId?: string) => {
    return checkAppointmentConflict({
      date,
      time,
      duration,
      excludeId,
      appointments
    });
  }, [appointments]);

  // Get available time slots
  const getAvailableSlots = useCallback((date: Date, duration: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += businessHours.slotDuration) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeSlot = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      
      const conflict = checkAppointmentConflict({
        date,
        time: timeSlot,
        duration,
        appointments
      });
      
      if (!conflict.hasConflict) {
        slots.push(timeSlot);
      }
    }
    
    return slots;
  }, [appointments]);

  // Apply filters
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    if (filters.dateRange) {
      filtered = filtered.filter(apt => 
        apt.date >= filters.dateRange!.start && apt.date <= filters.dateRange!.end
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(apt => filters.status!.includes(apt.status));
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(apt => filters.type!.includes(apt.type));
    }


    if (filters.patientId && filters.patientId.length > 0) {
      filtered = filtered.filter(apt => filters.patientId!.includes(apt.patientId));
    }

    return filtered;
  }, [appointments, filters]);

  // Set filters
  const setFilters = useCallback((newFilters: AppointmentFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  // Get appointment statistics
  const getAppointmentStats = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: appointments.length,
      confirmed: appointments.filter(apt => apt.status === 'Confirmed').length,
      pending: appointments.filter(apt => apt.status === 'Scheduled').length,
      cancelled: appointments.filter(apt => apt.status === 'Cancelled').length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      }).length
    };
  }, [appointments]);

  // Refresh appointments
  const refreshAppointments = useCallback(async () => {
    await fetchAppointments();
  }, [fetchAppointments]);

  // Initial load
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    initialLoad,
    
    // CRUD Operations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    confirmAppointment,
    cancelAppointment,
    
    // Queries
    getAppointmentsByDateRange,
    getAppointmentsByPatient,
    getAppointmentsByTherapist,
    searchAppointments,
    
    // Conflict Detection
    checkConflict,
    getAvailableSlots,
    
    // Filters
    filteredAppointments,
    setFilters,
    clearFilters,
    
    // Stats
    getAppointmentStats,
    
    // Utilities
    refreshAppointments
  };
};

// Convenience wrappers expected by UI pieces
export function useCreateAppointment() {
  const { createAppointment } = useAppointments();
  return {
    mutateAsync: (data: AppointmentFormData) => createAppointment(data),
    isPending: false,
  };
}

export function useUpdateAppointment() {
  const { updateAppointment } = useAppointments();
  return {
    mutateAsync: ({ appointmentId, updates }: { appointmentId: string; updates: Partial<AppointmentFormData> }) =>
      updateAppointment(appointmentId, updates),
    isPending: false,
  };
}

export function useDeleteAppointment() {
  const { deleteAppointment } = useAppointments();
  return {
    mutateAsync: (appointmentId: string) => deleteAppointment(appointmentId),
    isPending: false,
  };
}

export function useUpdateAppointmentStatus() {
  const { updateAppointment } = useAppointments();
  return {
    mutateAsync: ({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) =>
      updateAppointment(appointmentId, { status }),
    isPending: false,
  };
}

export function useRescheduleAppointment() {
  const { updateAppointment } = useAppointments();
  return {
    mutateAsync: ({ appointmentId, date, time, duration }: { appointmentId: string; date?: Date; time?: string; duration?: number; }) =>
      updateAppointment(appointmentId, { date, time, duration }),
    isPending: false,
  };
}

export function useUpdatePaymentStatus() {
  // No payment_status column in appointments; simulate success
  return {
    mutateAsync: async (_: { appointmentId: string; paymentStatus: 'paid' | 'pending' | 'partial' }) => true,
    isPending: false,
  };
}

export function useAppointmentsFiltered(_filters: any) {
  const { appointments, loading, error } = useAppointments();
  return { data: appointments, isLoading: loading, error };
}