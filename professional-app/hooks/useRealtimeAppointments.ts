import { useEffect, useRef } from 'react';
import { getAppointments as apiGetAppointments, type ApiAppointment } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAppointmentsStore } from '@/store/appointments';
import type { Appointment } from '@/types';

// Map API appointment type to app Appointment type
function mapApiAppointment(apiAppointment: ApiAppointment): Appointment {
  const dateStr = apiAppointment.date;
  let appointmentDate: Date;

  if (typeof dateStr === 'string') {
    appointmentDate = new Date(dateStr);
  } else {
    appointmentDate = new Date();
  }

  return {
    id: apiAppointment.id,
    patientId: apiAppointment.patientId,
    patientName: apiAppointment.patient_name || '',
    professionalId: apiAppointment.therapistId || '',
    clinicId: undefined,
    date: appointmentDate,
    time: apiAppointment.startTime,
    duration: parseDuration(apiAppointment.startTime, apiAppointment.endTime),
    type: apiAppointment.type || 'Fisioterapia',
    status: mapAppointmentStatus(apiAppointment.status),
    notes: apiAppointment.notes,
    createdAt: apiAppointment.created_at || appointmentDate,
    updatedAt: apiAppointment.updated_at || appointmentDate,
  };
}

function parseDuration(startTime: string, endTime: string): number {
  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  } catch {
    return 45;
  }
}

function mapAppointmentStatus(status: string): Appointment['status'] {
  const statusMap: Record<string, Appointment['status']> = {
    'scheduled': 'scheduled',
    'agendado': 'scheduled',
    'confirmed': 'confirmed',
    'confirmado': 'confirmed',
    'in_progress': 'in_progress',
    'em_atendimento': 'in_progress',
    'completed': 'completed',
    'concluido': 'completed',
    'cancelled': 'cancelled',
    'cancelado': 'cancelled',
    'no_show': 'no_show',
  };
  return statusMap[status] || 'scheduled';
}

/**
 * Hook para sincronização de agendamentos via polling
 * Como a API V2 não suporta subscriptions em tempo real,
 * fazemos polling a cada 30 segundos para atualizar os dados
 */
export function useRealtimeAppointments() {
  const { user } = useAuthStore();
  const setAppointments = useAppointmentsStore((state) => state.setAppointments);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchAppointments = async () => {
      try {
        const apiAppointments = await apiGetAppointments(user.organizationId, {
          therapistId: user.id,
          limit: 100,
        });
        const appointments = apiAppointments.map(mapApiAppointment);
        setAppointments(appointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    fetchAppointments();

    // Set up polling every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchAppointments();
    }, 30000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, setAppointments]);
}
