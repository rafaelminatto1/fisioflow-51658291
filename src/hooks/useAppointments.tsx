import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types';

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch patients to get names and phone numbers
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, name, phone');

      if (patientsError) throw patientsError;

      const patientsMap = new Map(patientsData?.map(p => [p.id, p]) || []);

      const formattedAppointments: Appointment[] = appointmentsData?.map(appointment => {
        const patient = patientsMap.get(appointment.patient_id);
        return {
          id: appointment.id,
          patientId: appointment.patient_id,
          patientName: patient?.name || 'Paciente não encontrado',
          date: new Date(appointment.appointment_date),
          time: appointment.appointment_time,
          duration: appointment.duration,
          type: appointment.type as 'Consulta Inicial' | 'Fisioterapia' | 'Reavaliação' | 'Consulta de Retorno',
          status: appointment.status as 'Confirmado' | 'Pendente' | 'Reagendado' | 'Cancelado' | 'Realizado',
          notes: appointment.notes || '',
          phone: patient?.phone || '',
          createdAt: new Date(appointment.created_at),
          updatedAt: new Date(appointment.updated_at),
        };
      }) || [];

      setAppointments(formattedAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'patientName' | 'phone' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: appointmentData.patientId,
          appointment_date: appointmentData.date.toISOString().split('T')[0],
          appointment_time: appointmentData.time,
          duration: appointmentData.duration,
          type: appointmentData.type,
          status: appointmentData.status,
          notes: appointmentData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAppointments();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar agendamento');
      throw err;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const updateData: any = {};
      
      if (updates.patientId) updateData.patient_id = updates.patientId;
      if (updates.date) updateData.appointment_date = updates.date.toISOString().split('T')[0];
      if (updates.time) updateData.appointment_time = updates.time;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.type) updateData.type = updates.type;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar agendamento');
      throw err;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir agendamento');
      throw err;
    }
  };

  const getAppointment = (id: string) => {
    return appointments.find(appointment => appointment.id === id);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,
    refetch: fetchAppointments,
  };
}