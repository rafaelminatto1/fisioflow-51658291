import { useEffect, useState, useCallback } from 'react';
import { profApi } from '@/lib/api';
import { useAuth } from './useAuth';
import type { Appointment, AppointmentStatus } from '@/types';

export function useAppointments() {
  const { profile } = useAuth();
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // No Neon/REST, buscamos um range de datas ou todos para o terapeuta
      // O backend via Workers já filtra pelo organization_id/therapist_id do token
      const appointments = await profApi.getAppointments('', '');
      
      const mappedAppointments: Appointment[] = appointments.map((item: any) => ({
        id: item.id,
        patientId: item.patient_id || '',
        patientName: item.patient_name || 'Paciente',
        date: item.date || '',
        time: item.time || '',
        duration: item.duration || 60,
        type: item.type || 'Fisioterapia',
        status: item.status || 'agendado',
        notes: item.notes,
        phone: item.phone,
        therapistId: item.therapist_id,
        room: item.room,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setData(mappedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchData();
    
    // Simulação de "realtime" via polling (melhor que onSnapshot para serverless)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Create new appointment
  const create = useCallback(async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await profApi.createAppointment({
        patient_id: appointment.patientId,
        patient_name: appointment.patientName,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status || 'agendado',
        notes: appointment.notes,
        phone: appointment.phone,
        room: appointment.room,
      });
      
      await fetchData(); // Refresh local
      return result.id;
    } catch (err) {
      console.error('Error creating appointment:', err);
      throw err;
    }
  }, [fetchData]);

  // Update appointment
  const update = useCallback(async (id: string, updates: Partial<Appointment>) => {
    try {
      await profApi.updateAppointment(id, updates);
      await fetchData();
    } catch (err) {
      console.error('Error updating appointment:', err);
      throw err;
    }
  }, [fetchData]);

  // Update appointment status
  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    return update(id, { status });
  }, [update]);

  // Delete appointment
  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/prof/appointments/${id}`);
      await fetchData();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      throw err;
    }
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, updateStatus, remove };
}
