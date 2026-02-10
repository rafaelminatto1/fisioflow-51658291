import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import type { Appointment } from '@/types';
import { getAppointments, getAppointmentById, createAppointment, updateAppointment, cancelAppointment, type ApiAppointment } from '@/lib/api';

export interface UseAppointmentsOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
  patientId?: string;
}

// Map API appointment type to app Appointment type
function mapApiAppointment(apiAppointment: ApiAppointment): Appointment {
  // Parse date (format: YYYY-MM-DD)
  let appointmentDate: Date;
  try {
    const [year, month, day] = apiAppointment.date.split('-').map(Number);
    appointmentDate = new Date(year, month - 1, day);
  } catch {
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
    type: apiAppointment.type || apiAppointment.session_type || 'Fisioterapia',
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
    return 45; // default duration
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

function mapToApiStatus(status: Appointment['status']): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'agendado',
    'confirmed': 'confirmado',
    'in_progress': 'em_atendimento',
    'completed': 'concluido',
    'cancelled': 'cancelado',
    'no_show': 'no_show',
  };
  return statusMap[status] || 'agendado';
}

// Format Date to YYYY-MM-DD
function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Add minutes to HH:MM time string
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function useAppointments(options?: UseAppointmentsOptions) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const appointments = useQuery({
    queryKey: ['appointments', user?.id, options],
    queryFn: () => {
      if (!user?.id) return [];

      const dateFrom = options?.startDate ? formatDateForAPI(options.startDate) : undefined;
      const dateTo = options?.endDate ? formatDateForAPI(options.endDate) : undefined;

      return getAppointments(user.organizationId, {
        dateFrom,
        dateTo,
        therapistId: user.id,
        status: options?.status,
        patientId: options?.patientId,
        limit: options?.limit || 100,
      }).then(data => data.map(mapApiAppointment));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const dateStr = formatDateForAPI(new Date(data.date));
      const startTime = data.time || '09:00';
      const endTime = addMinutesToTime(startTime, data.duration);

      const apiAppointment = await createAppointment({
        patientId: data.patientId,
        date: dateStr,
        startTime,
        endTime,
        therapistId: user.id,
        type: data.type,
        notes: data.notes,
      });

      return mapApiAppointment(apiAppointment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Appointment> }) => {
      const updateData: Partial<ApiAppointment> = {};

      if (data.patientId) updateData.patientId = data.patientId;
      if (data.type) updateData.type = data.type;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status) updateData.status = mapToApiStatus(data.status);

      if (data.date || data.time || data.duration) {
        const date = data.date ? new Date(data.date) : new Date();
        updateData.date = formatDateForAPI(date);
        const time = data.time || '09:00';
        updateData.startTime = time;
        updateData.endTime = addMinutesToTime(time, data.duration || 45);
      }

      const apiAppointment = await updateAppointment(id, updateData);
      return mapApiAppointment(apiAppointment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    data: appointments.data || [],
    isLoading: appointments.isLoading,
    error: appointments.error,
    refetch: appointments.refetch,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    deleteAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Additional function to get a single appointment
export async function getAppointmentByIdHook(id: string): Promise<Appointment | null> {
  try {
    const apiAppointment = await getAppointmentById(id);
    return apiAppointment ? mapApiAppointment(apiAppointment) : null;
  } catch {
    return null;
  }
}
